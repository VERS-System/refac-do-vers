// Recompõe resumos internos sob locks de origem, sem criar rota ou tarifa implícita.
import { Injectable, NotFoundException } from '@nestjs/common';
import { EnergySummary, Prisma, SummaryPeriod } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CalculationSample, calculateTelemetry, TELEMETRY_CALCULATION_VERSION } from './telemetry-calculation';

const calculationSelect = { id: true, messageId: true, sampleIndex: true, deviceId: true,
  testId: true, capturedAt: true, voltageV: true, currentA: true, accumulatedEnergyWh: true,
  quality: true } satisfies Prisma.TelemetrySampleSelect;
type CalendarPeriod = Exclude<SummaryPeriod, 'TEST'>;

/** Exige início alinhado e usa calendário UTC, incluindo meses e anos bissextos. */
function calendarEnd(periodType: CalendarPeriod, start: Date): Date {
  if (!Number.isFinite(start.getTime()) || !['HOUR', 'DAY', 'MONTH'].includes(periodType)) {
    throw new RangeError('Período de resumo inválido.');
  }
  const aligned = new Date(start);
  aligned.setUTCMinutes(0, 0, 0);
  if (periodType !== 'HOUR') aligned.setUTCHours(0);
  if (periodType === 'MONTH') aligned.setUTCDate(1);
  if (aligned.getTime() !== start.getTime()) throw new RangeError('Início do período deve estar alinhado em UTC.');
  const end = new Date(start);
  if (periodType === 'HOUR') end.setUTCHours(end.getUTCHours() + 1);
  else if (periodType === 'DAY') end.setUTCDate(end.getUTCDate() + 1);
  else end.setUTCMonth(end.getUTCMonth() + 1);
  if (!Number.isFinite(end.getTime())) throw new RangeError('Fim do período inválido.');
  return end;
}

@Injectable()
export class EnergySummaryService {
  /** Reutiliza Prisma global para manter leitura, cálculo e escrita na mesma transação. */
  constructor(private readonly prisma: PrismaService) {}

  /** Bloqueia veículo antes de instalação; ausência pode representar exclusão concorrente. */
  private async lockInstallation(tx: Prisma.TransactionClient, id: string): Promise<boolean> {
    const installation = await tx.versInstallation.findUnique({ where: { id }, select: { vehicleId: true } });
    if (!installation) return false;
    const vehicles = await tx.$queryRaw<{ id: string }[]>`
      SELECT id FROM vehicles WHERE id = ${installation.vehicleId}::uuid FOR UPDATE`;
    if (!vehicles.length) return false;
    const installations = await tx.$queryRaw<{ id: string }[]>`
      SELECT id FROM vers_installations WHERE id = ${id}::uuid AND vehicle_id = ${installation.vehicleId}::uuid FOR UPDATE`;
    return installations.length > 0;
  }

