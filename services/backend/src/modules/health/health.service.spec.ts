// Testes dos health checks live e ready do backend.

import { ServiceUnavailableException } from '@nestjs/common';
import Redis from 'ioredis';
import { HealthService } from './health.service';

const configService = {
  getOrThrow: (key: string): string | number => key === 'REDIS_HOST' ? 'localhost' : 6379,
};

beforeEach(() => {
  jest.spyOn(Redis.prototype, 'ping').mockResolvedValue('PONG');
  jest.spyOn(Redis.prototype, 'disconnect').mockImplementation();
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

describe('HealthService', () => {
  it.each(['disabled', 'unavailable', 'ok'] as const)('MQTT %s não bloqueia consultas REST', async (status) => {
    const prisma = { $queryRawUnsafe: jest.fn().mockResolvedValue([{ ok: 1 }]) };
    const service = new HealthService(prisma as never, configService as never, { status } as never);
    await expect(service.ready()).resolves.toMatchObject({ dependencies: { database: 'ok', redis: 'ok', mqtt: status } });
  });
  it('retorna live sem consultar dependencias externas', async () => {
    const prisma = { $queryRawUnsafe: jest.fn() };
    const service = new HealthService(prisma as never, configService as never, { status: 'disabled' } as never);

    await expect(service.live()).resolves.toMatchObject({
      status: 'ok',
      service: 'backend',
    });
    expect(prisma.$queryRawUnsafe).not.toHaveBeenCalled();
  });

  it('retorna ready quando o banco responde ao probe', async () => {
    const prisma = { $queryRawUnsafe: jest.fn().mockResolvedValue([{ ok: 1 }]) };
    const service = new HealthService(prisma as never, configService as never, { status: 'disabled' } as never);

    await expect(service.ready()).resolves.toMatchObject({
      status: 'ok',
      dependencies: { database: 'ok', redis: 'ok' },
    });
  });

  it('degrada ready sem expor detalhes internos quando o banco falha', async () => {
    const prisma = {
      $queryRawUnsafe: jest.fn().mockRejectedValue(new Error('postgres://secret')),
    };
    const service = new HealthService(prisma as never, configService as never, { status: 'disabled' } as never);

    await expect(service.ready()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('degrada ready quando Redis falha e recupera no próximo probe', async () => {
    const prisma = { $queryRawUnsafe: jest.fn().mockResolvedValue([{ ok: 1 }]) };
    const ping = jest.spyOn(Redis.prototype, 'ping')
      .mockRejectedValueOnce(new Error('redis://secret'))
      .mockResolvedValueOnce('PONG');
    const service = new HealthService(prisma as never, configService as never, { status: 'disabled' } as never);

    await expect(service.ready()).rejects.toBeInstanceOf(ServiceUnavailableException);
    await expect(service.ready()).resolves.toMatchObject({
      dependencies: { database: 'ok', redis: 'ok' },
    });
    expect(ping).toHaveBeenCalledTimes(2);
  });

  it('expira o probe de Redis sem deixar readiness pendurado', async () => {
    jest.useFakeTimers();
    jest.spyOn(Redis.prototype, 'ping').mockImplementation(
      () => new Promise<string>(() => {}),
    );
    const prisma = { $queryRawUnsafe: jest.fn().mockResolvedValue([{ ok: 1 }]) };
    const service = new HealthService(prisma as never, configService as never, { status: 'disabled' } as never);
    const ready = service.ready();
    const assertion = expect(ready).rejects.toBeInstanceOf(ServiceUnavailableException);

    await jest.advanceTimersByTimeAsync(1_000);
    await assertion;
    expect(Redis.prototype.disconnect).toHaveBeenCalled();
  });

  it('expira o probe do banco sem consultar detalhes na resposta', async () => {
    jest.useFakeTimers();
    const prisma = {
      $queryRawUnsafe: jest.fn().mockImplementation(() => new Promise(() => {})),
    };
    const service = new HealthService(prisma as never, configService as never, { status: 'disabled' } as never);
    const assertion = expect(service.ready()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );

    await jest.advanceTimersByTimeAsync(1_000);
    await assertion;
  });
});
