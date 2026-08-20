// Testes unitários da construção das regras CORS do backend VERS.

import { createCorsConfig } from './cors.config';

describe('createCorsConfig', () => {
  it('normaliza origens e remove valores duplicados', () => {
    const config = createCorsConfig(
      ' http://localhost:3001,https://app.vers.dev,http://localhost:3001 ',
    );

    expect(config.origin).toEqual([
      'http://localhost:3001',
      'https://app.vers.dev',
    ]);
    expect(config.credentials).toBe(true);
  });

  it('ignora separadores sem uma origem associada', () => {
    const config = createCorsConfig(
      'http://localhost:3001, ,https://app.vers.dev,',
    );

    expect(config.origin).toEqual([
      'http://localhost:3001',
      'https://app.vers.dev',
    ]);
  });

  it('rejeita uma lista sem origens utilizáveis', () => {
    expect(() => createCorsConfig(' , , ')).toThrow(
      'CORS_ORIGINS deve possuir ao menos uma origem',
    );
  });
});
