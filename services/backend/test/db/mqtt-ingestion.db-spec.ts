// Ensaia serviços reais de ingestão, concorrência e rollback somente no PostgreSQL sintético local.
import { Prisma } from '@prisma/client';
import { IPublishPacket } from 'mqtt';
import { PrismaService } from '../../src/prisma/prisma.service';
import { EnergySummaryService } from '../../src/modules/data/energy-summary.service';
import { MqttReceptionService } from '../../src/modules/mqtt/mqtt-reception.service';
import { MqttPipelineService } from '../../src/modules/mqtt/mqtt-pipeline.service';
import { TelemetryMessage } from '../../src/modules/mqtt/mqtt-contract';
import { createFixture, envelope, removeFixture, RehearsalFixture, requireLocalDatabase } from '../mqtt/fixtures';

/** Serializa pacote v1 sem alterar campos de identidade ou timestamps do exemplo. */
function packet(message: TelemetryMessage): IPublishPacket {
  return { cmd: 'publish', topic: `vers/v1/devices/${message.deviceUid}/telemetry`, payload: Buffer.from(JSON.stringify(message)),
    qos: 1, retain: false, dup: false };
}

/** Lê JSONB como texto para conferir precisão sem passar pelo codec JSON arredondado do Prisma. */
async function readPayload(prisma: PrismaService, id: string): Promise<unknown> {
  const [row] = await prisma.$queryRaw<{ text: string }[]>`SELECT payload::text AS text FROM mqtt_messages WHERE id = ${id}::uuid`;
  return JSON.parse(row.text);
}

