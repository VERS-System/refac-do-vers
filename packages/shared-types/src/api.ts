// Contratos transversais de resposta, erro e paginação da API REST do VERS.

export type ApiErrorCode =
  | 'AUTH_EMAIL_ALREADY_REGISTERED'
  | 'AUTH_INVALID_CREDENTIALS'
  | 'AUTH_INVALID_REFRESH_TOKEN'
  | 'AUTH_SESSION_REVOKED'
  | 'AUTH_UNAUTHORIZED'
  | 'CONFIGURATION_NOT_FOUND'
  | 'CONFLICT'
  | 'INSTALLATION_NOT_FOUND'
  | 'INSTALLATION_STATE_CONFLICT'
  | 'INTERNAL_SERVER_ERROR'
  | 'RATE_LIMIT_EXCEEDED'
  | 'RESOURCE_NOT_FOUND'
  | 'SERVICE_UNAVAILABLE'
  | 'SUPPORT_REQUEST_NOT_FOUND'
  | 'TEST_NOT_FOUND'
  | 'TEST_STATE_CONFLICT'
  | 'USER_NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'VEHICLE_LICENSE_PLATE_ALREADY_REGISTERED'
  | 'VEHICLE_NOT_FOUND';

export interface ApiErrorDetail {
  field?: string;
  code?: string;
  message: string;
}

export interface ApiError {
  code: ApiErrorCode;
  message: string;
  details: ApiErrorDetail[];
}

export interface ApiSuccessResponse<
  TData,
  TMeta = Record<string, never>,
> {
  data: TData;
  meta?: TMeta;
  requestId: string;
}

export interface ApiErrorResponse {
  error: ApiError;
  requestId: string;
  timestamp: string;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface PaginatedResponse<TItem> {
  data: TItem[];
  meta: PaginationMeta;
  requestId: string;
}
