// Middleware de correlacao que garante um requestId por requisicao HTTP.

import { randomUUID } from 'crypto';
import { NextFunction, Response } from 'express';
import { RequestWithRequestId } from './request-context';

const REQUEST_ID_HEADER = 'x-request-id';
const TRUSTED_REQUEST_ID_PATTERN = /^[A-Za-z0-9._:-]{1,80}$/;

/**
 * Valida o requestId enviado pelo cliente antes de reaproveita-lo.
 * IDs fora do formato seguro sao descartados para proteger logs e headers.
 */
function normalizeIncomingRequestId(value: string | undefined): string | null {
  if (!value || !TRUSTED_REQUEST_ID_PATTERN.test(value)) {
    return null;
  }

  return value;
}

/**
 * Cria o middleware usado pelo bootstrap para anexar e propagar correlacao.
 * O mesmo ID fica disponivel para filtros, interceptors, logs e resposta HTTP.
 */
export function createRequestIdMiddleware(): (
  request: RequestWithRequestId,
  response: Response,
  next: NextFunction,
) => void {
  return (
    request: RequestWithRequestId,
    response: Response,
    next: NextFunction,
  ): void => {
    const requestId =
      normalizeIncomingRequestId(request.header(REQUEST_ID_HEADER)) ??
      randomUUID();

    request.requestId = requestId;
    response.setHeader(REQUEST_ID_HEADER, requestId);
    next();
  };
}
