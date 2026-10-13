// Consulta amostras e resumos públicos com autorização e paginação no mesmo snapshot.
import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { EnergySummary, TelemetrySample } from '../../../../../packages/shared-types/src/telemetry';
import { PaginatedResponse } from '../../../../../packages/shared-types/src/api';
import { PrismaService } from '../../prisma/prisma.service';
import { testAccessWhere } from '../auth/resource-access.service';
import { TelemetryQueryDto } from './telemetry-query.dto';
import { SummaryQueryDto } from './summary-query.dto';
import { TELEMETRY_CALCULATION_VERSION } from './telemetry-calculation';

const telemetrySelect = { id: true, testId: true, capturedAt: true, voltageV: true,
  currentA: true, powerW: true, devicePowerW: true, accumulatedEnergyWh: true,
  accelerationXMs2: true, accelerationYMs2: true, accelerationZMs2: true,
  vibrationRmsMs2: true, temperatureC: true, activePiezoCount: true, quality: true } satisfies Prisma.TelemetrySampleSelect;
type TelemetryRow = Prisma.TelemetrySampleGetPayload<{ select: typeof telemetrySelect }>;
const summarySelect = { id: true, installationId: true, testId: true, periodType: true,
  periodStart: true, periodEnd: true, recoveredEnergyWh: true, vehicleEnergyUsedWh: true,
  averagePowerW: true, peakPowerW: true, moneySaved: true, currencyCode: true,
  energyTariffPerKwh: true, sampleCount: true, quality: true, calculatedAt: true } satisfies Prisma.EnergySummarySelect;
type SummaryRow = Prisma.EnergySummaryGetPayload<{ select: typeof summarySelect }>;

/** Serializa datas e decimais exatos sem incluir versão, criação ou relações internas. */
function publicSummary(row: SummaryRow): EnergySummary {
  return { id: row.id, installationId: row.installationId, testId: row.testId,
    periodType: row.periodType, periodStart: row.periodStart.toISOString(), periodEnd: row.periodEnd.toISOString(),
    recoveredEnergyWh: row.recoveredEnergyWh, vehicleEnergyUsedWh: row.vehicleEnergyUsedWh,
    averagePowerW: row.averagePowerW, peakPowerW: row.peakPowerW,
    moneySaved: row.moneySaved?.toString() ?? null, currencyCode: row.currencyCode,
    energyTariffPerKwh: row.energyTariffPerKwh?.toString() ?? null,
    sampleCount: row.sampleCount, quality: row.quality, calculatedAt: row.calculatedAt.toISOString() };
}

/** Projeta campos contratados e data UTC sem incluir IDs de origem ou persistência. */
function publicTelemetry(row: TelemetryRow): TelemetrySample {
  return { id: row.id, testId: row.testId, capturedAt: row.capturedAt.toISOString(),
    voltageV: row.voltageV, currentA: row.currentA, powerW: row.powerW, devicePowerW: row.devicePowerW,
    accumulatedEnergyWh: row.accumulatedEnergyWh, accelerationXMs2: row.accelerationXMs2,
    accelerationYMs2: row.accelerationYMs2, accelerationZMs2: row.accelerationZMs2,
    vibrationRmsMs2: row.vibrationRmsMs2, temperatureC: row.temperatureC,
    activePiezoCount: row.activePiezoCount, quality: row.quality };
}

@Injectable()
export class DataService {
  /** Reutiliza Prisma global para consultas autorizadas e consistentes. */
  constructor(private readonly prisma: PrismaService) {}

  /** Distingue teste inacessível de série vazia e aplica filtros sem alterar medições. */
  async telemetry(userId: string, testId: string, query: TelemetryQueryDto): Promise<PaginatedResponse<TelemetrySample>> {
    const { page, pageSize, quality, capturedFrom, capturedTo } = query;
    const access = testAccessWhere(userId);
    const where: Prisma.TelemetrySampleWhereInput = { testId, test: access,
      ...(quality !== undefined ? { quality } : {}),
      ...(capturedFrom || capturedTo ? { capturedAt: {
        ...(capturedFrom ? { gte: new Date(capturedFrom) } : {}),
        ...(capturedTo ? { lt: new Date(capturedTo) } : {}) } } : {}) };
    return this.prisma.$transaction(async (tx) => {
      const parent = await tx.test.findFirst({ where: { id: testId, ...access }, select: { id: true } });
      if (!parent) throw new NotFoundException({ code: 'TEST_NOT_FOUND' });
      const rows = await tx.telemetrySample.findMany({ where, select: telemetrySelect,
        skip: (page - 1) * pageSize, take: pageSize, orderBy: [{ capturedAt: 'asc' }, { id: 'asc' }] });
      const totalItems = await tx.telemetrySample.count({ where });
      return { data: rows.map(publicTelemetry), meta: { page, pageSize, totalItems,
        totalPages: Math.ceil(totalItems / pageSize) }, requestId: '' };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  }

  /** Verifica acesso atual ou histórico ao teste antes de ler e contar resumos no snapshot. */
  async testSummaries(userId: string, testId: string, query: SummaryQueryDto): Promise<PaginatedResponse<EnergySummary>> {
    const access = testAccessWhere(userId);
    return this.prisma.$transaction(async (tx) => {
      const parent = await tx.test.findFirst({ where: { id: testId, ...access }, select: { id: true } });
      if (!parent) throw new NotFoundException({ code: 'TEST_NOT_FOUND' });
      return this.summaries(tx, { testId, test: access }, query);
    }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  }

  /** Exige vínculo próprio da instalação inclusive ADMIN, sem confundir ausência com série vazia. */
  async installationSummaries(userId: string, installationId: string,
    query: SummaryQueryDto): Promise<PaginatedResponse<EnergySummary>> {
    const access = { vehicle: { users: { some: { userId } } } };
    return this.prisma.$transaction(async (tx) => {
      const parent = await tx.versInstallation.findFirst({ where: { id: installationId, ...access }, select: { id: true } });
      if (!parent) throw new NotFoundException({ code: 'INSTALLATION_NOT_FOUND' });
      return this.summaries(tx, { installationId, installation: access }, query);
    }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  }

  /** Aplica filtros e versão ativa igualmente na página e contagem, sem recalcular dados no GET. */
  private async summaries(tx: Prisma.TransactionClient, source: Prisma.EnergySummaryWhereInput,
    query: SummaryQueryDto): Promise<PaginatedResponse<EnergySummary>> {
    const { page, pageSize, periodType, periodFrom, periodTo } = query;
    const where: Prisma.EnergySummaryWhereInput = { ...source, calculationVersion: TELEMETRY_CALCULATION_VERSION,
      ...(periodType !== undefined ? { periodType } : {}),
      ...(periodFrom || periodTo ? { periodStart: {
        ...(periodFrom ? { gte: new Date(periodFrom) } : {}), ...(periodTo ? { lt: new Date(periodTo) } : {}) } } : {}) };
    const rows = await tx.energySummary.findMany({ where, select: summarySelect,
      skip: (page - 1) * pageSize, take: pageSize, orderBy: [{ periodStart: 'asc' }, { id: 'asc' }] });
    const totalItems = await tx.energySummary.count({ where });
    return { data: rows.map(publicSummary), meta: { page, pageSize, totalItems,
      totalPages: Math.ceil(totalItems / pageSize) }, requestId: '' };
  }
}
