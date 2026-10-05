// Prepara verificações de vínculo para os services das fases de domínio e dados.

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ResourceAccessService {
  /** Injeta a persistência para verificar vínculos na própria consulta ao recurso. */
  constructor(private readonly prisma: PrismaService) {}

  /** Exige veículo vinculado à conta; recurso ausente e alheio recebem o mesmo 404. */
  async requireVehicle(userId: string, vehicleId: string): Promise<void> {
    const resource = await this.prisma.vehicle.findFirst({
      where: { id: vehicleId, users: { some: { userId } } }, select: { id: true },
    });
    if (!resource) throw new NotFoundException({ code: 'VEHICLE_NOT_FOUND' });
  }

  /** Exige vínculo atual com o veículo da instalação, sem exceção para ADMIN global. */
  async requireInstallation(userId: string, installationId: string): Promise<void> {
    const resource = await this.prisma.versInstallation.findFirst({
      where: { id: installationId, vehicle: { users: { some: { userId } } } }, select: { id: true },
    });
    if (!resource) throw new NotFoundException({ code: 'INSTALLATION_NOT_FOUND' });
  }

  /** Preserva consulta histórica pelo criador ou permite vínculo atual da instalação. */
  async requireTest(userId: string, testId: string): Promise<void> {
    const resource = await this.prisma.test.findFirst({
      where: { id: testId, OR: [
        { createdById: userId },
        { installation: { vehicle: { users: { some: { userId } } } } },
      ] },
      select: { id: true },
    });
    if (!resource) throw new NotFoundException({ code: 'TEST_NOT_FOUND' });
  }
}