describe('ingestão real no PostgreSQL isolado', () => {
  const prisma = new PrismaService();
  const summaries = new EnergySummaryService(prisma);
  const reception = new MqttReceptionService(prisma, summaries);
  let f: RehearsalFixture;
  beforeAll(async () => { requireLocalDatabase(); await prisma.$connect(); });
  beforeEach(async () => { f = await createFixture(prisma); });
  afterEach(async () => { if (f) await removeFixture(prisma, f); });
  afterAll(async () => { reception.onModuleDestroy(); await prisma.$disconnect(); });

  it('serializa recepção e processamento concorrentes sem duplicar bruto, amostras ou energia', async () => {
    const source = envelope(f); const incoming = packet(source);
    const receipts = await Promise.all([reception.receive(incoming, new Date()), reception.receive(incoming, new Date())]);
    expect(receipts.map((row) => row.outcome).sort()).toEqual(['DUPLICATE', 'RECEIVED']);
    expect(receipts[0].id).toBe(receipts[1].id); const id = receipts[0].id!;
    const results = await Promise.all([reception.process(id), reception.process(id), summaries.recomputeTest(f.testId)]);
    expect(results.slice(0, 2).map((row) => row && 'outcome' in row ? row.outcome : null).sort())
      .toEqual(['ALREADY_PROCESSED', 'PROCESSED']);
    expect(await prisma.mqttMessage.count({ where: { deviceId: f.deviceId } })).toBe(1);
    expect(await prisma.telemetrySample.count({ where: { messageId: id } })).toBe(3);
    const rows = await prisma.energySummary.findMany({ where: { testId: f.testId, periodType: 'TEST' } });
    expect(rows).toHaveLength(1); expect(rows[0].recoveredEnergyWh).toBeCloseTo(4 / 3600, 12);
    await expect(prisma.mqttMessage.update({ where: { id }, data: { payload: {} } })).rejects.toThrow();
    expect(await readPayload(prisma, id)).toEqual(source);
  });

  it('colisão global entre dispositivos exercita 23505 e reconsulta em transação nova', async () => {
    const other = await createFixture(prisma); let arrived = 0; let release!: () => void;
    const gate = new Promise<void>((resolveGate) => { release = resolveGate; });
    const sqlErrors: string[] = [];
    const observed = { $transaction: async (fn: (tx: Prisma.TransactionClient) => Promise<unknown>, options: object): Promise<unknown> =>
      prisma.$transaction(async (tx) => fn(new Proxy(tx, { get(target, property): unknown {
        if (property !== '$queryRaw') return Reflect.get(target, property);
        return async (query: TemplateStringsArray, ...values: unknown[]): Promise<unknown> => {
          if (query.join(' ').includes('INSERT INTO mqtt_messages')) {
            if (++arrived === 2) release(); await gate;
          }
          try { return await target.$queryRaw(query, ...values); }
          catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) sqlErrors.push(String(error.meta?.code));
            throw error;
          }
        };
      } })), options) };
    const concurrent = new MqttReceptionService(observed as PrismaService, summaries);
    try {
      const one = envelope(f); const two = envelope(other); two.messageId = one.messageId;
      const outcomes = await Promise.all([concurrent.receive(packet(one), new Date()), concurrent.receive(packet(two), new Date())]);
      expect(outcomes.map((row) => row.outcome).sort()).toEqual(['RECEIVED', 'REJECTED']);
      expect(sqlErrors).toContain('23505');
      expect(await prisma.mqttMessage.count({ where: { messageId: one.messageId } })).toBe(1);
    } finally { concurrent.onModuleDestroy(); await removeFixture(prisma, other); }
  });

  it('rollback após gravar resumos desfaz amostras e resumos, permitindo retomar em nova instância', async () => {
    const receipt = await reception.receive(packet(envelope(f)), new Date());
    class FailingSummary extends EnergySummaryService {
      /** Injeta falha após escritas reais para provar o rollback transacional. */
      override async recomputeMessage(id: string, tx?: Prisma.TransactionClient): Promise<void> {
        await super.recomputeMessage(id, tx); throw new Error('Falha sintética após resumo.');
      }
    }
    const failing = new MqttReceptionService(prisma, new FailingSummary(prisma));
    await expect(failing.process(receipt.id!)).rejects.toThrow('MQTT_PROCESSING_FAILED');
    expect(await prisma.telemetrySample.count({ where: { messageId: receipt.id! } })).toBe(0);
    expect(await prisma.energySummary.count({ where: { installationId: f.installationId } })).toBe(0);
    expect((await prisma.mqttMessage.findUniqueOrThrow({ where: { id: receipt.id! } })).status).toBe('RECEIVED');
    const restarted = new MqttReceptionService(prisma, new EnergySummaryService(prisma));
    const pipeline = new MqttPipelineService(prisma, restarted, summaries,
      { onModuleDestroy: async (): Promise<void> => {} } as never);
    try {
      expect(await pipeline.recover()).toMatchObject({ failed: 0 });
      expect(await prisma.telemetrySample.count({ where: { messageId: receipt.id! } })).toBe(3);
      expect((await prisma.mqttMessage.findUniqueOrThrow({ where: { id: receipt.id! } })).status).toBe('PROCESSED');
    } finally { await pipeline.onModuleDestroy(); restarted.onModuleDestroy(); failing.onModuleDestroy(); }
  });

  it('falha depois de PROCESSED mas antes do commit deixa bruto RECEIVED e nenhum derivado', async () => {
    const receipt = await reception.receive(packet(envelope(f)), new Date());
    const failingPrisma = { $transaction: async (fn: (tx: Prisma.TransactionClient) => Promise<unknown>): Promise<unknown> =>
      prisma.$transaction(async (tx) => { await fn(tx); throw new Error('Falha sintética antes do commit.'); }) };
    const failing = new MqttReceptionService(failingPrisma as PrismaService, summaries);
    await expect(failing.process(receipt.id!)).rejects.toThrow('MQTT_PROCESSING_FAILED');
    expect(await prisma.telemetrySample.count({ where: { messageId: receipt.id! } })).toBe(0);
    expect(await prisma.energySummary.count({ where: { installationId: f.installationId } })).toBe(0);
    expect((await prisma.mqttMessage.findUniqueOrThrow({ where: { id: receipt.id! } })).status).toBe('RECEIVED');
    failing.onModuleDestroy(); await reception.process(receipt.id!);
  });

  it('duplicata divergente não altera o bruto já aceito', async () => {
    const source = envelope(f); const receipt = await reception.receive(packet(source), new Date());
    const changed = { ...source, samples: [{ ...source.samples[0], measurements: { voltageV: 99 } }] };
    expect(await reception.receive(packet(changed), new Date())).toEqual({ outcome: 'REJECTED', id: null });
    expect(await readPayload(prisma, receipt.id!)).toEqual(source);
  });

  it('preserva doubles adjacentes no bruto e não confunde alteração mínima com retransmissão', async () => {
    const source = envelope(f); source.samples = [source.samples[1]]; source.capturedAt = source.samples[0].capturedAt;
    source.samples[0].measurements.accumulatedEnergyWh = 10.000555555555556;
    const receipt = await reception.receive(packet(source), new Date());
    const rows = await prisma.$queryRaw<{ value: string }[]>`
      SELECT payload #>> '{samples,0,measurements,accumulatedEnergyWh}' AS value
      FROM mqtt_messages WHERE id = ${receipt.id!}::uuid`;
    expect(rows[0].value).toBe('10.000555555555556');
    expect(await reception.receive(packet(source), new Date())).toEqual({ outcome: 'DUPLICATE', id: receipt.id });
    const changed = structuredClone(source); changed.samples[0].measurements.accumulatedEnergyWh = Number('10.000555555555558');
    expect(await reception.receive(packet(changed), new Date())).toEqual({ outcome: 'REJECTED', id: null });
    await reception.process(receipt.id!);
    const [storedFloat] = await prisma.$queryRaw<{ value: string }[]>`
      SELECT accumulated_energy_wh::text AS value FROM telemetry_samples WHERE message_id = ${receipt.id!}::uuid`;
    expect(Number(storedFloat.value)).toBeCloseTo(10.000555555555556, 12);
    const sample = await prisma.telemetrySample.findFirstOrThrow({ where: { messageId: receipt.id! } });
    expect(sample.accumulatedEnergyWh).toBeCloseTo(10.000555555555556, 12);
  });

  it('amostra atrasada na fronteira UTC corrige as duas horas sem aumentar energia', async () => {
    await prisma.test.update({ where: { id: f.testId }, data: { startedAt: new Date('2026-09-30T23:59:00Z') } });
    const source = envelope(f); source.capturedAt = '2026-09-30T23:59:30.000Z';
    source.samples = [{ capturedAt: source.capturedAt, measurements: { voltageV: 4, currentA: 0.5, accumulatedEnergyWh: 0 } },
      { capturedAt: '2026-10-01T00:00:30.000Z', measurements: { voltageV: 4, currentA: 0.5, accumulatedEnergyWh: 0.1 } }];
    await reception.process((await reception.receive(packet(source), new Date())).id!);
    const before = await prisma.energySummary.findMany({ where: { installationId: f.installationId, periodType: 'HOUR' }, orderBy: { periodStart: 'asc' } });
    expect(before.map((row) => row.recoveredEnergyWh)).toEqual([0.05, 0.05]);
    const late = envelope(f, 2); late.capturedAt = '2026-10-01T00:00:00.000Z';
    late.samples = [{ capturedAt: late.capturedAt, measurements: { voltageV: 4, currentA: 0.5, accumulatedEnergyWh: 0.02 } }];
    await reception.process((await reception.receive(packet(late), new Date())).id!);
    const after = await prisma.energySummary.findMany({ where: { installationId: f.installationId, periodType: 'HOUR' }, orderBy: { periodStart: 'asc' } });
    expect(after.map((row) => row.id)).toEqual(before.map((row) => row.id));
    expect(after[0].recoveredEnergyWh).toBeCloseTo(0.02, 12); expect(after[1].recoveredEnergyWh).toBeCloseTo(0.08, 12);
    expect(after.reduce((sum, row) => sum + row.recoveredEnergyWh, 0)).toBeCloseTo(0.1, 12);
  });

  it('preserva null/zero e leituras externas/futuras sem contabilizar no teste', async () => {
    const source = envelope(f); source.samples = [
      { capturedAt: source.capturedAt, measurements: {} },
      { capturedAt: '2026-10-01T00:00:01.000Z', measurements: { voltageV: 4, currentA: 0, accumulatedEnergyWh: 0 } },
      { capturedAt: '2026-10-01T00:00:02.000Z', measurements: { voltageV: 4, currentA: null, accumulatedEnergyWh: 0 } },
      { capturedAt: '2026-10-01T00:01:01.000Z', measurements: { voltageV: 4, currentA: 0.5, accumulatedEnergyWh: 1 } },
      { capturedAt: '2026-10-01T00:01:02.000Z', measurements: { voltageV: 4, currentA: 0.5, accumulatedEnergyWh: 1.1 } },
    ];
    const receipt = await reception.receive(packet(source), new Date('2026-10-01T00:01:01.500Z'));
    await reception.process(receipt.id!);
    const rows = await prisma.telemetrySample.findMany({ where: { messageId: receipt.id! }, orderBy: { sampleIndex: 'asc' } });
    expect(rows[0]).toMatchObject({ voltageV: null, currentA: null, quality: 'PARTIAL' });
    expect(rows[1]).toMatchObject({ powerW: 0, currentA: 0, quality: 'VALID' });
    expect(rows[3]).toMatchObject({ testId: null, installationId: f.installationId, quality: 'VALID' });
    expect(rows[4]).toMatchObject({ testId: null, quality: 'SUSPECT', powerW: 2 });
    expect((await prisma.energySummary.findFirstOrThrow({ where: { testId: f.testId, periodType: 'TEST' } })).recoveredEnergyWh).toBe(0);
  });

  it.each(['device', 'test'])('revalida %s revogado/cancelado antes de normalizar', async (target) => {
    const receipt = await reception.receive(packet(envelope(f)), new Date());
    if (target === 'device') await prisma.device.update({ where: { id: f.deviceId }, data: { status: 'REVOKED', revokedAt: new Date() } });
    else await prisma.test.update({ where: { id: f.testId }, data: { status: 'CANCELLED' } });
    expect(await reception.process(receipt.id!)).toMatchObject({ outcome: 'REJECTED' });
    expect(await prisma.telemetrySample.count({ where: { messageId: receipt.id! } })).toBe(0);
    expect((await prisma.mqttMessage.findUniqueOrThrow({ where: { id: receipt.id! } })).status).toBe('REJECTED');
  });
});
