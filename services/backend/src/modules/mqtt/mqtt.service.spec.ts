// Confere lifecycle MQTT e confirmação após processamento sem broker ou dados reais.
import { EventEmitter } from 'node:events';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { connect } from 'mqtt';
import { MqttService } from './mqtt.service';

jest.mock('mqtt', () => ({ connect: jest.fn() }));
const topic = 'vers/v1/devices/+/telemetry';

/** Oferece configuração sintética explícita para exercitar conexão simulada. */
function config(): ConfigService {
  return new ConfigService({ MQTT_ENABLED: true, MQTT_URL: 'mqtts://broker.example.test:8883',
    MQTT_USERNAME: 'reader', MQTT_PASSWORD: 'synthetic-secret', MQTT_CLIENT_ID: 'vers-test-reader' });
}

/** Simula as operações públicas usadas pelo serviço e fechamento do transporte. */
function transport(): EventEmitter & { connect: jest.Mock; reconnect: jest.Mock; subscribe: jest.Mock;
  handleMessage: jest.Mock; endAsync: jest.Mock; end: jest.Mock; stream: { destroy: jest.Mock } } {
  const client = Object.assign(new EventEmitter(), { connect: jest.fn(), reconnect: jest.fn(), subscribe: jest.fn(),
    handleMessage: jest.fn(), endAsync: jest.fn().mockResolvedValue(undefined), end: jest.fn(), stream: { destroy: jest.fn() } });
  client.stream.destroy.mockImplementation(() => { client.emit('close'); });
  client.subscribe.mockImplementation((_topic, _options, done) => { done(null, [{ topic, qos: 1 }]); });
  return client;
}

