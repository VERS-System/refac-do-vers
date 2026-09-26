// Interceptor de logs estruturados para requisicoes HTTP do backend.

import {
  CallHandler,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  LoggerService,
  NestInterceptor,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { getRequestId, RequestWithRequestId } from '../http/request-context';

type HttpLogger = Pick<LoggerService, 'log' | 'error'>;

/**
 * Normaliza a rota logada sem query string nem dados pessoais.
 * Quando o Nest possui `route.path`, ele e preferido ao `originalUrl`.
 */
function getRoutePattern(request: Request): string {
  const routePath = request.route?.path;
  if (typeof routePath === 'string') {
    return routePath;
  }

  return request.originalUrl.split('?')[0].replace(/^\/api\/v1/, '') || '/';
}

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(
    private readonly logger: HttpLogger = new Logger(LoggingInterceptor.name),
  ) {}

  /**
   * Registra apenas metadados operacionais seguros da requisicao.
   * Corpo, query string, cookies, authorization, email e placa ficam fora do log.
   */
  intercept(
    context: ExecutionContext,
    next: CallHandler<unknown>,
  ): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<RequestWithRequestId>();
    const response = http.getResponse<Response>();
    const startedAt = Date.now();

    return next.handle().pipe(
      tap(() => {
        this.logger.log({
          event: 'http_request_completed',
          method: request.method,
          route: getRoutePattern(request),
          statusCode: response.statusCode,
          durationMs: Date.now() - startedAt,
          requestId: getRequestId(request),
        });
      }),
      catchError((error: unknown) => {
        const statusCode =
          error instanceof HttpException
            ? error.getStatus()
            : HttpStatus.INTERNAL_SERVER_ERROR;

        this.logger.error({
          event: 'http_request_failed',
          method: request.method,
          route: getRoutePattern(request),
          statusCode,
          durationMs: Date.now() - startedAt,
          requestId: getRequestId(request),
        });

        return throwError(() => error);
      }),
    );
  }
}
