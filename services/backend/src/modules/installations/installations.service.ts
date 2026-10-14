// Consulta instalações e versões acessíveis sem expor identificadores internos.
import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Installation, Configuration } from '../../../../../packages/shared-types/src/installations';
import { PaginatedResponse } from '../../../../../packages/shared-types/src/api';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import { InstallationQueryDto } from './installation-query.dto';

const installationSelect = { id: true, vehicleId: true, systemModel: true, status: true,
  installedAt: true, createdAt: true, updatedAt: true, devices: {
    where: { revokedAt: null, status: { not: 'REVOKED' } }, take: 1,
    select: { id: true, name: true, firmwareVersion: true, status: true, lastSeenAt: true },
  } } satisfies Prisma.VersInstallationSelect;
const configurationSelect = { id: true, installationId: true, name: true, version: true,
  activePiezoCount: true, piezoAssociation: true, installationPoint: true,
  storageType: true, notes: true, createdAt: true } satisfies Prisma.ConfigurationSelect;
type InstallationRow = Prisma.VersInstallationGetPayload<{ select: typeof installationSelect }>;
type ConfigurationRow = Prisma.ConfigurationGetPayload<{ select: typeof configurationSelect }>;

/** Restringe instalações ao vínculo atual da conta, inclusive quando ela é ADMIN. */
function accessWhere(userId: string): Prisma.VersInstallationWhereInput {
  return { vehicle: { users: { some: { userId } } } };
}

/** Converte os instantes públicos em UTC e transforma dispositivo ausente em null. */
function publicInstallation({ devices, ...row }: InstallationRow): Installation {
  const device = devices[0];
  return { ...row, installedAt: row.installedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString(),
    activeDevice: device ? { ...device, lastSeenAt: device.lastSeenAt?.toISOString() ?? null } : null };
}

/** Serializa a data da versão pública sem incluir relações de persistência. */
function publicConfiguration(row: ConfigurationRow): Configuration {
  return { ...row, createdAt: row.createdAt.toISOString() };
}

@Injectable()
export class InstallationsService {
  /** Reutiliza Prisma global para leituras filtradas e snapshots consistentes. */
  constructor(private readonly prisma: PrismaService) {}

  /** Lista instalações próprias com filtros e contagem no mesmo snapshot. */
  async list(userId: string, query: InstallationQueryDto): Promise<PaginatedResponse<Installation>> {
    const { page, pageSize, vehicleId, status } = query;
    const where: Prisma.VersInstallationWhereInput = { ...accessWhere(userId),
      ...(vehicleId !== undefined ? { vehicleId } : {}), ...(status !== undefined ? { status } : {}) };
    return this.prisma.$transaction(async (tx) => {
      const rows = await tx.versInstallation.findMany({ where, select: installationSelect,
        skip: (page - 1) * pageSize, take: pageSize, orderBy: [{ createdAt: 'desc' }, { id: 'asc' }] });
      const totalItems = await tx.versInstallation.count({ where });
      return { data: rows.map(publicInstallation), meta: { page, pageSize, totalItems,
        totalPages: Math.ceil(totalItems / pageSize) }, requestId: '' };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  }

  /** Busca instalação com acesso na mesma consulta; ausência e recurso alheio usam 404. */
  async detail(userId: string, id: string): Promise<Installation> {
    const row = await this.prisma.versInstallation.findFirst({ where: { id, ...accessWhere(userId) }, select: installationSelect });
    if (!row) throw new NotFoundException({ code: 'INSTALLATION_NOT_FOUND' });
    return publicInstallation(row);
  }

  /** Verifica instalação e pagina versões no mesmo snapshot para evitar corrida de acesso. */
  async configurations(userId: string, installationId: string, { page, pageSize }: PaginationQueryDto): Promise<PaginatedResponse<Configuration>> {
    return this.prisma.$transaction(async (tx) => {
      const parent = await tx.versInstallation.findFirst({ where: { id: installationId, ...accessWhere(userId) }, select: { id: true } });
      if (!parent) throw new NotFoundException({ code: 'INSTALLATION_NOT_FOUND' });
      const where = { installationId, installation: accessWhere(userId) };
      const rows = await tx.configuration.findMany({ where, select: configurationSelect,
        skip: (page - 1) * pageSize, take: pageSize, orderBy: [{ version: 'desc' }, { id: 'asc' }] });
      const totalItems = await tx.configuration.count({ where });
      return { data: rows.map(publicConfiguration), meta: { page, pageSize, totalItems,
        totalPages: Math.ceil(totalItems / pageSize) }, requestId: '' };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  }

  /** Restringe a versão ao ID, instalação e vínculo numa única consulta autorizada. */
  async configuration(userId: string, installationId: string, id: string): Promise<Configuration> {
    const row = await this.prisma.configuration.findFirst({ where: { id, installationId, installation: accessWhere(userId) }, select: configurationSelect });
    if (!row) throw new NotFoundException({ code: 'CONFIGURATION_NOT_FOUND' });
    return publicConfiguration(row);
  }
}
