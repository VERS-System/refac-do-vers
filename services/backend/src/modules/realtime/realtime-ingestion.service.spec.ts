// Verifica coordenação de disponibilidade sem rede, banco ou início implícito da ingestão.
import { EventEmitter } from 'node:events';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { connect } from 'mqtt';
import { RealtimeIngestionService } from './realtime-ingestion.service';
import { MqttService } from '../mqtt/mqtt.service';
import { MqttPipelineService } from '../mqtt/mqtt-pipeline.service';

jest.mock('mqtt', () => ({ connect: jest.fn() }));

/** Monta dependências com estado Redis e promessas MQTT controlados pelo teste. */
function setup(): { service: RealtimeIngestionService; redis: { status: string; events: EventEmitter; start: jest.Mock;
  onModuleDestroy: jest.Mock }; pipeline: { start: jest.Mock; pause: jest.Mock; resume: jest.Mock; onModuleDestroy: jest.Mock } } {
  const redis = { status: 'stopped', events: new EventEmitter(), start: jest.fn(), onModuleDestroy: jest.fn() };
  const pipeline = { start: jest.fn().mockResolvedValue(undefined), pause: jest.fn().mockResolvedValue(undefined),
    resume: jest.fn().mockResolvedValue(undefined), onModuleDestroy: jest.fn().mockResolvedValue(undefined) };
  return { service: new RealtimeIngestionService(redis as never, pipeline as never), redis, pipeline };
}

