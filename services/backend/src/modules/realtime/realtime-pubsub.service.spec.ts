// Confere transporte Redis passivo, reconexão e falhas com conexões inteiramente simuladas.
import { EventEmitter } from 'node:events';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { RealtimePubSubService } from './realtime-pubsub.service';
import { DataUpdatedEvent } from './realtime-contract';

jest.mock('ioredis', () => ({ __esModule: true, default: jest.fn() }));
const pattern = 'vers:v1:realtime:*';
const event: DataUpdatedEvent = { version: 1, type: 'data.updated',
  resource: { type: 'test', id: '00000000-0000-4000-8000-000000000501' }, occurredAt: '2026-10-14T12:00:00.000Z' };
const channel = `vers:v1:realtime:test:${event.resource.id}`;

/** Simula operações públicas do ioredis, mantendo emissão de eventos controlada pelo teste. */
function connection(): EventEmitter & { connect: jest.Mock; psubscribe: jest.Mock; publish: jest.Mock; disconnect: jest.Mock } {
  return Object.assign(new EventEmitter(), { connect: jest.fn().mockResolvedValue(undefined),
    psubscribe: jest.fn().mockResolvedValue(1), publish: jest.fn().mockResolvedValue(1), disconnect: jest.fn() });
}

describe('RealtimePubSubService', () => {
  let publisher: ReturnType<typeof connection>; let subscriber: ReturnType<typeof connection>;
  let service: RealtimePubSubService;
  /** Sinaliza prontidão de ambas as conexões e espera confirmação da assinatura. */
  async function ready(): Promise<void> {
    publisher.emit('ready'); subscriber.emit('ready'); await Promise.resolve(); await Promise.resolve();
  }
  beforeEach(() => {
    publisher = connection(); subscriber = connection();
    jest.mocked(Redis).mockImplementationOnce(() => publisher as never).mockImplementationOnce(() => subscriber as never);
    service = new RealtimePubSubService(new ConfigService({ REDIS_HOST: 'redis.example.test', REDIS_PORT: 6379 }));
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
  });
  afterEach(() => { service.onModuleDestroy(); jest.restoreAllMocks(); jest.resetAllMocks(); });

  it('constructor e shutdown sem start não abrem rede', () => {
    expect(service.status).toBe('stopped'); expect(Redis).not.toHaveBeenCalled();
    service.onModuleDestroy(); expect(Redis).not.toHaveBeenCalled();
    expect(() => service.start()).toThrow('REALTIME_STOPPED');
  });
  it('abre duas conexões somente no start, sem fila offline ou reenvio de comandos', () => {
    service.start(); expect(Redis).toHaveBeenCalledTimes(2);
    expect(Redis).toHaveBeenCalledWith(expect.objectContaining({ host: 'redis.example.test', port: 6379,
      lazyConnect: true, enableOfflineQueue: false, autoResendUnfulfilledCommands: false,
      autoResubscribe: false, maxRetriesPerRequest: 0, commandTimeout: 2000, connectTimeout: 2000 }));
    expect(publisher.connect).toHaveBeenCalledTimes(1); expect(subscriber.connect).toHaveBeenCalledTimes(1);
    const options = (jest.mocked(Redis).mock.calls as unknown[][])[0][0] as { retryStrategy: (attempt: number) => number };
    expect(options.retryStrategy(1)).toBe(1000); expect(options.retryStrategy(100)).toBe(30000);
    expect(() => service.start()).toThrow('REALTIME_ALREADY_STARTED');
  });
  it('só fica ok com ambas prontas e assinatura confirmada', async () => {
    service.start(); const statuses = jest.fn(); service.events.on('status.changed', statuses);
    publisher.emit('ready'); expect(service.status).toBe('unavailable');
    subscriber.emit('ready'); expect(service.status).toBe('unavailable');
    await Promise.resolve(); expect(service.status).toBe('ok');
    expect(subscriber.psubscribe).toHaveBeenCalledWith(pattern);
    expect(statuses).toHaveBeenCalledWith({ status: 'ok' });
  });
  it('publica apenas envelope validado no canal do recurso', async () => {
    service.start(); await ready(); expect(await service.publish(event)).toBe(true);
    expect(publisher.publish).toHaveBeenCalledWith(channel, JSON.stringify(event));
    expect(subscriber.publish).not.toHaveBeenCalled();
    expect(await service.publish({ ...event, secret: 'CANARY_SECRET' } as DataUpdatedEvent)).toBe(false);
    expect(publisher.publish).toHaveBeenCalledTimes(1); expect(service.status).toBe('ok');
  });
  it('não enfileira publicação antes de start ou durante queda', async () => {
    expect(await service.publish(event)).toBe(false); service.start(); await ready();
    subscriber.emit('close'); expect(service.status).toBe('unavailable');
    expect(await service.publish(event)).toBe(false); expect(publisher.publish).not.toHaveBeenCalled();
    await ready(); expect(publisher.publish).not.toHaveBeenCalled();
  });
  it('entrega somente envelope válido que corresponde ao canal recebido', async () => {
    service.start(); await ready(); const listener = jest.fn(); service.events.on('data.updated', listener);
    subscriber.emit('pmessage', pattern, channel, JSON.stringify(event)); expect(listener).toHaveBeenCalledWith(event);
    subscriber.emit('pmessage', pattern, channel.replace(':test:', ':installation:'), JSON.stringify(event));
    subscriber.emit('pmessage', pattern, channel, 'CANARY_SECRET');
    subscriber.emit('pmessage', 'untrusted:*', channel, JSON.stringify(event));
    expect(listener).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(jest.mocked(Logger.prototype.warn).mock.calls)).not.toContain('CANARY_SECRET');
  });
  it('reconecta e reassina sem reaproveitar callback da conexão anterior', async () => {
    let confirm!: (value: number) => void;
    subscriber.psubscribe.mockImplementationOnce(() => new Promise<number>((resolve) => { confirm = resolve; }));
    service.start(); publisher.emit('ready'); subscriber.emit('ready'); subscriber.emit('close');
    confirm(1); await Promise.resolve(); expect(service.status).toBe('unavailable');
    subscriber.emit('ready'); await Promise.resolve(); expect(service.status).toBe('ok');
    expect(subscriber.psubscribe).toHaveBeenCalledTimes(2);
  });
  it.each(['error', 'close', 'reconnecting', 'end'])('queda %s de qualquer conexão remove disponibilidade', async (name) => {
    service.start(); await ready(); publisher.emit(name, new Error('CANARY_SECRET'));
    expect(service.status).toBe('unavailable'); await ready();
    subscriber.emit(name, new Error('CANARY_SECRET')); expect(service.status).toBe('unavailable');
  });
  it('falha de PUBLISH não escapa ao chamador nem reenvia comando', async () => {
    service.start(); await ready(); publisher.publish.mockRejectedValueOnce(new Error('CANARY_SECRET'));
    expect(await service.publish(event)).toBe(false); expect(publisher.publish).toHaveBeenCalledTimes(1);
    expect(service.status).toBe('unavailable'); expect(publisher.disconnect).toHaveBeenCalledWith(true);
    expect(JSON.stringify(jest.mocked(Logger.prototype.warn).mock.calls)).not.toContain('CANARY_SECRET');
  });
  it.each([0, new Error('CANARY_SECRET')])('assinatura inválida/falha mantém indisponível e pede reconexão %#', async (result) => {
    if (result instanceof Error) subscriber.psubscribe.mockRejectedValueOnce(result);
    else subscriber.psubscribe.mockResolvedValueOnce(result);
    service.start(); await ready(); await Promise.resolve();
    expect(service.status).toBe('unavailable'); expect(subscriber.disconnect).toHaveBeenCalledWith(true);
  });
  it('rejeição de connect é contida sem expor causa', async () => {
    publisher.connect.mockRejectedValueOnce(new Error('CANARY_SECRET'));
    service.start(); await Promise.resolve(); expect(service.status).toBe('unavailable');
    expect(JSON.stringify(jest.mocked(Logger.prototype.warn).mock.calls)).not.toContain('CANARY_SECRET');
  });
  it('falhas de listeners síncronos e assíncronos não escapam ao Redis', async () => {
    service.start(); await ready(); service.events.on('data.updated', () => { throw new Error('CANARY_SECRET'); });
    const nextListener = jest.fn(); service.events.once('data.updated', nextListener);
    expect(() => subscriber.emit('pmessage', pattern, channel, JSON.stringify(event))).not.toThrow();
    expect(nextListener).toHaveBeenCalledTimes(1);
    subscriber.emit('pmessage', pattern, channel, JSON.stringify(event));
    expect(nextListener).toHaveBeenCalledTimes(1);
    service.events.removeAllListeners('data.updated');
    service.events.on('data.updated', async () => { throw new Error('CANARY_SECRET'); });
    subscriber.emit('pmessage', pattern, channel, JSON.stringify(event));
    await new Promise((resolve) => setImmediate(resolve));
    expect(Logger.prototype.warn).toHaveBeenCalledWith('realtime_listener_failed');
  });
  it('shutdown desconecta uma vez, ignora callbacks antigos e impede nova publicação', async () => {
    service.start(); await ready(); const eventListener = jest.fn(); service.events.on('data.updated', eventListener);
    service.onModuleDestroy(); service.onModuleDestroy();
    expect(publisher.disconnect).toHaveBeenCalledTimes(1); expect(subscriber.disconnect).toHaveBeenCalledTimes(1);
    await ready(); subscriber.emit('pmessage', pattern, channel, JSON.stringify(event));
    expect(service.status).toBe('stopped'); expect(eventListener).not.toHaveBeenCalled();
    expect(await service.publish(event)).toBe(false); expect(() => service.start()).toThrow('REALTIME_STOPPED');
  });
});
