// Interceptor que aplica o envelope publico de sucesso das APIs REST.

import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { getRequestId, RequestWithRequestId } from '../http/request-context';

type PublicResponse = Record<string, unknown> & {
  requestId?: string;
  data?: unknown;
  error?: unknown;
};

/**
 * Detecta respostas ja montadas no contrato publico.
 * Isso evita envelope duplo em listas paginadas ou respostas especiais.
 */
function isPublicResponse(value: unknown): value is PublicResponse {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const response = value as PublicResponse;
  return (
    typeof response.requestId === 'string' &&
    ('data' in response || 'error' in response)
  );
}

@Injectable()
export class ResponseEnvelopeInterceptor implements NestInterceptor {
  /**
   * Transforma respostas de sucesso simples em `{ data, requestId }`.
   * Erros sao tratados pelo filtro global para manter os dois caminhos separados.
   */
  intercept(
    context: ExecutionContext,
    next: CallHandler<unknown>,
  ): Observable<unknown> {
    const request = context.switchToHttp().getRequest<RequestWithRequestId>();

    return next.handle().pipe(
      map((body: unknown) => {
        if (isPublicResponse(body)) {
          return { ...body, requestId: getRequestId(request) };
        }

        return {
          data: body ?? null,
          requestId: getRequestId(request),
        };
      }),
    );
  }
}