describe('coordenador Redis e ingestão', () => {
  let h: ReturnType<typeof setup>;
  /** Emite mudança real de estado e drena tarefas/microtarefas sem avançar retentativa de um segundo. */
  async function status(value: string): Promise<void> {
    h.redis.status = value; h.redis.events.emit('status.changed', { status: value });
    await jest.advanceTimersByTimeAsync(0);
  }
  beforeEach(() => { jest.useFakeTimers(); h = setup(); jest.spyOn(Logger.prototype, 'warn').mockImplementation(); });
  afterEach(async () => { await h.service.onModuleDestroy(); jest.restoreAllMocks(); jest.useRealTimers(); });

  it('constructor inerte e start aguarda Redis antes de iniciar pipeline', async () => {
    expect(h.redis.start).not.toHaveBeenCalled(); expect(h.redis.events.listenerCount('status.changed')).toBe(0);
    h.service.start(); await status('unavailable'); expect(h.pipeline.start).not.toHaveBeenCalled();
    await status('ok'); expect(h.pipeline.start).toHaveBeenCalledTimes(1);
    expect(() => h.service.start()).toThrow('REALTIME_INGESTION_ALREADY_STARTED');
  });
  it('queda bloqueia pipeline imediatamente e retorno retoma sem novo start', async () => {
    h.service.start(); await status('ok'); h.redis.status = 'unavailable'; h.redis.events.emit('status.changed');
    expect(h.pipeline.pause).toHaveBeenCalled(); await status('ok');
    expect(h.pipeline.resume).toHaveBeenCalledTimes(1); expect(h.pipeline.start).toHaveBeenCalledTimes(1);
  });
  it('queda durante start é preservada e recuperação posterior retoma', async () => {
    let finish!: () => void; h.pipeline.start.mockImplementationOnce(() => new Promise<void>((resolve) => { finish = resolve; }));
    h.service.start(); await status('ok'); await status('unavailable');
    expect(h.pipeline.pause).toHaveBeenCalled(); finish(); await status('ok');
    expect(h.pipeline.resume).toHaveBeenCalledTimes(1);
  });
  it('oscilações durante pausa são serializadas antes de retomar', async () => {
    let finish!: () => void; h.service.start(); await status('ok');
    const pending = new Promise<void>((resolve) => { finish = resolve; }); h.pipeline.pause.mockReturnValue(pending);
    await status('unavailable'); await status('ok'); expect(h.pipeline.resume).not.toHaveBeenCalled();
    finish(); await jest.advanceTimersByTimeAsync(0); expect(h.pipeline.resume).toHaveBeenCalledTimes(1);
  });
  it('falha inicial mantém pausa e tenta retomar com backoff sem propagar causa', async () => {
    h.pipeline.start.mockRejectedValueOnce(new Error('CANARY_SECRET')); h.service.start(); await status('ok');
    expect(h.pipeline.pause).toHaveBeenCalled(); await jest.advanceTimersByTimeAsync(999);
    expect(h.pipeline.resume).not.toHaveBeenCalled(); await jest.advanceTimersByTimeAsync(1);
    expect(h.pipeline.resume).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(jest.mocked(Logger.prototype.warn).mock.calls)).not.toContain('CANARY_SECRET');
  });
  it('queda cancela retry e só retoma quando Redis ficar ok', async () => {
    h.pipeline.start.mockRejectedValueOnce(new Error('failed')); h.service.start(); await status('ok');
    await status('unavailable'); await jest.advanceTimersByTimeAsync(60000);
    expect(h.pipeline.resume).not.toHaveBeenCalled(); await status('ok'); expect(h.pipeline.resume).toHaveBeenCalledTimes(1);
  });
  it('retomada após evento durante falha cancela timer de retry que ficou obsoleto', async () => {
    let fail!: () => void;
    h.pipeline.start.mockImplementationOnce(() => new Promise<void>((_resolve, reject) => { fail = (): void => { reject(new Error('failed')); }; }));
    h.service.start(); await status('ok'); await status('ok'); fail(); await jest.advanceTimersByTimeAsync(0);
    expect(h.pipeline.resume).toHaveBeenCalledTimes(1); expect(jest.getTimerCount()).toBe(0);
  });
  it('shutdown espera ativação pendente sem deixar a conclusão iniciar nova transição', async () => {
    let finish!: () => void;
    h.pipeline.start.mockImplementationOnce(() => new Promise<void>((resolve) => { finish = resolve; }));
    h.service.start(); await status('ok'); let finished = false;
    const closing = h.service.onModuleDestroy().then(() => { finished = true; }); await Promise.resolve();
    expect(finished).toBe(false); finish(); await closing; await status('ok');
    expect(h.pipeline.resume).not.toHaveBeenCalled(); expect(jest.getTimerCount()).toBe(0);
  });
  it('shutdown remove listener/timer, espera transição e nunca reinicia', async () => {
    h.pipeline.start.mockRejectedValueOnce(new Error('failed')); h.service.start(); await status('ok');
    await h.service.onModuleDestroy(); await status('ok'); await jest.advanceTimersByTimeAsync(60000);
    expect(h.redis.events.listenerCount('status.changed')).toBe(0); expect(h.pipeline.resume).not.toHaveBeenCalled();
    expect(h.redis.onModuleDestroy).toHaveBeenCalledTimes(1); expect(h.pipeline.onModuleDestroy).toHaveBeenCalledTimes(1);
    expect(() => h.service.start()).toThrow('REALTIME_INGESTION_STOPPED');
  });
  it('integra coordenador, pipeline e transporte: commit/ACK precedem fechamento e retomada recupera primeiro', async () => {
    /** Simula somente socket/broker, mantendo serviços reais de lifecycle e processamento. */
    function client(): EventEmitter & { handleMessage: jest.Mock; subscribe: jest.Mock; connect: jest.Mock;
      endAsync: jest.Mock; end: jest.Mock; stream: { destroy: jest.Mock } } {
      return Object.assign(new EventEmitter(), { handleMessage: jest.fn(), connect: jest.fn(),
        subscribe: jest.fn((_topic, _options, done) => { done(null, [{ topic: 'vers/v1/devices/+/telemetry', qos: 1 }]); }),
        endAsync: jest.fn().mockResolvedValue(undefined), end: jest.fn(), stream: { destroy: jest.fn() } });
    }
    const first = client(); const next = client();
    jest.mocked(connect).mockReturnValueOnce(first as never).mockReturnValueOnce(next as never);
    const transport = new MqttService(new ConfigService({ MQTT_ENABLED: true, MQTT_URL: 'mqtts://broker.example.test',
      MQTT_USERNAME: 'reader', MQTT_PASSWORD: 'synthetic-only', MQTT_CLIENT_ID: 'persistent-test' }));
    const prisma = { mqttMessage: { findMany: jest.fn().mockResolvedValue([]) }, test: { findMany: jest.fn().mockResolvedValue([]) } };
    let commit!: () => void;
    const reception = { receive: jest.fn().mockResolvedValue({ outcome: 'RECEIVED', id: 'message' }),
      process: jest.fn(() => new Promise((resolve) => { commit = (): void => { resolve({ outcome: 'PROCESSED', id: 'message' }); }; })) };
    const pipeline = new MqttPipelineService(prisma as never, reception as never, {} as never, transport);
    h.service = new RealtimeIngestionService(h.redis as never, pipeline);
    h.service.start(); await status('ok'); first.emit('connect');
    const ack = jest.fn(); first.handleMessage({ qos: 1 }, ack); await jest.advanceTimersByTimeAsync(0);
    await status('unavailable'); const rejected = jest.fn(); first.handleMessage({ qos: 1 }, rejected);
    expect(rejected).toHaveBeenCalledWith(new Error('MQTT_PAUSED')); expect(first.endAsync).not.toHaveBeenCalled();
    commit(); await jest.advanceTimersByTimeAsync(0);
    expect(ack.mock.invocationCallOrder[0]).toBeLessThan(first.endAsync.mock.invocationCallOrder[0]);
    await status('ok'); expect(connect).toHaveBeenCalledTimes(2);
    expect(prisma.mqttMessage.findMany).toHaveBeenCalledTimes(2);
    expect(prisma.mqttMessage.findMany.mock.invocationCallOrder[1]).toBeLessThan(jest.mocked(connect).mock.invocationCallOrder[1]);
    expect(reception.receive).toHaveBeenCalledTimes(1);
  });
});
