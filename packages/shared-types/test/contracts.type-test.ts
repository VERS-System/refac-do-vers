// Testes de compilação dos contratos públicos compartilhados da API VERS.

import type {
  ApiErrorResponse,
  ApiSuccessResponse,
  PaginatedResponse,
} from '../src/index';

interface ExampleResource {
  id: string;
}

const successResponse: ApiSuccessResponse<ExampleResource> = {
  data: { id: 'resource-001' },
  requestId: 'request-success-001',
};

const paginatedResponse: PaginatedResponse<ExampleResource> = {
  data: [{ id: 'resource-001' }],
  meta: {
    page: 1,
    pageSize: 20,
    totalItems: 1,
    totalPages: 1,
  },
  requestId: 'request-page-001',
};

const errorResponse: ApiErrorResponse = {
  error: {
    code: 'AUTH_INVALID_CREDENTIALS',
    message: 'Não foi possível autenticar com as credenciais informadas.',
    details: [],
  },
  requestId: 'request-error-001',
  timestamp: '2026-09-21T12:00:00.000Z',
};

void successResponse;
void paginatedResponse;
void errorResponse;

const invalidErrorResponse: ApiErrorResponse = {
  error: {
    // @ts-expect-error Códigos de erro públicos precisam pertencer ao catálogo.
    code: 'INTERNAL_STACK_TRACE',
    message: 'Erro inválido.',
    details: [],
  },
  requestId: 'request-error-002',
  timestamp: '2026-09-21T12:00:00.000Z',
};
void invalidErrorResponse;
