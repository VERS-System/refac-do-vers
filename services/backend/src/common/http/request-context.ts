// Tipos compartilhados do contexto HTTP interno do backend.

import { Request } from 'express';

export interface RequestWithRequestId extends Request {
  requestId?: string;
}

/**
 * Recupera o requestId confiavel anexado pelo middleware de correlacao.
 * A funcao centraliza o fallback para evitar IDs divergentes em erro e sucesso.
 */
export function getRequestId(request: RequestWithRequestId): string {
  return request.requestId ?? 'request-unavailable';
}
