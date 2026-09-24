// Testes dos health checks live e ready do backend.

import { ServiceUnavailableException } from '@nestjs/common';
import { HealthService } from './health.service';

describe('HealthService', () => {
  it('retorna live sem consultar dependencias externas', async () => {
    const prisma = { $queryRawUnsafe: jest.fn() };
    const service = new HealthService(prisma as never);

    await expect(service.live()).resolves.toMatchObject({
      status: 'ok',
      service: 'backend',
    });
    expect(prisma.$queryRawUnsafe).not.toHaveBeenCalled();
  });

  it('retorna ready quando o banco responde ao probe', async () => {
    const prisma = { $queryRawUnsafe: jest.fn().mockResolvedValue([{ ok: 1 }]) };
    const service = new HealthService(prisma as never);

    await expect(service.ready()).resolves.toMatchObject({
      status: 'ok',
      dependencies: { database: 'ok' },
    });
  });

  it('degrada ready sem expor detalhes internos quando o banco falha', async () => {
    const prisma = {
      $queryRawUnsafe: jest.fn().mockRejectedValue(new Error('postgres://secret')),
    };
    const service = new HealthService(prisma as never);

    await expect(service.ready()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
