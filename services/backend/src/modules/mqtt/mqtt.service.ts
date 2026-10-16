// Gerencia transporte MQTT TLS e confirmação após processamento, sem ativação automática.
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { connect, IPublishPacket, MqttClient } from 'mqtt';
import { parseMqttUrl } from '../../config/env.config';

const TELEMETRY_TOPIC = 'vers/v1/devices/+/telemetry';

@Injectable()
export class MqttService implements OnModuleDestroy {
  private readonly logger = new Logger(MqttService.name);
  private client: MqttClient | undefined;
  private subscribed = false;
  private stopping = false;
  private generation = 0;
  private retryDelay = 1000;
  private retryTimer: ReturnType<typeof setTimeout> | undefined;
  private subscriptionTimer: ReturnType<typeof setTimeout> | undefined;
  private closing: Promise<void> | undefined;

  /** Recebe apenas configuração validada, sem iniciar rede no bootstrap do REST. */
  constructor(private readonly config: ConfigService) {}

  /** Expõe estado seguro do transporte sem testar rede nem bloquear readiness REST. */
  get status(): 'disabled' | 'unavailable' | 'ok' {
    return !this.config.get<boolean>('MQTT_ENABLED', false) ? 'disabled' : this.subscribed ? 'ok' : 'unavailable';
  }

  /** Inicia somente com processador explícito e confirma QoS 1 apenas após seu sucesso. */
  start(processor: (packet: IPublishPacket, receivedAt: Date) => Promise<void>): void {
    if (!this.config.get<boolean>('MQTT_ENABLED', false)) return;
    if (typeof processor !== 'function') throw new Error('MQTT_PROCESSOR_REQUIRED');
    if (this.stopping) throw new Error('MQTT_STOPPED');
    if (this.client) throw new Error('MQTT_ALREADY_STARTED');
    const endpoint = parseMqttUrl(this.config.getOrThrow<string>('MQTT_URL'));
    const client = connect({ protocol: 'mqtts', hostname: endpoint.hostname.replace(/^\[|\]$/g, ''),
      port: Number(endpoint.port || 8883), username: this.config.getOrThrow<string>('MQTT_USERNAME'),
      password: this.config.getOrThrow<string>('MQTT_PASSWORD'), clientId: this.config.getOrThrow<string>('MQTT_CLIENT_ID'),
      rejectUnauthorized: true, protocolVersion: 4, clean: false, manualConnect: true,
      reconnectPeriod: 0, resubscribe: false, connectTimeout: 10000, log: (): void => {} });
    this.client = client;
    client.handleMessage = (packet, done): void => {
      if (this.stopping || this.client !== client) { done(new Error('MQTT_STOPPED')); return; }
      const receivedAt = new Date();
      void Promise.resolve().then(() => processor(packet, receivedAt)).then(() => { done(); }, () => {
        this.subscribed = false;
        this.logger.error('mqtt_processing_failed');
        done(new Error('MQTT_PROCESSING_FAILED'));
        client.stream.destroy();
      });
    };
    client.on('connect', () => {
      if (this.stopping || this.client !== client) return;
      this.subscribed = false;
      const generation = ++this.generation;
      clearTimeout(this.subscriptionTimer);
      this.subscriptionTimer = setTimeout(() => {
        this.logger.warn('mqtt_subscription_failed');
        client.stream.destroy();
      }, 10000);
      client.subscribe(TELEMETRY_TOPIC, { qos: 1 }, (error, granted) => {
        if (this.stopping || this.client !== client || generation !== this.generation) return;
        clearTimeout(this.subscriptionTimer);
        this.subscriptionTimer = undefined;
        if (error || granted?.length !== 1 || granted[0].topic !== TELEMETRY_TOPIC || granted[0].qos !== 1) {
          this.logger.warn('mqtt_subscription_failed');
          client.stream.destroy();
          return;
        }
        this.subscribed = true;
        this.retryDelay = 1000;
        clearTimeout(this.retryTimer);
        this.retryTimer = undefined;
      });
    });
    client.on('error', () => {
      this.subscribed = false;
      this.generation++;
      clearTimeout(this.subscriptionTimer);
      this.subscriptionTimer = undefined;
      this.logger.warn('mqtt_connection_failed');
      client.stream.destroy();
    });
    client.on('close', () => {
      this.subscribed = false;
      this.generation++;
      clearTimeout(this.subscriptionTimer);
      this.subscriptionTimer = undefined;
      this.scheduleReconnect(client);
    });
    client.connect();
  }

  /** Mantém uma retentativa exponencial limitada e evita reconectar depois do shutdown. */
  private scheduleReconnect(client: MqttClient): void {
    if (this.stopping || this.client !== client || this.retryTimer) return;
    const delay = this.retryDelay;
    this.retryDelay = Math.min(delay * 2, 30000);
    this.retryTimer = setTimeout(() => {
      this.retryTimer = undefined;
      if (this.stopping || this.client !== client) return;
      try { client.reconnect(); }
      catch { this.logger.warn('mqtt_connection_failed'); this.scheduleReconnect(client); }
    }, delay);
  }

  /** Cancela retentativas e compartilha uma única finalização mesmo em chamadas repetidas. */
  onModuleDestroy(): Promise<void> {
    if (this.closing) return this.closing;
    this.stopping = true;
    this.subscribed = false;
    clearTimeout(this.retryTimer);
    this.retryTimer = undefined;
    clearTimeout(this.subscriptionTimer);
    this.subscriptionTimer = undefined;
    const client = this.client;
    this.client = undefined;
    if (!client) return Promise.resolve();
    this.closing = this.close(client);
    return this.closing;
  }

  /** Limita encerramento a cinco segundos e força transporte fechado se a biblioteca não concluir. */
  private async close(client: MqttClient): Promise<void> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([client.endAsync(false), new Promise<void>((resolve) => {
        timer = setTimeout(() => { client.end(true); resolve(); }, 5000);
      })]);
    } catch { this.logger.warn('mqtt_shutdown_failed'); client.end(true); }
    finally { clearTimeout(timer); }
  }
}
