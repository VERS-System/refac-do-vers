// Verifica revalidação e escrita atômica de amostras/estado com transações simuladas.
import { Prisma } from '@prisma/client';
import { MqttReceptionService } from './mqtt-reception.service';
import { TelemetryMessage } from './mqtt-contract';
import { EnergySummaryService } from '../data/energy-summary.service';

const now = new Date('2026-10-14T12:00:10.000Z');
const id = '00000000-0000-4000-8000-000000000701';
const device = { id: '00000000-0000-4000-8000-000000000601',
  vehicleId: '00000000-0000-4000-8000-000000000101', installationId: '00000000-0000-4000-8000-000000000201' };
const test = { id: '00000000-0000-4000-8000-000000000501', status: 'COMPLETED',
  startedAt: new Date('2026-10-14T12:00:00.000Z'), endedAt: new Date('2026-10-14T12:00:01.000Z') };

/** Fornece bruto já persistido e independente da associação relacional da recepção. */
function stored(): { id: string; messageId: string; deviceId: string | null; testId: string | null; topic: string;
  schemaVersion: number; sequence: bigint; payload: TelemetryMessage; capturedAt: Date; receivedAt: Date;
  qos: number; retained: boolean; status: string } {
  const samples = [0, 1, 2].map((second) => ({ capturedAt: `2026-10-14T12:00:0${second}.000Z`,
    measurements: { voltageV: 4, currentA: 0.5, accumulatedEnergyWh: second / 1800 } }));
  return { id, messageId: '00000000-0000-4000-8000-000000000702', deviceId: device.id, testId: null,
    topic: 'vers/v1/devices/vers-sim-001/telemetry', schemaVersion: 1, sequence: 1n,
    payload: { schemaVersion: 1, messageId: '00000000-0000-4000-8000-000000000702', deviceUid: 'vers-sim-001',
      testId: test.id, sequence: 1, capturedAt: samples[0].capturedAt, samples },
    capturedAt: new Date(samples[0].capturedAt), receivedAt: now, qos: 1, retained: false, status: 'RECEIVED' };
}

/** Emula somente chamadas/transição final, sem alegar rollback ou concorrência SQL reais. */
function setup(): { service: MqttReceptionService; row: ReturnType<typeof stored>; transaction: jest.Mock;
  summaries: { recomputeMessage: jest.Mock };
  tx: { $queryRaw: jest.Mock; device: { findUnique: jest.Mock }; mqttMessage: { findUnique: jest.Mock; update: jest.Mock };
    telemetrySample: { createMany: jest.Mock } } } {
  const row = stored();
  const tx = { $queryRaw: jest.fn().mockImplementation(async (sql: TemplateStringsArray) => {
    const text = sql.join(' ');
    return text.includes('FROM mqtt_messages') ? [{ id, status: row.status }] :
      text.includes('FROM tests') ? [{ ...test }] : [{ id: 'locked', status: 'ONLINE' }];
  }), device: { findUnique: jest.fn().mockResolvedValue(device) },
  mqttMessage: { findUnique: jest.fn().mockResolvedValue(row), update: jest.fn().mockImplementation(async ({ data }) => {
    Object.assign(row, data); return row;
  }) }, telemetrySample: { createMany: jest.fn().mockResolvedValue({ count: 3 }) } };
  const transaction = jest.fn(async (fn: (value: typeof tx) => Promise<unknown>): Promise<unknown> => fn(tx));
  const summaries = { recomputeMessage: jest.fn().mockResolvedValue(undefined) };
  return { service: new MqttReceptionService({ $transaction: transaction } as never,
    summaries as unknown as EnergySummaryService), row, tx, transaction, summaries };
}

