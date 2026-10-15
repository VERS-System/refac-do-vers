// Converte processamento confirmado em avisos mínimos dos recursos presentes nas amostras normalizadas.
import 'reflect-metadata';
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { isUUID } from 'class-validator';
import { IsValidUtcDateTime } from '../../common/dto/pagination.dto';
import { PrismaService } from '../../prisma/prisma.service';
import { TELEMETRY_PROCESSED_EVENT, TelemetryProcessedEvent } from '../mqtt/mqtt-events';
import { MqttPipelineService } from '../mqtt/mqtt-pipeline.service';
import { DataUpdatedEvent } from './realtime-contract';
import { RealtimePubSubService } from './realtime-pubsub.service';

@Injectable()
export class RealtimeNotificationService implements OnModuleDestroy {
  private readonly logger = new Logger(RealtimeNotificationService.name);
  private readonly active = new Set<Promise<void>>();
  private started = false;
  private stopping = false;

  /** Reutiliza evento, persistência e transporte sem abrir rede ou registrar listener no constructor. */
  constructor(private readonly pipeline: MqttPipelineService, private readonly prisma: PrismaService,
    private readonly redis: RealtimePubSubService) {}

  /** Instala uma única ponte explícita; callbacks não alteram o resultado do processamento confirmado. */
  start(): void {
    if (this.stopping) throw new Error('REALTIME_NOTIFICATION_STOPPED');
    if (this.started) return;
    this.started = true; this.pipeline.events.on(TELEMETRY_PROCESSED_EVENT, this.onProcessed);
  }

  /** Rastreia avisos em curso e contém falhas sem propagar payload ou causa ao pipeline. */
  private readonly onProcessed = (event: unknown): void => {
    if (!this.started || this.stopping) return;
    const work = this.notify(event).catch(() => { this.logger.warn('realtime_notification_failed'); })
      .finally(() => { this.active.delete(work); });
    this.active.add(work);
  };

  /** Resolve recursos apenas pelo histórico normalizado e elimina duplicatas de instalação/teste. */
  private async notify(input: unknown): Promise<void> {
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error();
    const event = input as Partial<TelemetryProcessedEvent>;
    if (event.version !== 1 || event.type !== TELEMETRY_PROCESSED_EVENT ||
      typeof event.messageId !== 'string' || !isUUID(event.messageId, '4') || event.correlationId !== event.messageId ||
      !new IsValidUtcDateTime().validate(event.occurredAt)) throw new Error();
    const rows = await this.prisma.telemetrySample.groupBy({ by: ['installationId', 'testId'], where: { messageId: event.messageId } });
    const resources = new Map<string, DataUpdatedEvent['resource']>();
    for (const row of rows) {
      if (row.installationId) resources.set(`installation:${row.installationId}`, { type: 'installation', id: row.installationId });
      if (row.testId) resources.set(`test:${row.testId}`, { type: 'test', id: row.testId });
    }
    for (const resource of resources.values()) {
      if (this.stopping) return;
      try {
        const published = await this.redis.publish({ version: 1, type: 'data.updated', resource, occurredAt: new Date().toISOString() });
        if (!published) this.logger.warn('realtime_notification_failed');
      } catch { this.logger.warn('realtime_notification_failed'); }
    }
  }

  /** Remove a ponte e aguarda tarefas aceitas, sem publicar resultados de lookup após início do shutdown. */
  async onModuleDestroy(): Promise<void> {
    this.stopping = true; this.pipeline.events.off(TELEMETRY_PROCESSED_EVENT, this.onProcessed);
    await Promise.allSettled([...this.active]);
  }
}
