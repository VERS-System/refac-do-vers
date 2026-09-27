// Filtro global que transforma excecoes em erros publicos estaveis.

import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import {
  ApiErrorCode,
  ApiErrorDetail,
} from '../../../../../packages/shared-types/src/api';
import { getRequestId, RequestWithRequestId } from '../http/request-context';

type ExceptionResponseBody = {
  code?: ApiErrorCode;
  message?: string | string[];
  details?: ApiErrorDetail[];
};

const STATUS_TO_CODE: Partial<Record<number, ApiErrorCode>> = {
  [HttpStatus.BAD_REQUEST]: 'VALIDATION_ERROR',
  [HttpStatus.UNAUTHORIZED]: 'AUTH_UNAUTHORIZED',
  [HttpStatus.NOT_FOUND]: 'RESOURCE_NOT_FOUND',
  [HttpStatus.CONFLICT]: 'CONFLICT',
  [HttpStatus.TOO_MANY_REQUESTS]: 'RATE_LIMIT_EXCEEDED',
  [HttpStatus.SERVICE_UNAVAILABLE]: 'SERVICE_UNAVAILABLE',
  [HttpStatus.INTERNAL_SERVER_ERROR]: 'INTERNAL_SERVER_ERROR',
};

const CODE_TO_MESSAGE: Record<ApiErrorCode, string> = {
  AUTH_EMAIL_ALREADY_REGISTERED: 'Email ja vinculado a uma conta.',
  AUTH_INVALID_CREDENTIALS: 'Credenciais invalidas.',
  AUTH_INVALID_REFRESH_TOKEN: 'Refresh token invalido.',
  AUTH_SESSION_REVOKED: 'Sessao revogada.',
  AUTH_UNAUTHORIZED: 'Autenticacao obrigatoria.',
  CONFIGURATION_NOT_FOUND: 'Configuracao nao encontrada.',
  CONFLICT: 'Recurso em conflito.',
  INSTALLATION_NOT_FOUND: 'Instalacao nao encontrada.',
  INSTALLATION_STATE_CONFLICT: 'Estado da instalacao em conflito.',
  INTERNAL_SERVER_ERROR: 'Erro interno inesperado.',
  RATE_LIMIT_EXCEEDED: 'Limite de requisicoes excedido.',
  RESOURCE_NOT_FOUND: 'Recurso nao encontrado.',
  SERVICE_UNAVAILABLE: 'Servico temporariamente indisponivel.',
  SUPPORT_REQUEST_NOT_FOUND: 'Solicitacao de suporte nao encontrada.',
  TEST_NOT_FOUND: 'Teste nao encontrado.',
  TEST_STATE_CONFLICT: 'Estado do teste em conflito.',
  USER_NOT_FOUND: 'Usuario nao encontrado.',
  VALIDATION_ERROR: 'Nao foi possivel processar a solicitacao.',
  VEHICLE_LICENSE_PLATE_ALREADY_REGISTERED: 'Placa ja cadastrada.',
  VEHICLE_NOT_FOUND: 'Veiculo nao encontrado.',
};

/**
 * Extrai detalhes seguros de validacao sem incluir stack, SQL ou payload.
 * Mensagens desconhecidas viram uma lista vazia para nao vazar internals.
 */
function createDetails(body: ExceptionResponseBody): ApiErrorDetail[] {
  if (Array.isArray(body.details)) {
    return body.details;
  }

  if (Array.isArray(body.message)) {
    return body.message.map((message) => ({ message }));
  }

  return [];
}

/**
 * Converte qualquer erro conhecido ou inesperado no envelope publico.
 * O filtro preserva o status HTTP, mas nunca devolve stack trace ao cliente.
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const response = http.getResponse<Response>();
    const request = http.getRequest<RequestWithRequestId>();
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const body =
      exception instanceof HttpException
        ? (exception.getResponse() as ExceptionResponseBody | string)
        : {};
    const normalizedBody: ExceptionResponseBody =
      typeof body === 'string' ? { message: body } : body;
    const code: ApiErrorCode =
      normalizedBody.code ?? STATUS_TO_CODE[status] ?? 'INTERNAL_SERVER_ERROR';

    response.status(status).json({
      error: {
        code,
        message: CODE_TO_MESSAGE[code],
        details: createDetails(normalizedBody),
      },
      requestId: getRequestId(request),
      timestamp: new Date().toISOString(),
    });
  }
}
