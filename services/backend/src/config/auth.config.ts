// Registra as opções JWT consumidas pelos módulos de autenticação do VERS.

import { registerAs } from '@nestjs/config';

export interface AuthConfiguration {
  jwtSecret: string;
  jwtExpiration: string;
}

/**
 * Constrói a configuração de autenticação a partir de valores já validados.
 * A fábrica mantém os nomes de ambiente fora dos módulos que emitem tokens.
 */
export function createAuthConfig(
  jwtSecret: string,
  jwtExpiration: string,
): AuthConfiguration {
  return {
    jwtSecret,
    jwtExpiration,
  };
}

export const authConfig = registerAs('auth', () =>
  createAuthConfig(
    process.env.JWT_SECRET ?? '',
    process.env.JWT_EXPIRATION ?? '7d',
  ),
);
