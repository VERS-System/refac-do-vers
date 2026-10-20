// Verifica recomputação e escopo de escrita com Prisma simulado, sem alegar concorrência real.
import { EnergySummary, Prisma } from '@prisma/client';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { createTelemetryFixtures } from './fixtures/telemetry.fixtures';
import { EnergySummaryService } from './energy-summary.service';

/** Cria doubles novos por teste e resultados de escrita no formato da persistência. */
function setup(): {
  service: EnergySummaryService;
  tx: ReturnType<typeof transactionDouble>;
  transaction: jest.Mock;
  parent: { id: string; installationId: string | null; vehicleId: string | null;
    status: string; startedAt: Date | null; endedAt: Date | null };
  summary: EnergySummary;
} {
  const samples = createTelemetryFixtures().regular.samples;
  const parent = { id: samples[0].testId!, installationId: samples[0].installationId,
    vehicleId: '00000000-0000-4000-8000-000000000101', status: 'COMPLETED',
    startedAt: samples[0].capturedAt as Date | null, endedAt: samples[2].capturedAt as Date | null };
  const summary: EnergySummary = { id: 'summary', installationId: parent.installationId,
    testId: parent.id, periodType: 'TEST', periodStart: samples[0].capturedAt,
    periodEnd: samples[2].capturedAt, recoveredEnergyWh: 0.3, vehicleEnergyUsedWh: null,
    averagePowerW: 3.5, peakPowerW: 4, moneySaved: null, currencyCode: null,
    energyTariffPerKwh: null, sampleCount: 2, quality: 'GOOD', calculationVersion: 1,
    calculatedAt: new Date(), createdAt: new Date() };
  const tx = transactionDouble();
  tx.test.findUnique.mockResolvedValue(parent);
  tx.versInstallation.findUnique.mockResolvedValue({ vehicleId: parent.vehicleId });
  tx.telemetrySample.findMany.mockResolvedValue(samples);
  tx.energySummary.create.mockResolvedValue(summary);
  tx.energySummary.update.mockResolvedValue(summary);
  const transaction = jest.fn(async (fn: (client: typeof tx) => Promise<unknown>): Promise<unknown> => fn(tx));
  return { service: new EnergySummaryService({ $transaction: transaction } as unknown as PrismaService),
    tx, transaction, parent, summary };
}

/** Expõe somente as operações usadas pelo serviço para testar filtros, ordem e falhas. */
function transactionDouble(): {
  $queryRaw: jest.Mock;
  test: { findUnique: jest.Mock };
  versInstallation: { findUnique: jest.Mock };
  telemetrySample: { groupBy: jest.Mock; findMany: jest.Mock; aggregate: jest.Mock };
  energySummary: { findFirst: jest.Mock; create: jest.Mock; update: jest.Mock; deleteMany: jest.Mock };
} {
  return { $queryRaw: jest.fn().mockResolvedValue([{ id: 'locked' }]),
    test: { findUnique: jest.fn() }, versInstallation: { findUnique: jest.fn() },
    telemetrySample: { groupBy: jest.fn().mockResolvedValue([]), findMany: jest.fn(),
      aggregate: jest.fn().mockResolvedValue({ _min: { capturedAt: null }, _max: { capturedAt: null } }) },
    energySummary: { findFirst: jest.fn().mockResolvedValue(null), create: jest.fn(),
      update: jest.fn(), deleteMany: jest.fn().mockResolvedValue({ count: 1 }) } };
}

