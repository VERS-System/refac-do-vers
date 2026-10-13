// Consulta amostras públicas com autorização e paginação no mesmo snapshot.
import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { TelemetrySample } from '../../../../../packages/shared-types/src/telemetry';
import { PaginatedResponse } from '../../../../../packages/shared-types/src/api';
import { PrismaService } from '../../prisma/prisma.service';
import { testAccessWhere } from '../auth/resource-access.service';
import { TelemetryQueryDto } from './telemetry-query.dto';

const telemetrySelect = { id: true, testId: true, capturedAt: true, voltageV: true,
  currentA: true, powerW: true, devicePowerW: true, accumulatedEnergyWh: true,
  accelerationXMs2: true, accelerationYMs2: true, accelerationZMs2: true,
  vibrationRmsMs2: true, temperatureC: true, activePiezoCount: true, quality: true } satisfies Prisma.TelemetrySampleSelect;
type TelemetryRow = Prisma.TelemetrySampleGetPayload<{ select: typeof telemetrySelect }>;

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
}
