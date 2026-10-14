// Testa os contratos de abertura e acompanhamento de revisões do sistema VERS.

import type {
  ApiSuccessResponse,
  CreateSupportRequest,
  PaginatedResponse,
  SupportRequest,
  SupportSearchQuery,
} from '../src/index';
import { supportRequestFixture, supportRequestListFixture } from '../src/index';

const create: CreateSupportRequest = {
  vehicleId: '00000000-0000-4000-8000-000000000101',
  installationId: '00000000-0000-4000-8000-000000000201',
  reason: 'Solicitar avaliação da montagem',
};
const search: SupportSearchQuery = { page: 1, pageSize: 20, status: 'OPEN' };
const one: ApiSuccessResponse<SupportRequest> = {
  data: supportRequestFixture,
  requestId: 'request-support-001',
};
const many: PaginatedResponse<SupportRequest> = supportRequestListFixture;

void create;
void search;
void one;
void many;

// @ts-expect-error A solicitação de revisão deve indicar um veículo.
const withoutVehicle: CreateSupportRequest = { reason: 'Revisão' };
void withoutVehicle;

// @ts-expect-error Documentos pessoais não fazem parte do contrato de suporte.
const withCpf: CreateSupportRequest = { vehicleId: 'vehicle-1', reason: 'Revisão', cpf: '00000000000' };
void withCpf;

// @ts-expect-error O cliente não escolhe o estado inicial da solicitação.
const setStatus: CreateSupportRequest = { vehicleId: 'vehicle-1', reason: 'Revisão', status: 'RESOLVED' };
void setStatus;
