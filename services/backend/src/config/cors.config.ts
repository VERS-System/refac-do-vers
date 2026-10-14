// Constrói as regras CORS a partir das origens validadas do ambiente.

import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

/**
 * Converte a lista textual de origens em opções CORS normalizadas.
 * Valores vazios e repetidos são removidos para manter uma única fonte clara.
 */
export function createCorsConfig(originsValue: string): CorsOptions {
  const origins = [
    ...new Set(
      originsValue
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean),
    ),
  ];

  if (origins.length === 0) {
    throw new Error('CORS_ORIGINS deve possuir ao menos uma origem');
  }

  return {
    origin: origins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['content-type', 'authorization', 'x-request-id', 'x-csrf-token'],
    exposedHeaders: ['x-request-id'],
    credentials: true,
  };
}