describe('recomputação de resumos', () => {
  it('emite IDs reconsultados somente depois do commit próprio', async () => {
    const { service, tx, transaction, parent, summary } = setup();
    const listener = jest.fn(); service.events.on('summary.test-recomputed', listener);
    let commit!: () => void; let prepared!: () => void;
    const ready = new Promise<void>((resolve) => { prepared = resolve; });
    transaction.mockImplementationOnce(async (fn: (client: typeof tx) => Promise<unknown>) => {
      const result = await fn(tx); expect(listener).not.toHaveBeenCalled();
      await new Promise<void>((resolve) => { commit = resolve; prepared(); }); return result;
    });
    tx.test.findUnique.mockResolvedValueOnce(parent).mockResolvedValue({ ...parent, installationId: null });
    const pending = service.recomputeTest(parent.id);
    await ready;
    expect(listener).not.toHaveBeenCalled(); commit(); expect(await pending).toBe(summary);
    expect(listener).toHaveBeenCalledWith({ version: 1, type: 'summary.test-recomputed',
      testId: parent.id, installationId: null });
  });
  it('rollback após escrita não emite e transação externa não antecipa aviso', async () => {
    const { service, tx, transaction, parent } = setup();
    const listener = jest.fn(); service.events.on('summary.test-recomputed', listener);
    transaction.mockImplementationOnce(async (fn: (client: typeof tx) => Promise<unknown>) => {
      await fn(tx); throw new Error('rollback');
    });
    await expect(service.recomputeTest(parent.id)).rejects.toThrow('rollback');
    await service.recomputeTest(parent.id, tx as never); expect(listener).not.toHaveBeenCalled();
    parent.status = 'RUNNING'; await service.recomputeTest(parent.id); expect(listener).not.toHaveBeenCalled();
  });
  it('remoção de resumo sem delta também invalida teste e instalação', async () => {
    const { service, tx, parent } = setup(); const listener = jest.fn();
    service.events.on('summary.test-recomputed', listener);
    tx.telemetrySample.findMany.mockResolvedValue(createTelemetryFixtures().absent.samples);
    expect(await service.recomputeTest(parent.id)).toBeNull();
    expect(listener).toHaveBeenCalledWith({ version: 1, type: 'summary.test-recomputed',
      testId: parent.id, installationId: parent.installationId });
  });
  it('isola listeners sync/async e preserva once e resultado confirmado', async () => {
    const { service, parent, summary } = setup(); const listener = jest.fn();
    const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    try {
      service.events.on('summary.test-recomputed', () => { throw new Error('CANARY_SECRET'); });
      service.events.on('summary.test-recomputed', async () => { throw new Error('CANARY_SECRET'); });
      service.events.once('summary.test-recomputed', listener);
      expect(await service.recomputeTest(parent.id)).toBe(summary);
      await service.recomputeTest(parent.id); await Promise.resolve();
      expect(listener).toHaveBeenCalledTimes(1);
      expect(warn).toHaveBeenCalledWith('summary_event_failed');
      expect(JSON.stringify(warn.mock.calls)).not.toContain('CANARY_SECRET');
    } finally { warn.mockRestore(); }
  });
  it('calcula TEST encerrado depois dos locks, com projeção e chave da versão ativa', async () => {
    const { service, tx, transaction, parent } = setup();
    await service.recomputeTest(parent.id);
    expect(transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });
    expect(tx.$queryRaw.mock.calls.map(([sql]) => (sql as TemplateStringsArray).join(' '))).toEqual([
      expect.stringContaining('FROM vehicles'), expect.stringContaining('FROM vers_installations'),
      expect.stringContaining('FROM tests')]);
    expect(Math.max(...tx.$queryRaw.mock.invocationCallOrder)).toBeLessThan(tx.telemetrySample.findMany.mock.invocationCallOrder[0]);
    expect(tx.energySummary.findFirst).toHaveBeenCalledWith({ where: { testId: parent.id,
      periodType: 'TEST', periodStart: parent.startedAt, calculationVersion: 1 } });
    const { data } = tx.energySummary.create.mock.calls[0][0];
    expect(data).toMatchObject({ installationId: parent.installationId, testId: parent.id,
      periodType: 'TEST', periodStart: parent.startedAt, periodEnd: parent.endedAt,
      sampleCount: 2, quality: 'GOOD', vehicleEnergyUsedWh: null, moneySaved: null,
      energyTariffPerKwh: null, currencyCode: null, calculationVersion: 1 });
    expect(data.recoveredEnergyWh).toBeCloseTo(0.3);
    expect(data).not.toHaveProperty('estimatedEnergyWh');
    expect(tx.telemetrySample.findMany.mock.calls[0][0].select).not.toHaveProperty('createdAt');
  });
  it.each(['PLANNED', 'RUNNING'])('não cria TEST em %s', async (status) => {
    const { service, tx, parent } = setup();
    parent.status = status;
    expect(await service.recomputeTest(parent.id)).toBeNull();
    expect(tx.telemetrySample.findMany).not.toHaveBeenCalled();
    expect(tx.energySummary.create).not.toHaveBeenCalled();
  });
  it.each(['FAILED', 'CANCELLED'])('gera TEST encerrado em %s com datas válidas', async (status) => {
    const { service, tx, parent } = setup();
    parent.status = status;
    await service.recomputeTest(parent.id);
    expect(tx.energySummary.create).toHaveBeenCalledTimes(1);
  });
  it('não cria período vazio ou teste sem horários', async () => {
    const { service, tx, parent } = setup();
    parent.endedAt = parent.startedAt;
    expect(await service.recomputeTest(parent.id)).toBeNull();
    parent.startedAt = null;
    expect(await service.recomputeTest(parent.id)).toBeNull();
    expect(tx.energySummary.create).not.toHaveBeenCalled();
  });
  it('recomputa na mesma identidade e incorpora amostra atrasada sem nova linha', async () => {
    const { service, tx, parent, summary } = setup();
    await service.recomputeTest(parent.id);
    tx.energySummary.findFirst.mockResolvedValue(summary);
    const samples = createTelemetryFixtures().regular.samples;
    samples[1].accumulatedEnergyWh = 0;
    tx.telemetrySample.findMany.mockResolvedValue(samples);
    await service.recomputeTest(parent.id);
    expect(tx.energySummary.create).toHaveBeenCalledTimes(1);
    expect(tx.energySummary.update).toHaveBeenCalledWith({ where: { id: summary.id },
      data: expect.objectContaining({ recoveredEnergyWh: 10.3, quality: 'PARTIAL', calculatedAt: expect.any(Date) }) });
  });
  it('remove apenas a chave ativa quando não existe delta, sem zero artificial', async () => {
    const { service, tx, parent } = setup();
    tx.telemetrySample.findMany.mockResolvedValue(createTelemetryFixtures().absent.samples);
    expect(await service.recomputeTest(parent.id)).toBeNull();
    expect(tx.energySummary.deleteMany).toHaveBeenCalledWith({ where: { testId: parent.id,
      periodType: 'TEST', periodStart: parent.startedAt, calculationVersion: 1 } });
    expect(tx.energySummary.create).not.toHaveBeenCalled();
  });
  it('preserva resumo histórico quando falta proveniência, mesmo havendo outras amostras válidas', async () => {
    const { service, tx, parent, summary } = setup();
    const samples = createTelemetryFixtures().regular.samples;
    samples[1].deviceId = null;
    tx.telemetrySample.findMany.mockResolvedValue(samples);
    tx.energySummary.findFirst.mockResolvedValue(summary);
    expect(await service.recomputeTest(parent.id)).toBe(summary);
    expect(tx.energySummary.update).not.toHaveBeenCalled();
    expect(tx.energySummary.deleteMany).not.toHaveBeenCalled();
  });
  it('permite TEST histórico sem instalação conhecida, bloqueando apenas o teste', async () => {
    const { service, tx, parent } = setup();
    parent.installationId = null;
    parent.vehicleId = null;
    await service.recomputeTest(parent.id);
    expect(tx.$queryRaw).toHaveBeenCalledTimes(1);
    expect(tx.energySummary.create.mock.calls[0][0].data.installationId).toBeNull();
  });
  it('origem removida distante não congela recomputação de um período novo', async () => {
    const { service, tx, parent } = setup();
    const samples = createTelemetryFixtures().regular.samples;
    samples.push({ ...samples[0], id: 'old', sampleIndex: 3, deviceId: null,
      capturedAt: new Date('2025-01-01T00:00:00Z') });
    tx.telemetrySample.findMany.mockResolvedValue(samples);
    await service.recomputePeriod(parent.installationId!, 'HOUR', new Date('2026-10-13T00:00:00Z'));
    expect(tx.energySummary.create).toHaveBeenCalledTimes(1);
  });
  it('reconsulta o teste após os locks, sem usar metadados históricos desatualizados', async () => {
    const { service, tx, parent } = setup();
    tx.test.findUnique.mockResolvedValueOnce(parent).mockResolvedValue({ ...parent, installationId: null, vehicleId: null });
    await service.recomputeTest(parent.id);
    expect(tx.energySummary.create.mock.calls[0][0].data.installationId).toBeNull();
  });
  it('recusa teste removido antes da recomputação', async () => {
    const { service, tx, parent } = setup();
    tx.test.findUnique.mockResolvedValue(null);
    await expect(service.recomputeTest(parent.id)).rejects.toMatchObject({ response: { code: 'TEST_NOT_FOUND' } });
    expect(tx.energySummary.create).not.toHaveBeenCalled();
  });
  it.each([
    ['HOUR', '2026-10-13T00:00:00.000Z', '2026-10-13T01:00:00.000Z'],
    ['DAY', '2026-10-13T00:00:00.000Z', '2026-10-14T00:00:00.000Z'],
    ['MONTH', '2028-02-01T00:00:00.000Z', '2028-03-01T00:00:00.000Z'],
  ] as const)('gera %s UTC com chave da instalação sem testId', async (periodType, start, end) => {
    const { service, tx, parent } = setup();
    await service.recomputePeriod(parent.installationId!, periodType, new Date(start));
    expect(tx.$queryRaw).toHaveBeenCalledTimes(2);
    expect(tx.energySummary.findFirst.mock.calls[0][0].where).toEqual({ installationId: parent.installationId,
      testId: null, periodType, periodStart: new Date(start), calculationVersion: 1 });
    expect(tx.telemetrySample.groupBy.mock.calls[1][0].where.capturedAt).toEqual({ gt: new Date(end) });
  });
  it('carrega vizinhos por origem incluindo empates, sem transferir todo o histórico', async () => {
    const { service, tx, parent } = setup();
    const capturedAt = new Date('2026-10-12T23:59:30Z');
    tx.telemetrySample.groupBy.mockResolvedValueOnce([{ deviceId: 'device', testId: parent.id, _max: { capturedAt } }]);
    await service.recomputePeriod(parent.installationId!, 'HOUR', new Date('2026-10-13T00:00:00Z'));
    expect(tx.telemetrySample.findMany.mock.calls[0][0].where).toEqual({ installationId: parent.installationId,
      OR: [{ capturedAt: { gte: new Date('2026-10-13T00:00:00Z'), lte: new Date('2026-10-13T01:00:00Z') } },
        { deviceId: 'device', testId: parent.id, capturedAt }] });
  });
  it('recusa instalação removida ou desaparecida durante o lock', async () => {
    const { service, tx, parent } = setup();
    tx.versInstallation.findUnique.mockResolvedValue(null);
    await expect(service.recomputePeriod(parent.installationId!, 'DAY', new Date('2026-10-13Z')))
      .rejects.toMatchObject({ response: { code: 'INSTALLATION_NOT_FOUND' } });
    expect(tx.telemetrySample.findMany).not.toHaveBeenCalled();
  });
  it.each(['2026-10-13T00:00:01Z', 'invalid'])('recusa início não alinhado %s', async (start) => {
    const { service, transaction, parent } = setup();
    await expect(service.recomputePeriod(parent.installationId!, 'HOUR', new Date(start))).rejects.toThrow(RangeError);
    expect(transaction).not.toHaveBeenCalled();
  });
  it('propaga falha de persistência para abortar a transação', async () => {
    const { service, tx, parent } = setup();
    tx.energySummary.create.mockRejectedValue(new Error('write failed'));
    await expect(service.recomputeTest(parent.id)).rejects.toThrow('write failed');
    expect(tx.energySummary.update).not.toHaveBeenCalled();
  });

  it('recompõe mensagem e TEST/HOUR/DAY/MONTH dentro da transação da ingestão', async () => {
    const { service, tx, transaction, parent } = setup();
    await service.recomputeMessage('message', tx as never);
    expect(transaction).not.toHaveBeenCalled();
    const keys = tx.energySummary.findFirst.mock.calls.map(([query]) => query.where);
    expect(keys.map((key) => key.periodType).sort()).toEqual(['DAY', 'HOUR', 'MONTH', 'TEST']);
    expect(keys.find((key) => key.periodType === 'TEST').testId).toBe(parent.id);
    expect(keys.filter((key) => key.periodType !== 'TEST').every((key) =>
      key.installationId === parent.installationId && key.testId === null)).toBe(true);
  });
  it('recalcula horas intermediárias afetadas por vizinhos, inclusive virada do mês UTC', async () => {
    const { service, tx } = setup();
    const samples = createTelemetryFixtures().regular.samples.map((row, index) => ({ ...row,
      capturedAt: new Date(Date.UTC(2026, 9, 1, 0, 0, index)) }));
    tx.telemetrySample.findMany.mockResolvedValue(samples);
    tx.telemetrySample.aggregate.mockResolvedValueOnce({ _max: { capturedAt: new Date('2026-09-30T22:59:59Z') } })
      .mockResolvedValueOnce({ _min: { capturedAt: new Date('2026-10-01T02:00:01Z') } });
    await service.recomputeMessage('message', tx as never);
    const keys = tx.energySummary.findFirst.mock.calls.map(([query]) => query.where);
    expect(keys.filter((key) => key.periodType === 'HOUR').map((key) => key.periodStart.toISOString())).toEqual([
      '2026-09-30T22:00:00.000Z', '2026-09-30T23:00:00.000Z', '2026-10-01T00:00:00.000Z',
      '2026-10-01T01:00:00.000Z', '2026-10-01T02:00:00.000Z']);
    expect(keys.filter((key) => key.periodType === 'MONTH').map((key) => key.periodStart.toISOString()))
      .toEqual(['2026-09-01T00:00:00.000Z', '2026-10-01T00:00:00.000Z']);
    expect(tx.telemetrySample.aggregate.mock.calls[0][0].where).toMatchObject({
      installationId: samples[0].installationId, deviceId: samples[0].deviceId, testId: samples[0].testId,
      capturedAt: { lt: samples[0].capturedAt } });
  });
  it('reparo de mensagem processada usa uma transação própria e conserva a identidade do resumo', async () => {
    const { service, tx, transaction, summary } = setup();
    tx.energySummary.findFirst.mockResolvedValue(summary);
    await service.recomputeMessage('message');
    expect(transaction).toHaveBeenCalledTimes(1); expect(tx.energySummary.create).not.toHaveBeenCalled();
    expect(tx.energySummary.update).toHaveBeenCalled();
  });
  it('mensagem sem amostras não fabrica resumo nem abre locks de origem', async () => {
    const { service, tx } = setup(); tx.telemetrySample.findMany.mockResolvedValue([]);
    await service.recomputeMessage('message', tx as never);
    expect(tx.$queryRaw).not.toHaveBeenCalled(); expect(tx.energySummary.findFirst).not.toHaveBeenCalled();
  });
  it('cada origem mantém seus próprios vizinhos e testId null não é agrupado com teste', async () => {
    const { service, tx } = setup(); const samples = createTelemetryFixtures().regular.samples;
    samples[1].testId = null; tx.telemetrySample.findMany.mockResolvedValue(samples);
    await service.recomputeMessage('message', tx as never);
    const sources = tx.telemetrySample.aggregate.mock.calls.map(([query]) => query.where.testId);
    expect(sources).toContain(null); expect(sources).toContain(samples[0].testId);
  });
  it('falha durante um período aborta antes de concluir os demais', async () => {
    const { service, tx } = setup(); tx.energySummary.create.mockRejectedValue(new Error('summary failed'));
    await expect(service.recomputeMessage('message', tx as never)).rejects.toThrow('summary failed');
    expect(tx.energySummary.create).toHaveBeenCalledTimes(1);
  });
  it('amostra atrasada na fronteira redistribui energia usando contador sem duplicar total', async () => {
    const { service, tx, parent } = setup();
    const times = ['2026-09-30T23:59:30Z', '2026-10-01T00:00:00Z', '2026-10-01T00:00:30Z'];
    const counters = [0, 0.02, 0.1];
    const samples = createTelemetryFixtures().regular.samples.map((row, index) => ({ ...row,
      capturedAt: new Date(times[index]), accumulatedEnergyWh: counters[index] }));
    parent.startedAt = samples[0].capturedAt; parent.endedAt = samples[2].capturedAt;
    tx.telemetrySample.findMany.mockResolvedValueOnce([samples[1]]).mockResolvedValue(samples);
    tx.telemetrySample.aggregate.mockResolvedValueOnce({ _max: { capturedAt: samples[0].capturedAt } })
      .mockResolvedValueOnce({ _min: { capturedAt: samples[2].capturedAt } });
    await service.recomputeMessage('late-message', tx as never);
    const hours = tx.energySummary.create.mock.calls.map(([query]) => query.data).filter((row) => row.periodType === 'HOUR');
    expect(hours).toHaveLength(2);
    expect(hours[0].recoveredEnergyWh).toBeCloseTo(0.02, 12);
    expect(hours[1].recoveredEnergyWh).toBeCloseTo(0.08, 12);
    expect(hours.reduce((sum, row) => sum + row.recoveredEnergyWh, 0)).toBeCloseTo(0.1, 12);
  });
});
