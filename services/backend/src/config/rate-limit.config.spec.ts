// Testes unitários da configuração de limite de requisições do backend VERS.

import { createRateLimitConfig } from './rate-limit.config';

describe('createRateLimitConfig', () => {
  it('converte a janela de segundos para milissegundos', () => {
    expect(createRateLimitConfig(60, 100)).toEqual([
      {
        ttl: 60_000,
        limit: 100,
      },
    ]);
  });

  it('preserva limites menores para cenários mais restritivos', () => {
    expect(createRateLimitConfig(10, 5)).toEqual([
      {
        ttl: 10_000,
        limit: 5,
      },
    ]);
  });
});
