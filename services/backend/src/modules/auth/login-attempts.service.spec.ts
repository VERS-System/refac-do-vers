// Verifica limites progressivos e armazenamento sem email em claro no Redis.

import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';
import { LoginAttemptsService } from './login-attempts.service';

describe('LoginAttemptsService', () => {
  const getOrThrow = jest.fn((key: string) => ({
    REDIS_HOST: 'localhost', REDIS_PORT: 6379, JWT_ACCESS_SECRET: 'segredo-de-teste-com-mais-de-16-caracteres',
  })[key]);
  const config = { getOrThrow } as unknown as ConfigService;
  let service: LoginAttemptsService;
  let count: number;
  let set: jest.SpyInstance;

  beforeEach(() => {
    count = 0;
    jest.spyOn(Redis.prototype, 'incr').mockImplementation(async () => ++count);
    jest.spyOn(Redis.prototype, 'expire').mockResolvedValue(1);
    jest.spyOn(Redis.prototype, 'pttl').mockResolvedValue(-2);
    set = jest.spyOn(Redis.prototype, 'set').mockResolvedValue('OK');
    jest.spyOn(Redis.prototype, 'del').mockResolvedValue(2);
    jest.spyOn(Redis.prototype, 'disconnect').mockImplementation();
    service = new LoginAttemptsService(config);
  });

  afterEach(async () => {
    await service.onModuleDestroy();
    jest.restoreAllMocks();
  });

  it('aplica 15 minutos, 1 hora e 24 horas após 8, 12 e 14 erros', async () => {
    for (let attempt = 1; attempt <= 14; attempt += 1) {
      const lock = await service.recordFailure('ana@example.com');
      expect(lock).toBe(({ 8: 900_000, 12: 3_600_000, 14: 86_400_000 } as Record<number, number>)[attempt] ?? 0);
    }
    expect(set).toHaveBeenCalledTimes(3);
    expect(set.mock.calls.map((call) => call[3])).toEqual([900_000, 3_600_000, 86_400_000]);
    expect(JSON.stringify(set.mock.calls)).not.toContain('ana@example.com');
  });

  it('rejeita login durante espera e zera contagem após sucesso', async () => {
    (Redis.prototype.pttl as jest.Mock).mockResolvedValueOnce(900_000);
    await expect(service.assertAllowed('ana@example.com')).rejects.toMatchObject({ status: 429 });
    await service.clear('ana@example.com');
    expect(Redis.prototype.del).toHaveBeenCalled();
  });

  it('falha fechado se o Redis estiver indisponível', async () => {
    (Redis.prototype.pttl as jest.Mock).mockRejectedValueOnce(new Error('redis unavailable'));
    await expect(service.assertAllowed('ana@example.com')).rejects.toMatchObject({ status: 503 });
  });
});
