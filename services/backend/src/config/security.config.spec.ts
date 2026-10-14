// Testes unitários das políticas HTTP aplicadas pelo Helmet no backend VERS.

import { createHelmetConfig } from './security.config';

describe('createHelmetConfig', () => {
  it('desabilita CSP no desenvolvimento para não bloquear ferramentas locais', () => {
    expect(createHelmetConfig('development')).toMatchObject({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    });
  });

  it('mantém CSP habilitada em produção', () => {
    const config = createHelmetConfig('production');

    expect(config.contentSecurityPolicy).not.toBe(false);
    expect(config.crossOriginResourcePolicy).toEqual({
      policy: 'same-site',
    });
  });

  it('usa a política compatível com testes automatizados', () => {
    expect(createHelmetConfig('test').contentSecurityPolicy).toBe(false);
  });
});
