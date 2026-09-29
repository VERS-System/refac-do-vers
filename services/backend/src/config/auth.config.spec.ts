// Testes unitários da configuração de autenticação do backend VERS.

import { createAuthConfig } from './auth.config';

describe('createAuthConfig', () => {
  it('separa os segredos e as durações de access e refresh', () => {
    expect(createAuthConfig('segredo-access', 'segredo-refresh', '15m', '7d')).toEqual({
      accessSecret: 'segredo-access',
      refreshSecret: 'segredo-refresh',
      accessExpiration: '15m',
      refreshExpiration: '7d',
    });
  });
});
