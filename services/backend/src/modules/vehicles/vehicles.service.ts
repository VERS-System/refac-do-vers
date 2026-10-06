// Persiste veículos e consulta somente vínculos da conta autenticada.
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Vehicle } from '../../../../../packages/shared-types/src/vehicles';
import { PaginatedResponse } from '../../../../../packages/shared-types/src/api';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import { CreateVehicleDto } from './create-vehicle.dto';

const linkSelect = { relationship: true, isPrimary: true, vehicle: { select: {
  id: true, licensePlate: true, brand: true, model: true, modelYear: true,
  createdAt: true, updatedAt: true,
} } } satisfies Prisma.UserVehicleSelect;
type LinkRow = Prisma.UserVehicleGetPayload<{ select: typeof linkSelect }>;

/** Projeta o veículo e seu vínculo público, serializando os instantes UTC. */
function publicVehicle(link: LinkRow): Vehicle {
  return { ...link.vehicle, relationship: link.relationship, isPrimary: link.isPrimary,
    createdAt: link.vehicle.createdAt.toISOString(), updatedAt: link.vehicle.updatedAt.toISOString() };
}

@Injectable()
export class VehiclesService {
  /** Reutiliza a persistência global para consultar vínculos e executar transações. */
  constructor(private readonly prisma: PrismaService) {}

  /** Lista vínculos próprios em ordem estável com contagem no mesmo snapshot. */
  async list(userId: string, { page, pageSize }: PaginationQueryDto): Promise<PaginatedResponse<Vehicle>> {
    return this.prisma.$transaction(async (tx) => {
      const rows = await tx.userVehicle.findMany({ where: { userId }, select: linkSelect,
        skip: (page - 1) * pageSize, take: pageSize,
        orderBy: [{ vehicle: { createdAt: 'desc' } }, { vehicleId: 'asc' }] });
      const totalItems = await tx.userVehicle.count({ where: { userId } });
      return { data: rows.map(publicVehicle), meta: { page, pageSize, totalItems,
        totalPages: Math.ceil(totalItems / pageSize) }, requestId: '' };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  }

  /** Busca o vínculo junto do veículo para impedir acesso a recursos alheios. */
  async detail(userId: string, vehicleId: string): Promise<Vehicle> {
    const link = await this.prisma.userVehicle.findUnique({
      where: { userId_vehicleId: { userId, vehicleId } }, select: linkSelect });
    if (!link) throw new NotFoundException({ code: 'VEHICLE_NOT_FOUND' });
    return publicVehicle(link);
  }

  /** Serializa cadastros por conta e cria veículo/vínculo OWNER atomicamente. */
  async create(userId: string, input: CreateVehicleDto): Promise<Vehicle> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const users = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM users WHERE id = ${userId}::uuid FOR UPDATE`;
        if (!users.length) throw new NotFoundException({ code: 'USER_NOT_FOUND' });
        const isPrimary = await tx.userVehicle.count({ where: { userId } }) === 0;
        const link = await tx.userVehicle.create({ data: { user: { connect: { id: userId } },
          relationship: 'OWNER', isPrimary, vehicle: { create: input } }, select: linkSelect });
        return publicVehicle(link);
      });
    } catch (error) {
      const failure = error as { code?: string; meta?: { target?: string[] } };
      if (failure?.code === 'P2002' && failure.meta?.target?.some((field) =>
        field === 'license_plate' || field === 'licensePlate')) {
        throw new ConflictException({ code: 'VEHICLE_LICENSE_PLATE_ALREADY_REGISTERED' });
      }
      throw error;
    }
  }
}