  /** Produz TEST só após encerramento, preservando histórico e a leitura terminal como vizinho. */
  async recomputeTest(testId: string, transaction?: Prisma.TransactionClient): Promise<EnergySummary | null> {
    const recompute = async (tx: Prisma.TransactionClient): Promise<EnergySummary | null> => {
      const initial = await tx.test.findUnique({ where: { id: testId }, select: { installationId: true } });
      if (!initial) throw new NotFoundException({ code: 'TEST_NOT_FOUND' });
      if (initial.installationId !== null) await this.lockInstallation(tx, initial.installationId);
      const locked = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM tests WHERE id = ${testId}::uuid FOR UPDATE`;
      if (!locked.length) throw new NotFoundException({ code: 'TEST_NOT_FOUND' });
      const test = await tx.test.findUnique({ where: { id: testId },
        select: { status: true, installationId: true, startedAt: true, endedAt: true } });
      if (!test) throw new NotFoundException({ code: 'TEST_NOT_FOUND' });
      if (!['COMPLETED', 'FAILED', 'CANCELLED'].includes(test.status) || !test.startedAt || !test.endedAt ||
        test.endedAt.getTime() <= test.startedAt.getTime()) return null;
      return this.persist(tx, { testId, installationId: test.installationId }, 'TEST', test.startedAt, test.endedAt);
    };
    return transaction ? recompute(transaction) :
      this.prisma.$transaction(recompute, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });
  }

  /** Recompõe períodos afetados e vizinhos na transação da ingestão, ou repara histórico em transação própria. */
  async recomputeMessage(messageId: string, transaction?: Prisma.TransactionClient): Promise<void> {
    const recompute = async (tx: Prisma.TransactionClient): Promise<void> => {
      const rows = await tx.telemetrySample.findMany({ where: { messageId },
        select: { installationId: true, deviceId: true, testId: true, capturedAt: true } });
      if (!rows.length) return;
      const installations = [...new Set(rows.flatMap((row) => row.installationId ? [row.installationId] : []))].sort();
      const active = new Set<string>();
      for (const installationId of installations) {
        if (await this.lockInstallation(tx, installationId)) active.add(installationId);
      }
      for (const testId of [...new Set(rows.flatMap((row) => row.testId ? [row.testId] : []))].sort()) {
        await this.recomputeTest(testId, tx);
      }
      for (const installationId of active) {
        const groups = new Map<string, typeof rows>();
        for (const row of rows.filter((item) => item.installationId === installationId)) {
          const key = JSON.stringify([row.deviceId, row.testId]);
          const group = groups.get(key) ?? []; group.push(row); groups.set(key, group);
        }
        let from = Infinity; let to = -Infinity;
        for (const group of groups.values()) {
          const start = new Date(Math.min(...group.map((row) => row.capturedAt.getTime())));
          const end = new Date(Math.max(...group.map((row) => row.capturedAt.getTime())));
          const source = { installationId, deviceId: group[0].deviceId, testId: group[0].testId };
          const [before, after] = group[0].deviceId === null ? [null, null] : await Promise.all([
            tx.telemetrySample.aggregate({ where: { ...source, capturedAt: { lt: start } }, _max: { capturedAt: true } }),
            tx.telemetrySample.aggregate({ where: { ...source, capturedAt: { gt: end } }, _min: { capturedAt: true } }),
          ]);
          from = Math.min(from, before?._max.capturedAt?.getTime() ?? start.getTime());
          to = Math.max(to, after?._min.capturedAt?.getTime() ?? end.getTime());
        }
        for (const periodType of ['HOUR', 'DAY', 'MONTH'] as const) {
          let start = new Date(from); start.setUTCMinutes(0, 0, 0);
          if (periodType !== 'HOUR') start.setUTCHours(0);
          if (periodType === 'MONTH') start.setUTCDate(1);
          // shortcut: intervalos extensos podem exceder timeout e manter RECEIVED, particionar trabalho durável quando carga exigir.
          while (start.getTime() <= to) {
            const end = calendarEnd(periodType, start);
            await this.persist(tx, { installationId, testId: null }, periodType, start, end);
            start = end;
          }
        }
      }
    };
    if (transaction) await recompute(transaction);
    else await this.prisma.$transaction(recompute, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });
  }

  /** Recompõe um período de instalação; o caller futuro escolhe os períodos afetados. */
  async recomputePeriod(installationId: string, periodType: CalendarPeriod, periodStart: Date): Promise<EnergySummary | null> {
    const periodEnd = calendarEnd(periodType, periodStart);
    return this.prisma.$transaction(async (tx) => {
      if (!await this.lockInstallation(tx, installationId)) throw new NotFoundException({ code: 'INSTALLATION_NOT_FOUND' });
      return this.persist(tx, { installationId, testId: null }, periodType, periodStart, periodEnd);
    }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });
  }

  /** Busca timestamps vizinhos por origem e traz todos os empates, sem perder conflitos na fronteira. */
  private async samples(tx: Prisma.TransactionClient, source: Prisma.TelemetrySampleWhereInput,
    start: Date, end: Date): Promise<CalculationSample[]> {
    const by = ['deviceId', 'testId'] satisfies Prisma.TelemetrySampleScalarFieldEnum[];
    const [before, after] = await Promise.all([
      tx.telemetrySample.groupBy({ by, where: { ...source, capturedAt: { lt: start } }, _max: { capturedAt: true } }),
      tx.telemetrySample.groupBy({ by, where: { ...source, capturedAt: { gt: end } }, _min: { capturedAt: true } }),
    ]);
    const neighbors = [...before.map((row) => ({ deviceId: row.deviceId, testId: row.testId,
      capturedAt: row._max.capturedAt! })), ...after.map((row) => ({ deviceId: row.deviceId,
      testId: row.testId, capturedAt: row._min.capturedAt! }))];
    return tx.telemetrySample.findMany({ where: { ...source,
      OR: [{ capturedAt: { gte: start, lte: end } }, ...neighbors] }, select: calculationSelect,
      orderBy: [{ capturedAt: 'asc' }, { id: 'asc' }] });
  }

  /** Atualiza a mesma chave ou remove derivação obsoleta; origem incompleta preserva o histórico. */
  private async persist(tx: Prisma.TransactionClient, resource: { testId: string | null; installationId: string | null },
    periodType: SummaryPeriod, periodStart: Date, periodEnd: Date): Promise<EnergySummary | null> {
    const source = resource.testId !== null ? { testId: resource.testId } : { installationId: resource.installationId };
    const where = { ...source, ...(resource.testId === null ? { testId: null } : {}),
      periodType, periodStart, calculationVersion: TELEMETRY_CALCULATION_VERSION };
    const samples = await this.samples(tx, source, periodStart, periodEnd);
    const existing = await tx.energySummary.findFirst({ where });
    if (samples.some((row) => row.deviceId === null && row.capturedAt >= periodStart && row.capturedAt <= periodEnd)) return existing;
    const calculation = calculateTelemetry(samples, { start: periodStart, end: periodEnd });
    if (calculation.recoveredEnergyWh === null) {
      await tx.energySummary.deleteMany({ where });
      return null;
    }
    const data = { ...resource, periodType, periodStart, periodEnd,
      recoveredEnergyWh: calculation.recoveredEnergyWh, averagePowerW: calculation.averagePowerW,
      peakPowerW: calculation.peakPowerW, sampleCount: calculation.sampleCount, quality: calculation.quality,
      calculationVersion: calculation.calculationVersion, calculatedAt: new Date(), vehicleEnergyUsedWh: null,
      moneySaved: null, currencyCode: null, energyTariffPerKwh: null };
    if (existing) return tx.energySummary.update({ where: { id: existing.id }, data });
    return tx.energySummary.create({ data });
  }
}
