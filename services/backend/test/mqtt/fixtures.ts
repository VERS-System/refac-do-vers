// Cria e remove somente entidades sintéticas do PostgreSQL local obrigatório do ensaio.
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../src/prisma/prisma.service';
import { TelemetryMessage } from '../../src/modules/mqtt/mqtt-contract';

export const localDatabaseUrl = 'postgresql://vers_test:vers_test_local_only@127.0.0.1:55432/vers_test?schema=public';
export interface RehearsalFixture { vehicleId: string; installationId: string; deviceId: string; testId: string;
  deviceUid: string; startedAt: Date; endedAt: Date }

/** Falha sem divulgar URL caso a suíte não tenha instalado o guard de banco sintético. */
export function requireLocalDatabase(): void {
  if (process.env.NODE_ENV !== 'test' || process.env.DATABASE_URL !== localDatabaseUrl) {
    throw new Error('Ensaio exige NODE_ENV=test e PostgreSQL sintético local fixo.');
  }
}

/** Provisiona origem/teste de bancada em uma transação sem tocar registros existentes. */
export async function createFixture(prisma: PrismaService, deviceUid = `rehearsal-${randomUUID()}`): Promise<RehearsalFixture> {
  requireLocalDatabase();
  const f = { vehicleId: randomUUID(), installationId: randomUUID(), deviceId: randomUUID(), testId: randomUUID(), deviceUid,
    startedAt: new Date('2026-10-01T00:00:00.000Z'), endedAt: new Date('2026-10-01T00:01:00.000Z') };
  await prisma.$transaction(async (tx) => {
    await tx.vehicle.create({ data: { id: f.vehicleId, licensePlate: `R${f.vehicleId.slice(0, 6).toUpperCase()}` } });
    await tx.versInstallation.create({ data: { id: f.installationId, vehicleId: f.vehicleId, systemModel: 'REHEARSAL', status: 'ACTIVE' } });
    await tx.device.create({ data: { id: f.deviceId, vehicleId: f.vehicleId, installationId: f.installationId, deviceUid, status: 'ONLINE' } });
    await tx.test.create({ data: { id: f.testId, vehicleId: f.vehicleId, installationId: f.installationId, status: 'COMPLETED',
      startedAt: f.startedAt, endedAt: f.endedAt, name: 'Ensaio sintético F07.7', terrain: 'OTHER',
      snapshotTestLocation: 'Bancada isolada', snapshotActivePiezoCount: 2, snapshotConfigurationVersion: 1 } });
  });
  return f;
}

/** Limpa exclusivamente os IDs gerados pelo teste, preservando qualquer outro dado local. */
export async function removeFixture(prisma: PrismaService, f: RehearsalFixture): Promise<void> {
  requireLocalDatabase();
  await prisma.$transaction(async (tx) => {
    await tx.energySummary.deleteMany({ where: { OR: [{ installationId: f.installationId }, { testId: f.testId }] } });
    await tx.telemetrySample.deleteMany({ where: { OR: [{ installationId: f.installationId }, { testId: f.testId }] } });
    await tx.mqttMessage.deleteMany({ where: { deviceId: f.deviceId } });
    await tx.test.deleteMany({ where: { id: f.testId } });
    await tx.vehicle.deleteMany({ where: { id: f.vehicleId } });
  });
}

/** Fornece três capturas de 2 W com oracle de 4/3600 Wh e identidade independente. */
export function envelope(f: RehearsalFixture, sequence = 1): TelemetryMessage {
  return { schemaVersion: 1, messageId: randomUUID(), deviceUid: f.deviceUid, testId: f.testId, sequence,
    capturedAt: f.startedAt.toISOString(), samples: [0, 1, 2].map((second) => ({
      capturedAt: new Date(f.startedAt.getTime() + second * 1000).toISOString(),
      measurements: { voltageV: 4, currentA: 0.5, devicePowerW: 99, accumulatedEnergyWh: 10 + second / 1800 },
    })) };
}
