// Cria e consulta revisões próprias preservando histórico e autorização transacional.
import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { SupportRequest } from '../../../../../packages/shared-types/src/support';
import { PaginatedResponse } from '../../../../../packages/shared-types/src/api';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSupportDto, SupportQueryDto } from './support.dto';

const supportSelect = { id: true, vehicleId: true, installationId: true, reason: true,
  status: true, createdAt: true, updatedAt: true } satisfies Prisma.SupportRequestSelect;
type SupportRow = Prisma.SupportRequestGetPayload<{ select: typeof supportSelect }>;

/** Serializa datas UTC mantendo apenas campos públicos selecionados do suporte. */
function publicSupport(row: SupportRow): SupportRequest {
  return { ...row, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() };
}

@Injectable()
export class SupportService {
  /** Reutiliza Prisma para autorização dentro das consultas e transações. */
  constructor(private readonly prisma: PrismaService) {}

  /** Lista somente solicitações próprias com paginação e contagem no mesmo snapshot. */
  async list(userId: string, { page, pageSize, status }: SupportQueryDto): Promise<PaginatedResponse<SupportRequest>> {
    const where: Prisma.SupportRequestWhereInput = { requesterId: userId, ...(status !== undefined ? { status } : {}) };
    return this.prisma.$transaction(async (tx) => {
      const rows = await tx.supportRequest.findMany({ where, select: supportSelect,
        skip: (page - 1) * pageSize, take: pageSize, orderBy: [{ createdAt: 'desc' }, { id: 'asc' }] });
      const totalItems = await tx.supportRequest.count({ where });
      return { data: rows.map(publicSupport), meta: { page, pageSize, totalItems,
        totalPages: Math.ceil(totalItems / pageSize) }, requestId: '' };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  }

  /** Consulta solicitação própria inclusive histórica; ausência e acesso alheio usam 404. */
  async detail(userId: string, id: string): Promise<SupportRequest> {
    const row = await this.prisma.supportRequest.findFirst({ where: { id, requesterId: userId }, select: supportSelect });
    if (!row) throw new NotFoundException({ code: 'SUPPORT_REQUEST_NOT_FOUND' });
    return publicSupport(row);
  }

  /** Bloqueia conta/veículo contra exclusão e verifica instalação antes de abrir revisão. */
  async create(userId: string, input: CreateSupportDto): Promise<SupportRequest> {
    return this.prisma.$transaction(async (tx) => {
      const users = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM users WHERE id = ${userId}::uuid FOR UPDATE`;
      if (!users.length) throw new NotFoundException({ code: 'USER_NOT_FOUND' });
      await tx.$queryRaw`SELECT id FROM vehicles WHERE id = ${input.vehicleId}::uuid FOR UPDATE`;
      const link = await tx.userVehicle.findUnique({ where: { userId_vehicleId: { userId, vehicleId: input.vehicleId } }, select: { vehicleId: true } });
      if (!link) throw new NotFoundException({ code: 'VEHICLE_NOT_FOUND' });
      if (input.installationId !== undefined) {
        const installation = await tx.versInstallation.findFirst({ where: { id: input.installationId,
          vehicleId: input.vehicleId, vehicle: { users: { some: { userId } } } }, select: { id: true } });
        if (!installation) throw new NotFoundException({ code: 'INSTALLATION_NOT_FOUND' });
      }
      const row = await tx.supportRequest.create({ data: { requesterId: userId, vehicleId: input.vehicleId,
        installationId: input.installationId ?? null, reason: input.reason, status: 'OPEN' }, select: supportSelect });
      return publicSupport(row);
    });
  }
}
