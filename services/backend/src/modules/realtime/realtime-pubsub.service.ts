// Transporta avisos de atualização entre processos por Redis, sem ativação automática ou fila durável.
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter } from 'node:events';
import Redis from 'ioredis';
import { DataUpdatedEvent, dataUpdatedChannel, parseDataUpdatedEvent } from './realtime-contract';

const PATTERN = 'vers:v1:realtime:*';
type RealtimeStatus = 'stopped' | 'unavailable' | 'ok';

@Injectable()
export class RealtimePubSubService implements OnModuleDestroy {
  readonly events = new EventEmitter();
  private readonly logger = new Logger(RealtimePubSubService.name);
  private publisher: Redis | undefined;
  private subscriber: Redis | undefined;
  private readonly ready = new Set<Redis>();
  private subscribed = false;
  private generation = 0;
  private stopping = false;
  private currentStatus: RealtimeStatus = 'stopped';

  /** Recebe configuração existente sem abrir conexão ou instalar timer. */
  constructor(private readonly config: ConfigService) {}

  /** Expõe disponibilidade local sem consultar Redis ou influenciar readiness REST. */
  get status(): RealtimeStatus { return this.currentStatus; }

  /** Abre publicação e assinatura somente por chamada explícita, sem reenvio de comandos pendentes. */
  start(): void {
    if (this.stopping) throw new Error('REALTIME_STOPPED');
    if (this.publisher) throw new Error('REALTIME_ALREADY_STARTED');
    const options = { host: this.config.getOrThrow<string>('REDIS_HOST'), port: this.config.getOrThrow<number>('REDIS_PORT'),
      lazyConnect: true, connectTimeout: 2000, commandTimeout: 2000, enableOfflineQueue: false,
      autoResubscribe: false, autoResendUnfulfilledCommands: false, maxRetriesPerRequest: 0,
      retryStrategy: (attempt: number): number => Math.min(1000 * 2 ** Math.min(attempt - 1, 5), 30000) };
    this.publisher = new Redis(options); this.subscriber = new Redis(options);
    this.refreshStatus();
    const subscriber = this.subscriber;
    subscriber.on('pmessage', (pattern: string, channel: string, payload: string) => {
      if (this.stopping || this.status !== 'ok') return;
      try {
        const event = parseDataUpdatedEvent(payload);
        if (pattern !== PATTERN || channel !== dataUpdatedChannel(event)) throw new Error();
        this.emit('data.updated', event);
      } catch { this.logger.warn('realtime_invalid_event'); }
    });
    for (const client of [this.publisher, subscriber]) {
      client.on('ready', () => {
        if (this.stopping) return;
        this.ready.add(client);
        if (client === subscriber) void this.subscribe(subscriber);
        this.refreshStatus();
      });
      for (const name of ['close', 'reconnecting', 'end', 'error']) {
        client.on(name, () => {
          if (this.stopping) return;
          this.ready.delete(client);
          if (client === subscriber) { this.subscribed = false; this.generation++; }
          this.refreshStatus();
          if (name === 'error') this.logger.warn('realtime_redis_failed');
        });
      }
      void client.connect().catch(() => { this.logger.warn('realtime_connection_failed'); });
    }
  }

  /** Confirma assinatura da conexão atual; falha força reconexão sem tornar callback antigo válido. */
  private async subscribe(client: Redis): Promise<void> {
    const generation = ++this.generation; this.subscribed = false;
    try {
      const count = await client.psubscribe(PATTERN);
      if (this.stopping || generation !== this.generation) return;
      if (count !== 1) throw new Error();
      this.subscribed = true; this.refreshStatus();
    } catch {
      if (this.stopping || generation !== this.generation) return;
      this.subscribed = false; this.ready.delete(client); this.refreshStatus();
      this.logger.warn('realtime_subscription_failed'); client.disconnect(true);
    }
  }

  /** Publica aviso validado sem fila; false não garante ausência de entrega após falha ambígua de rede. */
  async publish(input: DataUpdatedEvent): Promise<boolean> {
    if (this.status !== 'ok' || !this.publisher) return false;
    const publisher = this.publisher;
    let event: DataUpdatedEvent;
    try { event = parseDataUpdatedEvent(JSON.stringify(input)); }
    catch { this.logger.warn('realtime_invalid_event'); return false; }
    try {
      await publisher.publish(dataUpdatedChannel(event), JSON.stringify(event));
      return true;
    } catch {
      if (!this.stopping) {
        this.ready.delete(publisher); this.refreshStatus(); publisher.disconnect(true);
      }
      this.logger.warn('realtime_publish_failed'); return false;
    }
  }

  /** Sinaliza transições para futuro coordenador, sem iniciar/parar MQTT neste transporte. */
  private refreshStatus(): void {
    const status: RealtimeStatus = this.stopping || !this.publisher ? 'stopped' :
      this.ready.size === 2 && this.subscribed ? 'ok' : 'unavailable';
    if (status === this.currentStatus) return;
    this.currentStatus = status; this.emit('status.changed', { status });
  }

  /** Isola cada listener, preservando once e impedindo uma falha de bloquear sinais de disponibilidade. */
  private emit(name: string, event: DataUpdatedEvent | { status: RealtimeStatus }): void {
    for (const listener of this.events.rawListeners(name)) {
      try {
        const result: unknown = listener.call(this.events, event);
        void Promise.resolve(result).catch(() => { this.logger.warn('realtime_listener_failed'); });
      } catch { this.logger.warn('realtime_listener_failed'); }
    }
  }

  /** Interrompe reconexão e callbacks, desconectando uma única vez sem prometer drenar publicação pendente. */
  onModuleDestroy(): void {
    if (this.stopping) return;
    this.stopping = true; this.generation++; this.subscribed = false; this.ready.clear();
    this.publisher?.disconnect(); this.subscriber?.disconnect(); this.refreshStatus();
  }
}
