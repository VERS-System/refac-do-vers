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
  private paused = false;
  private pauseGeneration = 0;
  private pausing: Promise<void> | undefined;
  private resuming: Promise<void> | undefined;

  /** Reutiliza serviços existentes e captura falhas assíncronas de listeners sem abrir rede ou timers. */
  constructor(private readonly prisma: PrismaService, private readonly reception: MqttReceptionService,
    private readonly summaries: EnergySummaryService, private readonly transport: MqttService) {
    this.events.on('error', () => { this.logger.warn('mqtt_event_failed'); });
  }

  /** Recupera antes de consumir e agenda uma varredura única por minuto somente após início explícito. */
  async start(): Promise<void> {
    if (this.stopping) throw new Error('MQTT_PIPELINE_STOPPED');
    if (this.paused) throw new Error('MQTT_PIPELINE_PAUSED');
    if (this.started) throw new Error('MQTT_PIPELINE_ALREADY_STARTED');
    if (this.transport.status === 'disabled') return;
    this.started = true;
    try {
      await this.recover();
      if (this.stopping || this.paused) return;
      this.transport.start((packet, receivedAt) => this.handle(packet, receivedAt));
      this.scheduleRecovery();
    } catch { this.started = false; throw new Error('MQTT_PIPELINE_START_FAILED'); }
  }

  /** Rastreia trabalho em curso para shutdown esperar commit, sem confirmar falhas ao transporte. */
  handle(packet: IPublishPacket, receivedAt: Date): Promise<void> {
    if (this.stopping) return Promise.reject(new Error('MQTT_PIPELINE_STOPPED'));
    if (this.paused) return Promise.reject(new Error('MQTT_PIPELINE_PAUSED'));
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
    if (this.paused) return Promise.reject(new Error('MQTT_PIPELINE_PAUSED'));
    if (!this.recovery) this.recovery = this.runRecovery().finally(() => { this.recovery = undefined; });
    return this.recovery;
  }

  /** Pagina por identidade estável e conserva falhas para próxima janela sem bloquear itens posteriores. */
  private async runRecovery(): Promise<RecoveryReport> {
    const report: RecoveryReport = { handled: 0, failed: 0 };
    const cutoff = new Date();
    let last: string | undefined;
    while (!this.stopping && !this.paused) {
      const page: { id: string }[] = await this.prisma.mqttMessage.findMany({ where: { status: 'RECEIVED', createdAt: { lte: cutoff },
        ...(last ? { id: { gt: last } } : {}) }, select: { id: true }, orderBy: { id: 'asc' }, take: 100 });
      for (const row of page) {
        if (this.stopping || this.paused) break;
        try { await this.processOne(row.id); report.handled++; } catch { report.failed++; }
      }
      if (page.length < 100) break;
      last = page[page.length - 1].id;
    }
    last = undefined;
    while (!this.stopping && !this.paused) {
      const page: { id: string }[] = await this.prisma.test.findMany({ where: { status: { in: ['COMPLETED', 'FAILED', 'CANCELLED'] },
        startedAt: { not: null }, endedAt: { not: null }, samples: { some: {} }, createdAt: { lte: cutoff },
        ...(last ? { id: { gt: last } } : {}) }, select: { id: true }, orderBy: { id: 'asc' }, take: 100 });
      for (const row of page) {
        if (this.stopping || this.paused) break;
        try { await this.summaries.recomputeTest(row.id); } catch { report.failed++; }
      }
      if (page.length < 100) break;
      last = page[page.length - 1].id;
    }
    if (report.failed) this.logger.warn({ event: 'mqtt_recovery_failed', count: report.failed });
    return report;
  }

  /** Cancela entradas e timer imediatamente, aguardando somente os trabalhos já iniciados. */
  pause(): Promise<void> {
    this.paused = true; this.pauseGeneration++;
    clearInterval(this.timer); this.timer = undefined;
    const transport = this.transport.pause();
    this.pausing = Promise.allSettled([...this.active, ...(this.recovery ? [this.recovery] : []), transport]).then(() => {});
    return this.pausing;
  }

  /** Compartilha retomada em curso para recuperar pendências antes de reabrir MQTT e criar timer único. */
  resume(): Promise<void> {
    if (this.stopping) return Promise.reject(new Error('MQTT_PIPELINE_STOPPED'));
    if (this.resuming) return this.resuming;
    if (!this.paused) return Promise.resolve();
    this.resuming = this.runResume().finally(() => { this.resuming = undefined; });
    return this.resuming;
  }

  /** Preserva pausa nova durante drenagem/recuperação e deixa falhas retomáveis pelo coordenador. */
  private async runResume(): Promise<void> {
    const generation = this.pauseGeneration; await this.pausing;
    if (this.stopping) throw new Error('MQTT_PIPELINE_STOPPED');
    if (generation !== this.pauseGeneration) return;
    this.paused = false;
    if (this.transport.status === 'disabled') return;
    this.started = true;
    try {
      await this.recover();
      if (this.stopping || this.paused) return;
      await this.transport.resume((packet, receivedAt) => this.handle(packet, receivedAt));
      if (!this.stopping && !this.paused) this.scheduleRecovery();
    } catch {
      await this.pause(); throw new Error('MQTT_PIPELINE_RESUME_FAILED');
    }
  }

  /** Mantém apenas uma varredura periódica após ativação ou retomada concluída. */
  private scheduleRecovery(): void {
    clearInterval(this.timer);
    this.timer = setInterval(() => {
      void this.recover().catch(() => { this.logger.warn('mqtt_recovery_failed'); });
    }, 60000);
    this.timer.unref();
  }

  /** Impede novos trabalhos, fecha transporte e espera commits já iniciados sem manter timer vivo. */
  async onModuleDestroy(): Promise<void> {
    this.stopping = true;
    clearInterval(this.timer); this.timer = undefined;
    await this.transport.onModuleDestroy();
    await Promise.allSettled([...this.active, ...(this.recovery ? [this.recovery] : []), ...(this.resuming ? [this.resuming] : [])]);
  }
}
