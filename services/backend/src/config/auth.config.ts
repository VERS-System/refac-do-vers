// Registra as opções JWT consumidas pelos módulos de autenticação do VERS.

import { registerAs } from '@nestjs/config';

export interface AuthConfiguration {
  accessSecret: string;
  refreshSecret: string;
  accessExpiration: string;
  refreshExpiration: string;
}

/**
 * Constrói a configuração de autenticação a partir de valores já validados.
 * A fábrica mantém os nomes de ambiente fora dos módulos que emitem tokens.
 */
export function createAuthConfig(
  accessSecret: string,
  refreshSecret: string,
  accessExpiration: string,
  refreshExpiration: string,
): AuthConfiguration {
  return {
    accessSecret,
    refreshSecret,
    accessExpiration,
    refreshExpiration,
  };
}

export const authConfig = registerAs('auth', () =>
  createAuthConfig(
    process.env.JWT_ACCESS_SECRET ?? '',
    process.env.JWT_REFRESH_SECRET ?? '',
    process.env.JWT_ACCESS_EXPIRATION ?? '15m',
    process.env.JWT_REFRESH_EXPIRATION ?? '7d',
  ),
);
