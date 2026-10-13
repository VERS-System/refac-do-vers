// Planeja experimentos e consulta contexto público atual ou histórico do criador.
import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { TestRecord } from '../../../../../packages/shared-types/src/tests';
import { PaginatedResponse } from '../../../../../packages/shared-types/src/api';
import { PrismaService } from '../../prisma/prisma.service';
import { CancelTestDto, CreateTestDto, FinishTestDto, TestQueryDto } from './test.dto';

const testSelect = { id: true, installationId: true, configurationId: true, createdById: true,
  name: true, status: true, terrain: true, snapshotVehicleModel: true, snapshotTestLocation: true,
  snapshotActivePiezoCount: true, snapshotConfigurationVersion: true, startedAt: true, endedAt: true,
  vehicleWeightKg: true, averageEngineRpm: true, averageSpeedKph: true, inclineDegrees: true,
  outcome: true, notes: true, createdAt: true, updatedAt: true } satisfies Prisma.TestSelect;
type TestRow = Prisma.TestGetPayload<{ select: typeof testSelect }>;

/** Permite o criador histórico ou a conta atualmente vinculada à instalação. */
function accessWhere(userId: string): Prisma.TestWhereInput {
  return { OR: [{ createdById: userId }, { installation: { vehicle: { users: { some: { userId } } } } }] };
}

/** Monta o snapshot público e serializa instantes sem expor campos internos. */
function publicTest(row: TestRow): TestRecord {
  const { snapshotVehicleModel, snapshotTestLocation, snapshotActivePiezoCount, snapshotConfigurationVersion, ...record } = row;
  return { ...record, snapshot: { vehicleModel: snapshotVehicleModel, testLocation: snapshotTestLocation,
    activePiezoCount: snapshotActivePiezoCount, configurationVersion: snapshotConfigurationVersion },
    startedAt: row.startedAt?.toISOString() ?? null, endedAt: row.endedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() };
}

@Injectable()
export class TestsService {
  /** Recebe Prisma global para filtrar acesso e manter planejamento atômico. */
  constructor(private readonly prisma: PrismaService) {}

