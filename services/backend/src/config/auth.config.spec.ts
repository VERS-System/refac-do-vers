// Testes unitários da configuração de autenticação do backend VERS.

import { createAuthConfig } from './auth.config';

describe('createAuthConfig', () => {
  it('mapeia segredo e expiração para o namespace de autenticação', () => {
    expect(createAuthConfig('segredo-seguro-do-vers', '15m')).toEqual({
      jwtSecret: 'segredo-seguro-do-vers',
      jwtExpiration: '15m',
    });
  });

  it('preserva a duração validada para tokens de maior duração', () => {
    expect(createAuthConfig('outro-segredo-seguro', '7d')).toEqual({
      jwtSecret: 'outro-segredo-seguro',
      jwtExpiration: '7d',
    });
  });
});
