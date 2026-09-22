// Testa os contratos de criação, transição e consulta dos testes experimentais.

import type {
  ApiSuccessResponse,
  CancelTestRequest,
  CreateTestRequest,
  FinishTestRequest,
  PaginatedResponse,
  StartTestRequest,
  TestRecord,
  TestSearchQuery,
} from '../src/index';
import { testListFixture, testRecordFixture } from '../src/index';

const create: CreateTestRequest = {
  installationId: '00000000-0000-4000-8000-000000000201',
  configurationId: '00000000-0000-4000-8000-000000000203',
  name: 'Percurso de demonstração',
  terrain: 'CITY',
  testLocation: 'Pista de testes',
  vehicleWeightKg: 1200,
};
const start: StartTestRequest = {};
const finish: FinishTestRequest = {
  status: 'COMPLETED',
  outcome: 'SATISFACTORY',
  averageSpeedKph: 32,
};
const cancel: CancelTestRequest = { reason: 'Montagem interrompida' };
const search: TestSearchQuery = {
  page: 1,
  pageSize: 20,
  status: 'COMPLETED',
  startedFrom: '2026-09-22T00:00:00.000Z',
  startedTo: '2026-09-23T00:00:00.000Z',
};
const one: ApiSuccessResponse<TestRecord> = {
  data: testRecordFixture,
  requestId: 'request-test-001',
};
const many: PaginatedResponse<TestRecord> = testListFixture;

void create;
void start;
void finish;
void cancel;
void search;
void one;
void many;

// @ts-expect-error Placa não integra o registro histórico do teste.
const withPlate: TestRecord = { ...testRecordFixture, licensePlate: 'ABC1D23' };
void withPlate;

// @ts-expect-error Medições pertencem à telemetria, não ao contexto do teste.
const withPower: TestRecord = { ...testRecordFixture, powerW: 5 };
void withPower;

// @ts-expect-error O cliente não informa o instante de início, atribuído pelo servidor.
const startAtClientTime: StartTestRequest = { startedAt: '2026-09-22T12:00:00.000Z' };
void startAtClientTime;

// @ts-expect-error A finalização não pode voltar o teste para PLANNED.
const invalidFinish: FinishTestRequest = { status: 'PLANNED' };
void invalidFinish;