describe('MqttService', () => {
  let client: ReturnType<typeof transport>;
  let service: MqttService;
  beforeEach(() => {
    jest.useFakeTimers(); client = transport();
    jest.mocked(connect).mockReturnValue(client as never); service = new MqttService(config());
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });
  afterEach(async () => {
    await service.onModuleDestroy(); jest.useRealTimers(); jest.restoreAllMocks(); jest.clearAllMocks();
  });
  it('fica desativado por padrão sem conexão ou segredos obrigatórios', () => {
    service = new MqttService(new ConfigService()); service.start(jest.fn());
    expect(service.status).toBe('disabled'); expect(connect).not.toHaveBeenCalled();
  });
  it('não conecta automaticamente e exige processador antes de receber', () => {
    expect(service.status).toBe('unavailable'); expect(connect).not.toHaveBeenCalled();
    expect(() => service.start(undefined as never)).toThrow('MQTT_PROCESSOR_REQUIRED');
    expect(connect).not.toHaveBeenCalled();
  });
  it('usa TLS com certificado válido, credencial consumidora e sessão estável', () => {
    service.start(jest.fn());
    expect(connect).toHaveBeenCalledWith(expect.objectContaining({ protocol: 'mqtts', hostname: 'broker.example.test', port: 8883,
      username: 'reader', password: 'synthetic-secret', clientId: 'vers-test-reader', rejectUnauthorized: true,
      protocolVersion: 4, clean: false, manualConnect: true, reconnectPeriod: 0, resubscribe: false,
      connectTimeout: 10000, log: expect.any(Function) }));
    expect(client.connect).toHaveBeenCalledTimes(1); expect(service.status).toBe('unavailable');
    expect(() => service.start(jest.fn())).toThrow('MQTT_ALREADY_STARTED'); expect(connect).toHaveBeenCalledTimes(1);
  });
  it.each(['mqtt://broker.example.test', 'mqtts://user:secret@broker.example.test',
    'mqtts://broker.example.test/path', 'mqtts://broker.example.test?password=secret'])(
  'recusa configuração insegura também fora do schema %s', (url) => {
    const unsafe = config(); unsafe.set('MQTT_URL', url); service = new MqttService(unsafe);
    expect(() => service.start(jest.fn())).toThrow('MQTT_INVALID_CONFIGURATION'); expect(connect).not.toHaveBeenCalled();
  });
  it('sinaliza ok somente após concessão QoS 1 da assinatura', () => {
    service.start(jest.fn()); client.emit('connect');
    expect(client.subscribe).toHaveBeenCalledWith(topic, { qos: 1 }, expect.any(Function)); expect(service.status).toBe('ok');
  });
  it.each([{ granted: [] }, { granted: [{ topic, qos: 128 }] }, { granted: [{ topic, qos: 0 }] },
    { granted: [{ topic: 'other', qos: 1 }] }])(
    'recusa concessão inválida %j', ({ granted }) => {
      client.subscribe.mockImplementation((_topic, _options, done) => { done(null, granted); });
      service.start(jest.fn()); client.emit('connect'); expect(service.status).toBe('unavailable');
      expect(client.stream.destroy).toHaveBeenCalledTimes(1);
      expect(Logger.prototype.warn).toHaveBeenCalledWith('mqtt_subscription_failed');
    });
  it('falha na assinatura sem registrar segredo ou causa', () => {
    client.subscribe.mockImplementation((_topic, _options, done) => { done(new Error('password=synthetic-secret')); });
    service.start(jest.fn()); client.emit('connect'); expect(service.status).toBe('unavailable');
    expect(Logger.prototype.warn).toHaveBeenCalledWith('mqtt_subscription_failed');
  });
  it('não reaproveita callback de conexão já fechada', () => {
    client.subscribe.mockImplementation(); service.start(jest.fn()); client.emit('connect');
    const callback = client.subscribe.mock.calls[0][2]; client.emit('close'); callback(null, [{ topic, qos: 1 }]);
    expect(service.status).toBe('unavailable');
  });
  it('assinatura sem resposta expira e reconecta sem ficar presa', async () => {
    client.subscribe.mockImplementation(); service.start(jest.fn()); client.emit('connect');
    await jest.advanceTimersByTimeAsync(9999); expect(client.stream.destroy).not.toHaveBeenCalled();
    await jest.advanceTimersByTimeAsync(1); expect(client.stream.destroy).toHaveBeenCalledTimes(1);
    expect(service.status).toBe('unavailable');
    await jest.advanceTimersByTimeAsync(1000); expect(client.reconnect).toHaveBeenCalledTimes(1);
  });
  it('erro TLS derruba status sem expor causa e tenta novamente após close', async () => {
    service.start(jest.fn()); client.emit('connect'); client.emit('error', new Error('certificate password=synthetic-secret'));
    expect(service.status).toBe('unavailable'); expect(Logger.prototype.warn).toHaveBeenCalledWith('mqtt_connection_failed');
    client.emit('close'); await jest.advanceTimersByTimeAsync(999); expect(client.reconnect).not.toHaveBeenCalled();
    await jest.advanceTimersByTimeAsync(1); expect(client.reconnect).toHaveBeenCalledTimes(1);
    client.emit('connect'); expect(service.status).toBe('ok'); expect(client.subscribe).toHaveBeenCalledTimes(2);
  });
  it('backoff cresce até 30 s e reinicia após assinatura aceita', async () => {
    service.start(jest.fn());
    for (const [index, delay] of [1000, 2000, 4000, 8000, 16000, 30000, 30000].entries()) {
      client.emit('close'); await jest.advanceTimersByTimeAsync(delay - 1);
      expect(client.reconnect).toHaveBeenCalledTimes(index); await jest.advanceTimersByTimeAsync(1);
      expect(client.reconnect).toHaveBeenCalledTimes(index + 1);
    }
    client.emit('connect'); client.emit('close'); await jest.advanceTimersByTimeAsync(1000);
    expect(client.reconnect).toHaveBeenCalledTimes(8);
  });
  it('close repetido não duplica timer', async () => {
    service.start(jest.fn()); client.emit('close'); client.emit('close'); await jest.advanceTimersByTimeAsync(1000);
    expect(client.reconnect).toHaveBeenCalledTimes(1);
  });
  it('recuperação da assinatura cancela timer de conexão antiga', async () => {
    service.start(jest.fn()); client.emit('close'); client.emit('connect');
    await jest.advanceTimersByTimeAsync(1000);
    expect(service.status).toBe('ok'); expect(client.reconnect).not.toHaveBeenCalled();
  });
  it('erro invalida callback de assinatura ainda pendente', () => {
    client.subscribe.mockImplementation(); service.start(jest.fn()); client.emit('connect');
    const callback = client.subscribe.mock.calls[0][2];
    client.emit('error', new Error('certificate')); callback(null, [{ topic, qos: 1 }]);
    expect(service.status).toBe('unavailable');
  });
  it('confirma somente depois do processador e entrega horário do backend', async () => {
    let finish!: () => void;
    const processor = jest.fn(() => new Promise<void>((resolve) => { finish = resolve; })); service.start(processor);
    const packet = { topic: 'vers/v1/devices/vers-sim-001/telemetry', payload: Buffer.from('{}'), qos: 1, retain: false };
    const ack = jest.fn(); client.handleMessage(packet, ack); await Promise.resolve();
    expect(processor).toHaveBeenCalledWith(packet, expect.any(Date)); expect(ack).not.toHaveBeenCalled();
    finish(); await jest.advanceTimersByTimeAsync(0); expect(ack).toHaveBeenCalledWith();
  });
  it('erro no processador não confirma positivamente nem expõe causa', async () => {
    service.start(jest.fn().mockRejectedValue(new Error('postgresql://synthetic-secret')));
    const ack = jest.fn(); client.handleMessage({ qos: 1 }, ack); await jest.advanceTimersByTimeAsync(0);
    expect(ack).toHaveBeenCalledWith(new Error('MQTT_PROCESSING_FAILED')); expect(client.stream.destroy).toHaveBeenCalled();
    expect(service.status).toBe('unavailable'); expect(Logger.prototype.error).toHaveBeenCalledWith('mqtt_processing_failed');
  });
  it('shutdown cancela retentativa e encerra uma única vez', async () => {
    service.start(jest.fn()); client.emit('close'); await service.onModuleDestroy(); client.emit('close');
    await jest.advanceTimersByTimeAsync(60000); expect(client.reconnect).not.toHaveBeenCalled();
    expect(client.endAsync).toHaveBeenCalledTimes(1); expect(service.status).toBe('unavailable');
  });
  it('não aceita novas mensagens depois de iniciado o shutdown', async () => {
    const processor = jest.fn(); service.start(processor); await service.onModuleDestroy();
    const ack = jest.fn(); client.handleMessage({ qos: 1 }, ack); await jest.advanceTimersByTimeAsync(0);
    expect(processor).not.toHaveBeenCalled(); expect(ack).toHaveBeenCalledWith(new Error('MQTT_STOPPED'));
  });
  it('erro de shutdown força fechamento sem expor causa', async () => {
    client.endAsync.mockRejectedValue(new Error('password=synthetic-secret')); service.start(jest.fn());
    await service.onModuleDestroy();
    expect(client.end).toHaveBeenCalledWith(true); expect(Logger.prototype.warn).toHaveBeenCalledWith('mqtt_shutdown_failed');
    expect(jest.getTimerCount()).toBe(0);
  });
  it('shutdown força fechamento após timeout sem travar o processo', async () => {
    client.endAsync.mockImplementation(() => new Promise<void>(() => {})); service.start(jest.fn());
    const stopped = service.onModuleDestroy(); await jest.advanceTimersByTimeAsync(5000); await stopped;
    expect(client.end).toHaveBeenCalledWith(true); expect(jest.getTimerCount()).toBe(0);
  });
});
