// Confere recepção transacional e logs agregados com Prisma/transporte simulados.
import { EventEmitter } from 'node:events';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { connect, IPublishPacket } from 'mqtt';
import { MqttReceptionService } from './mqtt-reception.service';
import { MqttService } from './mqtt.service';
import { resolveSampleTest } from './mqtt-contract';

jest.mock('mqtt', () => ({ connect: jest.fn() }));
const receivedAt = new Date('2026-10-14T12:00:10.000Z');
const topic = 'vers/v1/devices/vers-sim-001/telemetry';
const device = { id: '00000000-0000-4000-8000-000000000601',
  installationId: '00000000-0000-4000-8000-000000000201', vehicleId: '00000000-0000-4000-8000-000000000101' };
const authorizedTest = { id: '00000000-0000-4000-8000-000000000501', status: 'RUNNING',
  startedAt: new Date('2026-10-14T12:00:00.000Z'), endedAt: null as Date | null };

/** Cria envelope isolado para verificar dados originais e conflitos de conteúdo. */
function message(): Record<string, unknown> {
  return { schemaVersion: 1, messageId: '00000000-0000-4000-8000-000000000701', deviceUid: 'vers-sim-001',
    sequence: 1, capturedAt: '2026-10-14T12:00:00.000Z', testId: '00000000-0000-4000-8000-000000000501',
    samples: [{ capturedAt: '2026-10-14T12:00:00.000Z', measurements: { voltageV: 4, currentA: null, accumulatedEnergyWh: 0 } }] };
}

/** Serializa envelope em bytes iguais aos recebidos do parser MQTT. */
function packet(value: unknown = message()): Pick<IPublishPacket, 'topic' | 'payload' | 'qos' | 'retain'> {
  return { topic, payload: Buffer.from(JSON.stringify(value)), qos: 1, retain: false };
}

/** Fornece doubles limitados à recepção, sem simular prova de rollback SQL. */
function setup(): {
  service: MqttReceptionService;
  tx: { $queryRaw: jest.Mock; device: { findUnique: jest.Mock };
    mqttMessage: { findFirst: jest.Mock; create: jest.Mock; update: jest.Mock } };
  transaction: jest.Mock;
} {
  const tx = { $queryRaw: jest.fn().mockImplementation(async (sql: TemplateStringsArray, ...params: unknown[]) => {
    const text = sql.join(' ');
    if (text.includes('INSERT INTO mqtt_messages')) {
      // Decodifica somente parâmetros do INSERT estático para conservar assertions de conteúdo/erro da recepção.
      const [, messageId, deviceId, testId, schemaVersion, topic, payload, sequence, qos, retained,
        capturedAt, receivedAt, status, rejectionReason, processedAt] = params;
      return [await tx.mqttMessage.create({ data: { messageId, deviceId, testId, schemaVersion, topic,
        payload: JSON.parse(payload as string), sequence, qos, retained, capturedAt, receivedAt, status,
        ...(rejectionReason ? { rejectionReason, processedAt } : {}) }, select: { id: true } })];
    }
    if (text.includes('FROM mqtt_messages')) {
      const existing = await tx.mqttMessage.findFirst();
      return existing ? [{ ...existing, payloadText: JSON.stringify(existing.payload) }] : [];
    }
    return text.includes('FROM tests') ? [{ ...authorizedTest }] : [{ id: 'locked', status: 'ONLINE' }];
  }),
    device: { findUnique: jest.fn().mockResolvedValue(device) },
    mqttMessage: { findFirst: jest.fn().mockResolvedValue(null), create: jest.fn().mockResolvedValue({ id: 'persisted-id' }),
      update: jest.fn() } };
  const transaction = jest.fn(async (fn: (value: typeof tx) => Promise<unknown>): Promise<unknown> => fn(tx));
  return { service: new MqttReceptionService({ $transaction: transaction } as never,
    { recomputeMessage: jest.fn() } as never), tx, transaction };
}

/** Representa envelope existente sem expor seu conteúdo em logs ou resultados públicos. */
function existing(): object {
  return { id: 'existing-id', messageId: message().messageId, deviceId: device.id,
    sequence: 1n, topic, payload: message(), receivedAt: new Date('2026-10-14T12:00:01.000Z'), status: 'PROCESSED' };
}

