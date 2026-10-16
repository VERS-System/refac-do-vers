// Liga recepção, processamento e recuperação explícita, emitindo eventos somente após commit.
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { EventEmitter } from 'node:events';
import { IPublishPacket } from 'mqtt';
import { PrismaService } from '../../prisma/prisma.service';
import { EnergySummaryService } from '../data/energy-summary.service';
import { MqttReceptionService } from './mqtt-reception.service';
import { MqttService } from './mqtt.service';
import { TELEMETRY_PROCESSED_EVENT, TelemetryProcessedEvent } from './mqtt-events';

type RecoveryReport = { handled: number; failed: number };

@Injectable()
export class MqttPipelineService implements OnModuleDestroy {
  readonly events = new EventEmitter({ captureRejections: true });
  private readonly logger = new Logger(MqttPipelineService.name);
  private readonly active = new Set<Promise<void>>();
  private recovery: Promise<RecoveryReport> | undefined;
  private timer: ReturnType<typeof setInterval> | undefined;
  private started = false;
  private stopping = false;

  /** Reutiliza serviços existentes e captura falhas assíncronas de listeners sem abrir rede ou timers. */
  constructor(private readonly prisma: PrismaService, private readonly reception: MqttReceptionService,
    private readonly summaries: EnergySummaryService, private readonly transport: MqttService) {
    this.events.on('error', () => { this.logger.warn('mqtt_event_failed'); });
  }

  /** Recupera antes de consumir e agenda uma varredura única por minuto somente após início explícito. */
  async start(): Promise<void> {
    if (this.stopping) throw new Error('MQTT_PIPELINE_STOPPED');
    if (this.started) throw new Error('MQTT_PIPELINE_ALREADY_STARTED');
    if (this.transport.status === 'disabled') return;
    this.started = true;
    try {
      await this.recover();
      if (this.stopping) return;
      this.transport.start((packet, receivedAt) => this.handle(packet, receivedAt));
      this.timer = setInterval(() => {
        void this.recover().catch(() => { this.logger.warn('mqtt_recovery_failed'); });
      }, 60000);
      this.timer.unref();
    } catch { this.started = false; throw new Error('MQTT_PIPELINE_START_FAILED'); }
  }

  /** Rastreia trabalho em curso para shutdown esperar commit, sem confirmar falhas ao transporte. */
  handle(packet: IPublishPacket, receivedAt: Date): Promise<void> {
    if (this.stopping) return Promise.reject(new Error('MQTT_PIPELINE_STOPPED'));
    const work = this.ingest(packet, receivedAt).finally(() => { this.active.delete(work); });
    this.active.add(work);
    return work;
  }

  /** Reconhece rejeição permanente e retoma também envelopes recebidos por retransmissão. */
  private async ingest(packet: IPublishPacket, receivedAt: Date): Promise<void> {
    try {
      const receipt = await this.reception.receive(packet, receivedAt);
      if (receipt.outcome !== 'REJECTED' && receipt.id) await this.processOne(receipt.id);
    } catch { throw new Error('MQTT_PIPELINE_FAILED'); }
  }

  /** Emite apenas após process resolver commit; reparo legado não cria novas amostras ou eventos. */
  private async processOne(id: string): Promise<void> {
    const result = await this.reception.process(id);
    if (result.outcome === 'ALREADY_PROCESSED') await this.summaries.recomputeMessage(id);
    if (result.outcome !== 'PROCESSED') return;
    const event: TelemetryProcessedEvent = { version: 1, type: TELEMETRY_PROCESSED_EVENT,
      messageId: id, correlationId: id, occurredAt: new Date().toISOString() };
    try { this.events.emit(TELEMETRY_PROCESSED_EVENT, event); }
    catch { this.logger.warn('mqtt_event_failed'); }
  }

  /** Compartilha varredura em curso, impedindo concorrência entre timer e recuperação explícita. */
  recover(): Promise<RecoveryReport> {
    if (this.stopping) return Promise.reject(new Error('MQTT_PIPELINE_STOPPED'));
    if (!this.recovery) this.recovery = this.runRecovery().finally(() => { this.recovery = undefined; });
    return this.recovery;
  }

  /** Pagina por identidade estável e conserva falhas para próxima janela sem bloquear itens posteriores. */
  private async runRecovery(): Promise<RecoveryReport> {
    const report: RecoveryReport = { handled: 0, failed: 0 };
    const cutoff = new Date();
    let last: string | undefined;
    while (!this.stopping) {
      const page: { id: string }[] = await this.prisma.mqttMessage.findMany({ where: { status: 'RECEIVED', createdAt: { lte: cutoff },
        ...(last ? { id: { gt: last } } : {}) }, select: { id: true }, orderBy: { id: 'asc' }, take: 100 });
      for (const row of page) {
        if (this.stopping) break;
        try { await this.processOne(row.id); report.handled++; } catch { report.failed++; }
      }
      if (page.length < 100) break;
      last = page[page.length - 1].id;
    }
    last = undefined;
    while (!this.stopping) {
      const page: { id: string }[] = await this.prisma.test.findMany({ where: { status: { in: ['COMPLETED', 'FAILED', 'CANCELLED'] },
        startedAt: { not: null }, endedAt: { not: null }, samples: { some: {} }, createdAt: { lte: cutoff },
        ...(last ? { id: { gt: last } } : {}) }, select: { id: true }, orderBy: { id: 'asc' }, take: 100 });
      for (const row of page) {
        if (this.stopping) break;
        try { await this.summaries.recomputeTest(row.id); } catch { report.failed++; }
      }
      if (page.length < 100) break;
      last = page[page.length - 1].id;
    }
    if (report.failed) this.logger.warn({ event: 'mqtt_recovery_failed', count: report.failed });
    return report;
  }

  /** Impede novos trabalhos, fecha transporte e espera commits já iniciados sem manter timer vivo. */
  async onModuleDestroy(): Promise<void> {
    this.stopping = true;
    clearInterval(this.timer); this.timer = undefined;
    await this.transport.onModuleDestroy();
    await Promise.allSettled([...this.active, ...(this.recovery ? [this.recovery] : [])]);
  }
}
