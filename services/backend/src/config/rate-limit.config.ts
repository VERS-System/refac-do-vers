// Constrói a janela global de limite de requisições do backend VERS.

import { ThrottlerModuleOptions } from '@nestjs/throttler';

/**
 * Converte a janela legível em segundos para o TTL em milissegundos do Nest.
 * A validação Joi garante previamente que janela e limite sejam positivos.
 */
export function createRateLimitConfig(
  ttlSeconds: number,
  maxRequests: number,
): ThrottlerModuleOptions {
  return [
    {
      ttl: ttlSeconds * 1_000,
      limit: maxRequests,
    },
  ];
}