  /** Lista contexto autorizado e contagem no mesmo snapshot com filtros semiabertos. */
  async list(userId: string, query: TestQueryDto): Promise<PaginatedResponse<TestRecord>> {
    const { page, pageSize, installationId, status, startedFrom, startedTo } = query;
    const where: Prisma.TestWhereInput = { ...accessWhere(userId),
      ...(installationId !== undefined ? { installationId } : {}), ...(status !== undefined ? { status } : {}),
      ...(startedFrom || startedTo ? { startedAt: {
        ...(startedFrom ? { gte: new Date(startedFrom) } : {}), ...(startedTo ? { lt: new Date(startedTo) } : {}) } } : {}) };
    return this.prisma.$transaction(async (tx) => {
      const rows = await tx.test.findMany({ where, select: testSelect, skip: (page - 1) * pageSize,
        take: pageSize, orderBy: [{ createdAt: 'desc' }, { id: 'asc' }] });
      const totalItems = await tx.test.count({ where });
      return { data: rows.map(publicTest), meta: { page, pageSize, totalItems,
        totalPages: Math.ceil(totalItems / pageSize) }, requestId: '' };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  }

  /** Consulta somente teste acessível, incluindo histórico sem instalação pelo criador. */
  async detail(userId: string, id: string): Promise<TestRecord> {
    const row = await this.prisma.test.findFirst({ where: { id, ...accessWhere(userId) }, select: testSelect });
    if (!row) throw new NotFoundException({ code: 'TEST_NOT_FOUND' });
    return publicTest(row);
  }

  /** Condiciona a escrita ao estado lido para resolver disputas sem sobrescrever outra transição. */
  async transition(userId: string, id: string, action: 'start' | 'finish' | 'cancel',
    input: FinishTestDto | CancelTestDto = {}): Promise<TestRecord> {
    return this.prisma.$transaction(async (tx) => {
      const where = { id, ...accessWhere(userId) };
      const row = await tx.test.findFirst({ where, select: testSelect });
      if (!row) throw new NotFoundException({ code: 'TEST_NOT_FOUND' });
      const allowed = action === 'start' ? row.status === 'PLANNED' : action === 'finish' ? row.status === 'RUNNING' :
        row.status === 'PLANNED' || row.status === 'RUNNING';
      if (!allowed) throw new ConflictException({ code: 'TEST_STATE_CONFLICT' });
      // Mantém a ordem temporal mesmo se o relógio do servidor recuar após o início.
      const now = new Date(Math.max(Date.now(), row.startedAt?.getTime() ?? 0));
      let data: Prisma.TestUpdateManyMutationInput;
      if (action === 'start') data = { status: 'RUNNING', startedAt: now };
      else if (action === 'finish') data = { ...input as FinishTestDto, endedAt: now };
      else {
        const { reason } = input as CancelTestDto;
        const notes = reason === undefined ? undefined : row.notes ? `${row.notes}\n${reason}` : reason;
        if (notes !== undefined && notes.length > 1000) throw new BadRequestException({ code: 'VALIDATION_ERROR' });
        data = { status: 'CANCELLED', ...(row.status === 'RUNNING' ? { endedAt: now } : {}),
          ...(notes !== undefined ? { notes } : {}) };
      }
      const changed = await tx.test.updateMany({ where: { ...where, status: row.status }, data });
      if (changed.count !== 1) throw new ConflictException({ code: 'TEST_STATE_CONFLICT' });
      const updated = await tx.test.findFirstOrThrow({ where: { id }, select: testSelect });
      return publicTest(updated);
    });
  }

  /** Bloqueia recursos contra desvinculação/alteração e persiste o snapshot do servidor. */
  async create(userId: string, input: CreateTestDto): Promise<TestRecord> {
    return this.prisma.$transaction(async (tx) => {
      const users = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM users WHERE id = ${userId}::uuid FOR UPDATE`;
      if (!users.length) throw new NotFoundException({ code: 'USER_NOT_FOUND' });
      const resources = await tx.$queryRaw<{ id: string }[]>`
        SELECT v.id FROM vehicles v JOIN vers_installations i ON i.vehicle_id = v.id
        JOIN user_vehicles uv ON uv.vehicle_id = v.id
        WHERE i.id = ${input.installationId}::uuid AND uv.user_id = ${userId}::uuid
        FOR UPDATE OF v, i`;
      if (!resources.length) throw new NotFoundException({ code: 'INSTALLATION_NOT_FOUND' });
      const installation = await tx.versInstallation.findFirst({ where: { id: input.installationId,
        vehicle: { users: { some: { userId } } } },
        select: { id: true, vehicleId: true, status: true, vehicle: { select: { model: true } } } });
      if (!installation) throw new NotFoundException({ code: 'INSTALLATION_NOT_FOUND' });
      if (installation.status !== 'ACTIVE') throw new ConflictException({ code: 'INSTALLATION_STATE_CONFLICT' });
      const configuration = await tx.configuration.findFirst({ where: { id: input.configurationId, installationId: installation.id },
        select: { id: true, activePiezoCount: true, version: true } });
      if (!configuration) throw new NotFoundException({ code: 'CONFIGURATION_NOT_FOUND' });
      const row = await tx.test.create({ data: { vehicleId: installation.vehicleId,
        installationId: installation.id, configurationId: configuration.id, createdById: userId,
        name: input.name, terrain: input.terrain, status: 'PLANNED',
        snapshotVehicleModel: installation.vehicle.model, snapshotTestLocation: input.testLocation,
        snapshotActivePiezoCount: configuration.activePiezoCount, snapshotConfigurationVersion: configuration.version,
        ...(input.vehicleWeightKg !== undefined ? { vehicleWeightKg: input.vehicleWeightKg } : {}),
        ...(input.notes !== undefined ? { notes: input.notes } : {}) }, select: testSelect });
      return publicTest(row);
    });
  }
}
