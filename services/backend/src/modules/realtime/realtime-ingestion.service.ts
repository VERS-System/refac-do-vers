// Coordena início explícito e pausa reversível da ingestão conforme disponibilidade do Redis.
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { MqttPipelineService } from '../mqtt/mqtt-pipeline.service';
import { RealtimePubSubService } from './realtime-pubsub.service';
import { RealtimeNotificationService } from './realtime-notification.service';

@Injectable()
export class RealtimeIngestionService implements OnModuleDestroy {
  private readonly logger = new Logger(RealtimeIngestionService.name);
  private started = false;
  private stopping = false;
  private begun = false;
  private dirty = false;
  private work: Promise<void> | undefined;
  private retry: ReturnType<typeof setTimeout> | undefined;
  private retryDelay = 1000;
  private closing: Promise<void> | undefined;

  /** Recebe serviços passivos sem conectar, observar eventos ou iniciar ingestão no constructor. */
  constructor(private readonly redis: RealtimePubSubService, private readonly pipeline: MqttPipelineService,
    private readonly notifications: RealtimeNotificationService) {}

  /** Instala coordenação antes de abrir Redis; pipeline só começa depois de disponibilidade confirmada. */
  start(): void {
    if (this.stopping) throw new Error('REALTIME_INGESTION_STOPPED');
    if (this.started) throw new Error('REALTIME_INGESTION_ALREADY_STARTED');
    this.started = true; this.redis.events.on('status.changed', this.onStatus);
    try { this.redis.start(); this.notifications.start(); this.onStatus(); }
    catch {
      this.redis.events.off('status.changed', this.onStatus); this.started = false;
      throw new Error('REALTIME_INGESTION_START_FAILED');
    }
  }

  /** Bloqueia entradas imediatamente na queda e deixa retomadas serializadas na tarefa de reconciliação. */
  private readonly onStatus = (): void => {
    if (this.stopping) return;
    clearTimeout(this.retry); this.retry = undefined;
    if (this.redis.status !== 'ok' && this.begun) {
      void this.pipeline.pause().catch(() => { this.logger.warn('realtime_ingestion_pause_failed'); });
    }
    this.request();
  };

  /** Agrupa oscilações em uma única tarefa e não perde mudança recebida durante await. */
  private request(): void {
    this.dirty = true;
    if (this.work || this.stopping) return;
    this.work = Promise.resolve().then(() => this.reconcile()).catch(() => {
      this.logger.warn('realtime_ingestion_transition_failed'); this.scheduleRetry();
    }).finally(() => {
      this.work = undefined;
      if (this.dirty && !this.stopping) this.request();
    });
  }

  /** Conclui pausa antes de retomar e recupera disponibilidade atual em vez de confiar em evento obsoleto. */
  private async reconcile(): Promise<void> {
    while (this.dirty && !this.stopping) {
      this.dirty = false;
      if (this.redis.status !== 'ok') {
        if (this.begun) await this.pipeline.pause();
        continue;
      }
      try {
        if (!this.begun) { this.begun = true; await this.pipeline.start(); }
        else await this.pipeline.resume();
        clearTimeout(this.retry); this.retry = undefined;
        this.retryDelay = 1000;
      } catch { await this.pipeline.pause(); throw new Error('REALTIME_INGESTION_TRANSITION_FAILED'); }
    }
  }

  /** Repete falha transitória apenas com Redis disponível, em backoff limitado e sem bloquear REST. */
  private scheduleRetry(): void {
    if (this.stopping || this.redis.status !== 'ok' || this.retry) return;
    const delay = this.retryDelay; this.retryDelay = Math.min(delay * 2, 30000);
    this.retry = setTimeout(() => { this.retry = undefined; this.request(); }, delay);
    this.retry.unref();
  }

  /** Remove observação e timers antes de aguardar ingestão; encerra dependências uma única vez. */
  onModuleDestroy(): Promise<void> {
    if (this.closing) return this.closing;
    this.stopping = true; this.redis.events.off('status.changed', this.onStatus);
    clearTimeout(this.retry); this.retry = undefined;
    this.closing = (async (): Promise<void> => {
      if (this.started) {
        await this.pipeline.onModuleDestroy(); await this.work;
        await this.notifications.onModuleDestroy(); this.redis.onModuleDestroy();
      }
    })();
    return this.closing;
  }
}