describe('processamento MQTT', () => {
  let h: ReturnType<typeof setup>;
  beforeEach(() => { jest.useFakeTimers(); jest.setSystemTime(now); h = setup(); });
  afterEach(() => { h.service.onModuleDestroy(); jest.useRealTimers(); });

  it('revalida origem/teste e persiste amostras e estado na mesma transação', async () => {
    const before = JSON.stringify(h.row.payload);
    const result = await h.service.process(id);
    expect(result).toMatchObject({ outcome: 'PROCESSED', id, delivery: { delivery: 'CURRENT' },
      associations: ['ASSOCIATED', 'ASSOCIATED', 'OUTSIDE_TEST'] });
    expect(h.transaction).toHaveBeenCalledTimes(1);
    expect(h.transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });
    expect(h.tx.telemetrySample.createMany).toHaveBeenCalledWith({ data: [
      expect.objectContaining({ messageId: id, deviceId: device.id, installationId: device.installationId,
        sampleIndex: 0, testId: test.id, powerW: 2 }),
      expect.objectContaining({ sampleIndex: 1, testId: test.id }),
      expect.objectContaining({ sampleIndex: 2, testId: null, quality: 'VALID' }),
    ] });
    expect(h.tx.mqttMessage.update).toHaveBeenCalledWith({ where: { id }, data: {
      status: 'PROCESSED', processedAt: now, rejectionReason: null, testId: test.id } });
    expect(h.tx.telemetrySample.createMany.mock.invocationCallOrder[0]).toBeLessThan(h.tx.mqttMessage.update.mock.invocationCallOrder[0]);
    expect(JSON.stringify(h.row.payload)).toBe(before);
  });
  it('bloqueia veículo/instalação/dispositivo/teste/mensagem antes da gravação', async () => {
    await h.service.process(id);
    expect(h.tx.$queryRaw.mock.calls.map(([sql]) => (sql as TemplateStringsArray).join(' '))).toEqual([
      expect.stringContaining('FROM vehicles'), expect.stringContaining('FROM vers_installations'),
      expect.stringContaining('FROM devices'), expect.stringContaining('FROM tests'), expect.stringContaining('FROM mqtt_messages')]);
    expect(h.tx.$queryRaw.mock.calls.every(([sql]) => (sql as TemplateStringsArray).join(' ').includes('FOR UPDATE'))).toBe(true);
    expect(h.tx.$queryRaw.mock.invocationCallOrder.at(-1)).toBeLessThan(h.tx.telemetrySample.createMany.mock.invocationCallOrder[0]);
  });
  it('processar duas vezes não duplica amostras nem troca horários', async () => {
    await h.service.process(id);
    const before = { ...h.row };
    expect(await h.service.process(id)).toMatchObject({ outcome: 'ALREADY_PROCESSED', id });
    expect(h.tx.telemetrySample.createMany).toHaveBeenCalledTimes(1); expect(h.tx.mqttMessage.update).toHaveBeenCalledTimes(1);
    expect(h.row).toEqual(before);
  });
  it.each(['PROCESSED', 'REJECTED'])('relê estado %s após lock para não reprocessar decisão concorrente', async (status) => {
    const base = h.tx.$queryRaw.getMockImplementation()!;
    h.tx.$queryRaw.mockImplementation(async (sql: TemplateStringsArray, ...args: unknown[]) =>
      sql.join(' ').includes('FROM mqtt_messages') ? [{ id, status }] : base(sql, ...args));
    expect(await h.service.process(id)).toMatchObject({ outcome: status === 'PROCESSED' ? 'ALREADY_PROCESSED' : 'REJECTED', id });
    expect(h.tx.telemetrySample.createMany).not.toHaveBeenCalled(); expect(h.tx.mqttMessage.update).not.toHaveBeenCalled();
  });
  it('ausência retorna NOT_FOUND sem criar dados', async () => {
    h.tx.mqttMessage.findUnique.mockResolvedValue(null);
    expect(await h.service.process(id)).toEqual({ outcome: 'NOT_FOUND', id });
    expect(h.tx.telemetrySample.createMany).not.toHaveBeenCalled();
  });
  it('sem teste não exige associação e conserva leitura da instalação', async () => {
    h.row.payload.testId = null; await h.service.process(id);
    expect(h.tx.$queryRaw.mock.calls.some(([sql]) => (sql as TemplateStringsArray).join(' ').includes('FROM tests'))).toBe(false);
    expect(h.tx.telemetrySample.createMany.mock.calls[0][0].data.every((row: { testId: string | null }) => row.testId === null)).toBe(true);
  });
  it.each(['PROVISIONING', 'REVOKED'])('não normaliza dispositivo agora %s', async (status) => {
    h.tx.$queryRaw.mockResolvedValueOnce([{ id: 'v' }]).mockResolvedValueOnce([{ id: 'i' }])
      .mockResolvedValueOnce(status === 'REVOKED' ? [] : [{ id: device.id, status }]);
    expect(await h.service.process(id)).toMatchObject({ outcome: 'REJECTED', id });
    expect(h.tx.telemetrySample.createMany).not.toHaveBeenCalled();
    expect(h.tx.mqttMessage.update.mock.calls[0][0].data).toMatchObject({ status: 'REJECTED', testId: null,
      rejectionReason: status === 'REVOKED' ? 'MQTT_DEVICE_UNAVAILABLE' : 'MQTT_DEVICE_NOT_READY' });
  });
  it('não troca identidade de origem quando deviceUid passa a resolver outro registro', async () => {
    h.tx.device.findUnique.mockResolvedValue({ ...device, id: 'another-device' });
    expect(await h.service.process(id)).toMatchObject({ outcome: 'REJECTED' });
    expect(h.tx.telemetrySample.createMany).not.toHaveBeenCalled();
  });
  it.each(['CANCELLED', 'PLANNED'])('não processa teste que agora está %s', async (status) => {
    h.tx.$queryRaw.mockResolvedValueOnce([{ id: 'v' }]).mockResolvedValueOnce([{ id: 'i' }])
      .mockResolvedValueOnce([{ id: device.id, status: 'ONLINE' }]).mockResolvedValueOnce([{ ...test, status }]);
    expect(await h.service.process(id)).toMatchObject({ outcome: 'REJECTED' });
    expect(h.tx.telemetrySample.createMany).not.toHaveBeenCalled();
    expect(h.tx.mqttMessage.update.mock.calls[0][0].data).toMatchObject({ rejectionReason: 'MQTT_TEST_UNAVAILABLE' });
  });
  it.each([{ qos: 0 }, { retained: true }])('não normaliza metadados de transporte incompatíveis %j', async (metadata) => {
    Object.assign(h.row, metadata); await h.service.process(id);
    expect(h.tx.telemetrySample.createMany).not.toHaveBeenCalled();
    expect(h.tx.mqttMessage.update.mock.calls[0][0].data.rejectionReason).toBe('MQTT_TRANSPORT_NOT_ALLOWED');
  });
  it.each([{ sequence: 2n }, { schemaVersion: 2 }, { messageId: 'another-id' },
    { capturedAt: new Date('2026-10-14T11:00:00.000Z') }])('recusa inconsistência com o bruto %#', async (changes) => {
    Object.assign(h.row, changes); await h.service.process(id);
    expect(h.tx.telemetrySample.createMany).not.toHaveBeenCalled();
    expect(h.tx.mqttMessage.update.mock.calls[0][0].data.rejectionReason).toBe('MQTT_INVALID_ENVELOPE');
  });
  it('revalida lote inteiro do bruto antes de criar a primeira amostra', async () => {
    h.row.payload.samples[2].measurements.currentA = -1; await h.service.process(id);
    expect(h.tx.telemetrySample.createMany).not.toHaveBeenCalled();
    expect(h.tx.mqttMessage.update.mock.calls[0][0].data.rejectionReason).toBe('MQTT_INVALID_ENVELOPE');
  });
  it('usa receivedAt original para SUSPECT mesmo processando muito depois', async () => {
    h.row.receivedAt = new Date('2026-10-14T12:00:01.000Z'); jest.setSystemTime(new Date('2026-10-15T00:00:00.000Z'));
    await h.service.process(id);
    expect(h.tx.telemetrySample.createMany.mock.calls[0][0].data.map((row: { quality: string }) => row.quality))
      .toEqual(['VALID', 'VALID', 'SUSPECT']);
  });
  it('falha em createMany não marca mensagem concluída nem oculta erro de unicidade', async () => {
    h.tx.telemetrySample.createMany.mockRejectedValue(new Prisma.PrismaClientKnownRequestError('CANARY_SECRET',
      { code: 'P2002', clientVersion: 'test' }));
    await expect(h.service.process(id)).rejects.toThrow('MQTT_PROCESSING_FAILED');
    expect(h.tx.mqttMessage.update).not.toHaveBeenCalled(); expect(h.row.status).toBe('RECEIVED');
  });
  it('falha na atualização de estado rejeita transação em vez de confirmar processamento', async () => {
    h.tx.mqttMessage.update.mockRejectedValue(new Error('CANARY_SECRET'));
    await expect(h.service.process(id)).rejects.toThrow('MQTT_PROCESSING_FAILED');
    expect(h.transaction).toHaveBeenCalledTimes(1); expect(h.row.status).toBe('RECEIVED');
  });
  it('falha no commit não retorna sucesso', async () => {
    h.transaction.mockImplementation(async (fn: (tx: typeof h.tx) => Promise<unknown>) => {
      await fn(h.tx); throw new Error('CANARY_SECRET');
    });
    await expect(h.service.process(id)).rejects.toThrow('MQTT_PROCESSING_FAILED');
  });
  it('origem removida ou anonimizada não cria amostras com outra identidade', async () => {
    h.row.deviceId = null; h.tx.device.findUnique.mockResolvedValue(null);
    expect(await h.service.process(id)).toEqual({ outcome: 'REJECTED', id });
    expect(h.tx.telemetrySample.createMany).not.toHaveBeenCalled();
    expect(h.tx.mqttMessage.update.mock.calls[0][0].data.rejectionReason).toBe('MQTT_DEVICE_UNAVAILABLE');
  });
  it('mensagem removida antes de obter lock não cria amostras órfãs', async () => {
    const base = h.tx.$queryRaw.getMockImplementation()!;
    h.tx.$queryRaw.mockImplementation(async (sql: TemplateStringsArray, ...args: unknown[]) =>
      sql.join(' ').includes('FROM mqtt_messages') ? [] : base(sql, ...args));
    expect(await h.service.process(id)).toEqual({ outcome: 'NOT_FOUND', id });
    expect(h.tx.telemetrySample.createMany).not.toHaveBeenCalled(); expect(h.tx.mqttMessage.update).not.toHaveBeenCalled();
  });
  it('recompõe resumos após amostras e antes de PROCESSED usando o mesmo client transacional', async () => {
    await h.service.process(id);
    expect(h.summaries.recomputeMessage).toHaveBeenCalledWith(id, h.tx);
    expect(h.tx.telemetrySample.createMany.mock.invocationCallOrder[0]).toBeLessThan(h.summaries.recomputeMessage.mock.invocationCallOrder[0]);
    expect(h.summaries.recomputeMessage.mock.invocationCallOrder[0]).toBeLessThan(h.tx.mqttMessage.update.mock.invocationCallOrder[0]);
  });
  it('falha de resumo impede PROCESSED e retorna erro seguro para abortar a transação', async () => {
    h.summaries.recomputeMessage.mockRejectedValue(new Error('CANARY_SECRET'));
    await expect(h.service.process(id)).rejects.toThrow('MQTT_PROCESSING_FAILED');
    expect(h.tx.mqttMessage.update).not.toHaveBeenCalled(); expect(h.row.status).toBe('RECEIVED');
  });
});
