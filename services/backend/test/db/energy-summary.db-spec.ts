// Ensaia concorrência e rollback de resumos apenas no PostgreSQL sintético da suíte db.
import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../src/prisma/prisma.service';
import { EnergySummaryService } from '../../src/modules/data/energy-summary.service';
import { createTelemetryFixtures } from '../../src/modules/data/fixtures/telemetry.fixtures';

describe('recomputação de energia no PostgreSQL isolado', () => {
  const prisma = new PrismaService();
  const service = new EnergySummaryService(prisma);
  const vehicleId = randomUUID();
  const installationId = randomUUID();
  const deviceId = randomUUID();
  const testId = randomUUID();
  const samples = createTelemetryFixtures().regular.samples.map((row) => ({ ...row,
    id: randomUUID(), messageId: null, deviceId, installationId, testId }));

  // Cria exclusivamente registros sintéticos com referências compatíveis e teste encerrado.
  beforeAll(async () => {
    await prisma.$connect();
    await prisma.$transaction(async (tx) => {
      await tx.vehicle.create({ data: { id: vehicleId, licensePlate: `T${vehicleId.slice(0, 6).toUpperCase()}` } });
      await tx.versInstallation.create({ data: { id: installationId, vehicleId, systemModel: 'VERS-SYNTHETIC', status: 'ACTIVE' } });
      await tx.device.create({ data: { id: deviceId, vehicleId, installationId, deviceUid: `synthetic-${deviceId}` } });
      await tx.test.create({ data: { id: testId, vehicleId, installationId, name: 'Teste sintético', status: 'COMPLETED',
        terrain: 'OTHER', snapshotTestLocation: 'Bancada sintética', snapshotActivePiezoCount: 2,
        snapshotConfigurationVersion: 1, startedAt: samples[0].capturedAt, endedAt: samples[2].capturedAt } });
      await tx.telemetrySample.createMany({ data: samples });
    });
  });

  // Limpa somente IDs deste ensaio; disconnect sempre ocorre mesmo se a limpeza falhar.
  afterAll(async () => {
    try {
      await prisma.$transaction(async (tx) => {
        await tx.energySummary.deleteMany({ where: { OR: [{ testId }, { installationId }] } });
        await tx.telemetrySample.deleteMany({ where: { testId } });
        await tx.test.deleteMany({ where: { id: testId } });
        await tx.vehicle.deleteMany({ where: { id: vehicleId } });
      });
    } finally { await prisma.$disconnect(); }
  });

  it('serializa recomputações simultâneas na mesma linha sem duplicar energia', async () => {
    const results = await Promise.all([service.recomputeTest(testId), service.recomputeTest(testId)]);
    expect(results[0]!.id).toBe(results[1]!.id);
    expect(await prisma.energySummary.count({ where: { testId, periodType: 'TEST', calculationVersion: 1 } })).toBe(1);
    expect(results[1]!.recoveredEnergyWh).toBeCloseTo(0.3);
    expect(results[1]!.sampleCount).toBe(2);
  });

  it('incorpora amostra atrasada usando a mesma chave e versão', async () => {
    const initial = await service.recomputeTest(testId);
    const late = { ...samples[1], id: randomUUID(), sampleIndex: 3,
      capturedAt: new Date(samples[0].capturedAt.getTime() + 30_000), accumulatedEnergyWh: 0,
      createdAt: new Date(samples[2].capturedAt.getTime() + 60_000) };
    try {
      await prisma.telemetrySample.create({ data: late });
      const updated = await service.recomputeTest(testId);
      expect(updated!.id).toBe(initial!.id);
      expect(updated!.recoveredEnergyWh).toBeCloseTo(10.3);
      expect(updated!.quality).toBe('PARTIAL');
    } finally { await prisma.telemetrySample.deleteMany({ where: { id: late.id } }); }
  });

  it('falha após escrever dentro da transação sem modificar o resumo anterior', async () => {
    const initial = await service.recomputeTest(testId);
    const failing = new EnergySummaryService({
      $transaction: async (fn: (tx: Prisma.TransactionClient) => Promise<unknown>): Promise<unknown> =>
        prisma.$transaction(async (tx) => {
          await fn(tx);
          throw new Error('Falha sintética após escrita.');
        }),
    } as unknown as PrismaService);
    await expect(failing.recomputeTest(testId)).rejects.toThrow('Falha sintética após escrita.');
    expect(await prisma.energySummary.findUnique({ where: { id: initial!.id } })).toEqual(initial);
  });
});