describe('recepção MQTT', () => {
  let harness: ReturnType<typeof setup>;
  beforeEach(() => {
    jest.useFakeTimers(); jest.setSystemTime(receivedAt);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    harness = setup();
  });
  afterEach(() => { harness.service.onModuleDestroy(); jest.restoreAllMocks(); jest.useRealTimers(); jest.clearAllMocks(); });

  it('persiste envelope íntegro e associa somente teste autorizado na transação', async () => {
    const { service, tx, transaction } = harness;
    expect(await service.receive(packet(), receivedAt)).toEqual({ outcome: 'RECEIVED', id: 'persisted-id' });
    expect(transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });
    expect(tx.mqttMessage.create).toHaveBeenCalledWith({ data: {
      messageId: message().messageId, deviceId: device.id, testId: authorizedTest.id, schemaVersion: 1,
      topic, payload: message(), sequence: 1n, qos: 1, retained: false,
      capturedAt: new Date('2026-10-14T12:00:00.000Z'), receivedAt, status: 'RECEIVED',
    }, select: { id: true } });
    expect(tx.mqttMessage.update).not.toHaveBeenCalled(); expect(Logger.prototype.warn).not.toHaveBeenCalled();
  });
  it('preserva bruto/metadados de transporte recusado sem inventar potência para null/zero', async () => {
    const source = packet(); source.qos = 0; source.retain = true;
    await harness.service.receive(source, receivedAt);
    const saved = harness.tx.mqttMessage.create.mock.calls[0][0].data;
    expect(saved).toMatchObject({ qos: 0, retained: true, payload: message() });
    expect(saved).toMatchObject({ status: 'REJECTED', testId: null, rejectionReason: 'MQTT_TRANSPORT_NOT_ALLOWED', processedAt: receivedAt });
    expect(saved.payload.samples[0].measurements).not.toHaveProperty('powerW');
  });
  it.each(['2026-10-14T11:00:00.000Z', '2026-10-14T13:00:00.000Z'])(
    'preserva captura atrasada/futura %s sem alterar data', async (capturedAt) => {
      const source = { ...message(), capturedAt, samples: [{ capturedAt, measurements: {} }] };
      await harness.service.receive(packet(source), receivedAt);
      expect(harness.tx.mqttMessage.create.mock.calls[0][0].data.capturedAt).toEqual(new Date(capturedAt));
    });
  it('bloqueia veículo, instalação e dispositivo antes de gravar, sem interpolar SQL', async () => {
    await harness.service.receive(packet(), receivedAt);
    const calls = harness.tx.$queryRaw.mock.calls;
    expect(calls.filter(([sql]) => (sql as TemplateStringsArray).join(' ').includes('FOR UPDATE'))
      .map(([sql]) => (sql as TemplateStringsArray).join(' '))).toEqual([
      expect.stringContaining('FROM vehicles'), expect.stringContaining('FROM vers_installations'),
      expect.stringContaining('FROM devices'), expect.stringContaining('FROM tests')]);
    expect((calls[2][0] as TemplateStringsArray).join(' ')).toContain('revoked_at IS NULL');
    expect((calls[2][0] as TemplateStringsArray).join(' ')).toContain("status <> 'REVOKED'");
    expect(calls[2]).toEqual(expect.arrayContaining([device.id, 'vers-sim-001', device.installationId, device.vehicleId]));
    expect(Math.max(...harness.tx.$queryRaw.mock.invocationCallOrder)).toBeLessThan(
      harness.tx.mqttMessage.create.mock.invocationCallOrder[0]);
  });
  it('recusa dispositivo desconhecido sem inventar origem', async () => {
    harness.tx.device.findUnique.mockResolvedValue(null);
    expect(await harness.service.receive(packet(), receivedAt)).toEqual({ outcome: 'REJECTED', id: null });
    expect(harness.tx.mqttMessage.create).not.toHaveBeenCalled();
  });
  it.each([0, 1, 2])('não grava se o lock %s indicar recurso excluído/revogado', async (index) => {
    harness.tx.$queryRaw.mockReset();
    for (let before = 0; before < index; before++) harness.tx.$queryRaw.mockResolvedValueOnce([{ id: 'locked' }]);
    harness.tx.$queryRaw.mockResolvedValueOnce([]);
    expect(await harness.service.receive(packet(), receivedAt)).toEqual({ outcome: 'REJECTED', id: null });
    expect(harness.tx.mqttMessage.create).not.toHaveBeenCalled();
  });
  it('retransmissão equivalente retorna o ID original sem reescrever payload/horários/estado', async () => {
    const row = existing(); harness.tx.mqttMessage.findFirst.mockResolvedValue(row);
    const reordered = Object.fromEntries(Object.entries(message()).reverse());
    expect(await harness.service.receive(packet(reordered), receivedAt)).toEqual({ outcome: 'DUPLICATE', id: 'existing-id' });
    expect(harness.tx.mqttMessage.create).not.toHaveBeenCalled(); expect(harness.tx.mqttMessage.update).not.toHaveBeenCalled();
    expect(row).toEqual(existing());
  });
  it.each([
    { messageId: '00000000-0000-4000-8000-000000000702' }, { sequence: 2 },
    { testId: null }, { samples: [{ capturedAt: '2026-10-14T12:00:00.000Z', measurements: {} }] },
  ])('recusa conflito de identidade/conteúdo %j', async (changes) => {
    harness.tx.mqttMessage.findFirst.mockResolvedValue(existing());
    expect(await harness.service.receive(packet({ ...message(), ...changes }), receivedAt)).toEqual({ outcome: 'REJECTED', id: null });
    expect(harness.tx.mqttMessage.create).not.toHaveBeenCalled(); expect(harness.tx.mqttMessage.update).not.toHaveBeenCalled();
  });
  it('colisão com outro dispositivo não expõe seu ID nem sobrescreve envelope', async () => {
    harness.tx.mqttMessage.findFirst.mockResolvedValue({ ...existing(), deviceId: 'other-device' });
    expect(await harness.service.receive(packet(), receivedAt)).toEqual({ outcome: 'REJECTED', id: null });
    expect(harness.tx.mqttMessage.create).not.toHaveBeenCalled();
  });
  it('normaliza somente a comparação JSON de -0/0 como faz a persistência', async () => {
    const source = message(); source.samples = [{ capturedAt: source.capturedAt, measurements: { currentA: -0 } }];
    harness.tx.mqttMessage.findFirst.mockResolvedValue({ ...existing(), payload: JSON.parse(JSON.stringify(source)) });
    const incoming = packet(source);
    incoming.payload = Buffer.from(JSON.stringify(source).replace('"currentA":0', '"currentA":-0'));
    expect(await harness.service.receive(incoming, receivedAt)).toEqual({ outcome: 'DUPLICATE', id: 'existing-id' });
  });
  it('P2002 reconsulta uma única vez em transação nova e reconhece retransmissão', async () => {
    harness.tx.mqttMessage.create.mockRejectedValueOnce(new Prisma.PrismaClientKnownRequestError('synthetic',
      { code: 'P2002', clientVersion: 'test' }));
    harness.tx.mqttMessage.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce(existing());
    expect(await harness.service.receive(packet(), receivedAt)).toEqual({ outcome: 'DUPLICATE', id: 'existing-id' });
    expect(harness.transaction).toHaveBeenCalledTimes(2); expect(harness.tx.mqttMessage.create).toHaveBeenCalledTimes(1);
  });
  it('P2002 persistente falha sem loop infinito nem causa em resposta', async () => {
    harness.tx.mqttMessage.create.mockRejectedValue(new Prisma.PrismaClientKnownRequestError('synthetic-secret',
      { code: 'P2002', clientVersion: 'test' }));
    await expect(harness.service.receive(packet(), receivedAt)).rejects.toThrow('MQTT_PERSISTENCE_FAILED');
    expect(harness.transaction).toHaveBeenCalledTimes(2);
  });
  it('falha de banco não vira rejeição permanente e não expõe detalhes', async () => {
    harness.tx.mqttMessage.create.mockRejectedValue(new Error('postgresql://synthetic-secret'));
    await expect(harness.service.receive(packet(), receivedAt)).rejects.toThrow('MQTT_PERSISTENCE_FAILED');
    await jest.advanceTimersByTimeAsync(60000); expect(Logger.prototype.warn).not.toHaveBeenCalled();
  });
  it('receivedAt inválido é erro do chamador, sem gravação ou rejeição permanente', async () => {
    await expect(harness.service.receive(packet(), new Date(NaN))).rejects.toThrow(RangeError);
    expect(harness.transaction).not.toHaveBeenCalled();
  });
  it.each([
    { ...packet(), payload: Buffer.alloc(65537) }, { ...packet(), payload: Buffer.from('{"password":"CANARY_SECRET"') },
    packet({ ...message(), password: 'CANARY_SECRET' }), packet({ ...message(), samples: [{ capturedAt: message().capturedAt,
      measurements: { voltageV: { nested: { secret: 'CANARY_SECRET' } } } }] }),
    { ...packet(), topic: 'invalid/CANARY_SECRET' }, { ...packet(), payload: 'CANARY_SECRET' },
    { ...packet(), qos: 3 }, { ...packet(), retain: 'CANARY_SECRET' },
  ])('rejeita entrada inválida sem persistir ou ecoar conteúdo %#', async (source) => {
    expect(await harness.service.receive(source as never, receivedAt)).toEqual({ outcome: 'REJECTED', id: null });
    expect(harness.transaction).not.toHaveBeenCalled();
    await jest.advanceTimersByTimeAsync(60000);
    expect(Logger.prototype.warn).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(jest.mocked(Logger.prototype.warn).mock.calls)).not.toContain('CANARY_SECRET');
  });
  it('agrega rejeições por código sem timer por mensagem ou labels do cliente', async () => {
    for (let index = 0; index < 100; index++) await harness.service.receive({ ...packet(), payload: Buffer.from('{') }, receivedAt);
    await harness.service.receive(packet({ ...message(), forbidden: 'CANARY_SECRET' }), receivedAt);
    expect(jest.getTimerCount()).toBe(1); expect(Logger.prototype.warn).not.toHaveBeenCalled();
    await jest.advanceTimersByTimeAsync(60000);
    expect(Logger.prototype.warn).toHaveBeenCalledWith({ event: 'mqtt_rejections',
      recordedAt: '2026-10-14T12:01:10.000Z', counts: { MQTT_INVALID_JSON: 100, MQTT_INVALID_ENVELOPE: 1 } });
    expect(jest.getTimerCount()).toBe(0);
  });
  it('flush no shutdown limpa timer e não duplica contagens', async () => {
    await harness.service.receive({ ...packet(), payload: Buffer.from('{') }, receivedAt);
    harness.service.onModuleDestroy(); harness.service.onModuleDestroy();
    expect(Logger.prototype.warn).toHaveBeenCalledTimes(1); expect(jest.getTimerCount()).toBe(0);
  });
  it('transporte só confirma depois do commit simulado; falha fecha conexão', async () => {
    const client = Object.assign(new EventEmitter(), { connect: jest.fn(), subscribe: jest.fn(), reconnect: jest.fn(),
      handleMessage: jest.fn(), endAsync: jest.fn().mockResolvedValue(undefined), end: jest.fn(), stream: { destroy: jest.fn() } });
    jest.mocked(connect).mockReturnValue(client as never);
    const transport = new MqttService(new ConfigService({ MQTT_ENABLED: true, MQTT_URL: 'mqtts://broker.example.test',
      MQTT_USERNAME: 'reader', MQTT_PASSWORD: 'synthetic-secret', MQTT_CLIENT_ID: 'vers-test-reader' }));
    let commit!: () => void;
    harness.transaction.mockImplementationOnce(() => new Promise((resolve) => {
      commit = (): void => { resolve({ outcome: 'RECEIVED', id: 'persisted-id' }); };
    }));
    transport.start(async (incoming, time) => { await harness.service.receive(incoming, time); });
    try {
      const ack = jest.fn(); client.handleMessage(packet(), ack); await Promise.resolve(); await Promise.resolve();
      expect(ack).not.toHaveBeenCalled(); commit(); await jest.advanceTimersByTimeAsync(0);
      expect(ack).toHaveBeenCalledWith();
      harness.tx.mqttMessage.create.mockRejectedValue(new Error('CANARY_SECRET'));
      const failedAck = jest.fn(); client.handleMessage(packet(), failedAck); await jest.advanceTimersByTimeAsync(0);
      expect(failedAck).toHaveBeenCalledWith(new Error('MQTT_PROCESSING_FAILED')); expect(client.stream.destroy).toHaveBeenCalled();
    } finally { await transport.onModuleDestroy(); }
  });

  it.each(['ONLINE', 'OFFLINE', 'FAULT'])('processa dispositivo %s sem depender de presença online', async (status) => {
    harness.tx.$queryRaw.mockResolvedValueOnce([{ id: 'vehicle' }]).mockResolvedValueOnce([{ id: 'installation' }])
      .mockResolvedValueOnce([{ id: device.id, status }]);
    expect(await harness.service.receive(packet(), receivedAt)).toEqual({ outcome: 'RECEIVED', id: 'persisted-id' });
  });
  it('preserva bruto de PROVISIONING como rejeitado sem consultar teste ou gerar vínculo', async () => {
    harness.tx.$queryRaw.mockResolvedValueOnce([{ id: 'vehicle' }]).mockResolvedValueOnce([{ id: 'installation' }])
      .mockResolvedValueOnce([{ id: device.id, status: 'PROVISIONING' }]);
    expect(await harness.service.receive(packet(), receivedAt)).toEqual({ outcome: 'REJECTED', id: 'persisted-id' });
    expect(harness.tx.mqttMessage.create.mock.calls[0][0].data).toMatchObject({ payload: message(),
      status: 'REJECTED', testId: null, rejectionReason: 'MQTT_DEVICE_NOT_READY', processedAt: receivedAt });
    expect(harness.tx.$queryRaw.mock.calls.some(([sql]) => (sql as TemplateStringsArray).join(' ').includes('FROM tests'))).toBe(false);
  });
  it.each([{ qos: 0, retain: false }, { qos: 2, retain: false }, { qos: 1, retain: true }])(
    'não processa transporte fora do contrato %j', async (metadata) => {
      expect(await harness.service.receive({ ...packet(), ...metadata } as never, receivedAt))
        .toEqual({ outcome: 'REJECTED', id: 'persisted-id' });
      expect(harness.tx.mqttMessage.create.mock.calls[0][0].data).toMatchObject({ payload: message(),
        status: 'REJECTED', rejectionReason: 'MQTT_TRANSPORT_NOT_ALLOWED', testId: null });
    });
  it('testId null conserva telemetria da instalação e não consulta teste', async () => {
    await harness.service.receive(packet({ ...message(), testId: null }), receivedAt);
    expect(harness.tx.$queryRaw.mock.calls.some(([sql]) => (sql as TemplateStringsArray).join(' ').includes('FROM tests'))).toBe(false);
    expect(harness.tx.mqttMessage.create.mock.calls[0][0].data).toMatchObject({ status: 'RECEIVED', testId: null });
  });
  it('consulta e bloqueia teste somente da mesma instalação e veículo', async () => {
    await harness.service.receive(packet(), receivedAt);
    const [sql, ...params] = harness.tx.$queryRaw.mock.calls.find(([query]) => (query as TemplateStringsArray).join(' ').includes('FROM tests'))!;
    expect((sql as TemplateStringsArray).join(' ')).toEqual(expect.stringContaining('FOR UPDATE'));
    expect((sql as TemplateStringsArray).join(' ')).toEqual(expect.stringContaining('installation_id ='));
    expect((sql as TemplateStringsArray).join(' ')).toEqual(expect.stringContaining('vehicle_id ='));
    expect(params).toEqual([authorizedTest.id, device.installationId, device.vehicleId]);
    expect((harness.tx.$queryRaw.mock.calls[1][0] as TemplateStringsArray).join(' ')).not.toContain('status');
  });
  it.each([
    [], [{ ...authorizedTest, status: 'PLANNED', startedAt: null }],
    [{ ...authorizedTest, status: 'CANCELLED', endedAt: receivedAt }],
    [{ ...authorizedTest, startedAt: null }], [{ ...authorizedTest, endedAt: receivedAt }],
    [{ ...authorizedTest, status: 'COMPLETED', endedAt: null }],
    [{ ...authorizedTest, status: 'FAILED', endedAt: new Date('2026-10-14T11:00:00.000Z') }],
    [{ ...authorizedTest, status: 'COMPLETED', endedAt: authorizedTest.startedAt }],
  ].map((rows) => ({ rows })))('rejeita processamento com vínculo/estado/intervalo de teste inválido %#', async ({ rows }) => {
    harness.tx.$queryRaw.mockResolvedValueOnce([{ id: 'vehicle' }]).mockResolvedValueOnce([{ id: 'installation' }])
      .mockResolvedValueOnce([{ id: device.id, status: 'ONLINE' }]).mockResolvedValueOnce([]).mockResolvedValueOnce(rows);
    expect(await harness.service.receive(packet(), receivedAt)).toEqual({ outcome: 'REJECTED', id: 'persisted-id' });
    expect(harness.tx.mqttMessage.create.mock.calls[0][0].data).toMatchObject({ payload: message(),
      status: 'REJECTED', rejectionReason: 'MQTT_TEST_UNAVAILABLE', testId: null, processedAt: receivedAt });
    expect(Logger.prototype.warn).not.toHaveBeenCalled();
  });
  it.each(['COMPLETED', 'FAILED'])('aceita captura histórica em teste %s sem alterar seu estado', async (status) => {
    const test = { ...authorizedTest, status, endedAt: new Date('2026-10-14T12:00:05.000Z') };
    harness.tx.$queryRaw.mockResolvedValueOnce([{ id: 'vehicle' }]).mockResolvedValueOnce([{ id: 'installation' }])
      .mockResolvedValueOnce([{ id: device.id, status: 'OFFLINE' }]).mockResolvedValueOnce([]).mockResolvedValueOnce([test]);
    await harness.service.receive(packet(), new Date('2026-10-14T13:00:00.000Z'));
    expect(harness.tx.mqttMessage.create.mock.calls[0][0].data).toMatchObject({ status: 'RECEIVED', testId: test.id });
    expect(resolveSampleTest(test.endedAt, test)).toEqual({ testId: test.id, association: 'ASSOCIATED' });
    expect(resolveSampleTest(new Date(test.endedAt.getTime() + 1), test))
      .toEqual({ testId: null, association: 'OUTSIDE_TEST' });
    expect(test.status).toBe(status);
  });
  it('retransmissão de rejeitada mantém decisão original sem reautorizar ou alterar bruto', async () => {
    harness.tx.mqttMessage.findFirst.mockResolvedValue({ ...existing(), status: 'REJECTED', rejectionReason: 'MQTT_TEST_UNAVAILABLE' });
    expect(await harness.service.receive(packet(), receivedAt)).toEqual({ outcome: 'DUPLICATE', id: 'existing-id' });
    expect(harness.tx.$queryRaw.mock.calls.some(([sql]) => (sql as TemplateStringsArray).join(' ').includes('FROM tests'))).toBe(false);
    expect(harness.tx.mqttMessage.create).not.toHaveBeenCalled(); expect(harness.tx.mqttMessage.update).not.toHaveBeenCalled();
  });
  it('falha ao bloquear teste não confirma nem persiste decisão parcial', async () => {
    harness.tx.$queryRaw.mockResolvedValueOnce([{ id: 'vehicle' }]).mockResolvedValueOnce([{ id: 'installation' }])
      .mockResolvedValueOnce([{ id: device.id, status: 'ONLINE' }]).mockResolvedValueOnce([]).mockRejectedValueOnce(new Error('CANARY_SECRET'));
    await expect(harness.service.receive(packet(), receivedAt)).rejects.toThrow('MQTT_PERSISTENCE_FAILED');
    expect(harness.tx.mqttMessage.create).not.toHaveBeenCalled(); expect(Logger.prototype.warn).not.toHaveBeenCalled();
  });
  it('23505 do INSERT SQL reconsulta em nova transação sem reutilizar transação abortada', async () => {
    harness.tx.mqttMessage.create.mockRejectedValueOnce(new Prisma.PrismaClientKnownRequestError('CANARY_SECRET',
      { code: 'P2010', clientVersion: 'test', meta: { code: '23505' } }));
    harness.tx.mqttMessage.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce(existing());
    expect(await harness.service.receive(packet(), receivedAt)).toEqual({ outcome: 'DUPLICATE', id: 'existing-id' });
    expect(harness.transaction).toHaveBeenCalledTimes(2);
  });
  it('outro SQLSTATE não entra em retry de unicidade nem expõe causa', async () => {
    harness.tx.mqttMessage.create.mockRejectedValueOnce(new Prisma.PrismaClientKnownRequestError('CANARY_SECRET',
      { code: 'P2010', clientVersion: 'test', meta: { code: '23514' } }));
    await expect(harness.service.receive(packet(), receivedAt)).rejects.toThrow('MQTT_PERSISTENCE_FAILED');
    expect(harness.transaction).toHaveBeenCalledTimes(1);
  });
});
