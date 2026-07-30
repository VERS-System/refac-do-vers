// Configuração de segurança
//
// Define as opções do helmet para proteção contra ataques comuns
// (XSS, clickjacking, MIME sniffing, etc).

import { HelmetOptions } from 'helmet';

export const helmetConfig: HelmetOptions = {
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false, // desabilitado para desenvolvimento
};
