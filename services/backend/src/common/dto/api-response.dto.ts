// Contratos e fábricas das respostas HTTP compartilhadas por todas as APIs do VERS.

export interface ApiResponse<TData, TMeta = Record<string, unknown>> {
  data: TData;
  meta?: TMeta;
  requestId: string;
}

export interface ApiErrorBody<TDetails = unknown[]> {
  code: string;
  message: string;
  details?: TDetails;
}

export interface ApiErrorResponse<TDetails = unknown[]> {
  error: ApiErrorBody<TDetails>;
  requestId: string;
  timestamp: string;
}

/**
 * Monta o envelope único de sucesso usado pelos clientes mobile e desktop.
 * Ele existe para impedir formatos diferentes entre controllers e inclui os
 * metadados somente quando a operação realmente os fornece.
 */
export function createApiResponse<
  TData,
  TMeta = Record<string, unknown>,
>(data: TData, requestId: string, meta?: TMeta): ApiResponse<TData, TMeta> {
  return meta === undefined
    ? { data, requestId }
    : { data, meta, requestId };
}

/**
 * Monta o envelope seguro e estável de erro retornado pelas APIs do VERS.
 * Ele separa o código consumido pelo cliente da mensagem apresentada e converte
 * a data recebida para ISO, permitindo testes e rastreabilidade consistentes.
 */
export function createApiErrorResponse<TDetails = unknown[]>(
  code: string,
  message: string,
  requestId: string,
  occurredAt: Date = new Date(),
  details?: TDetails,
): ApiErrorResponse<TDetails> {
  const error =
    details === undefined
      ? { code, message }
      : { code, message, details };

  return {
    error,
    requestId,
    timestamp: occurredAt.toISOString(),
  };
}
