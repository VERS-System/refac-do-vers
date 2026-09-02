// Define as políticas HTTP do Helmet conforme o ambiente do backend VERS.

import { HelmetOptions } from 'helmet';

/**
 * Monta políticas permissivas apenas para ferramentas locais e testes.
 * Em produção, habilita CSP e restringe recursos ao mesmo site.
 */
export function createHelmetConfig(nodeEnvironment: string): HelmetOptions {
  const isProduction = nodeEnvironment === 'production';

  return {
    contentSecurityPolicy: isProduction,
    crossOriginResourcePolicy: {
      policy: isProduction ? 'same-site' : 'cross-origin',
    },
  };
}
