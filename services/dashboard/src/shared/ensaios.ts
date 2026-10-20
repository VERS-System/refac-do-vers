/** Contrato restrito de ensaios; somente dados públicos cruzam a ponte Electron. */
import type { TestRecord, TestSearchQuery, CreateTestRequest, FinishTestRequest, CancelTestRequest,
  TelemetrySample, TelemetrySearchQuery, EnergySummary, TestComparison } from '@vers/shared-types';
import type { ResultadoCadastro } from './cadastro';

export interface PonteEnsaios {
  listar(query: TestSearchQuery): Promise<ResultadoCadastro<TestRecord[]>>;
  criar(dados: CreateTestRequest): Promise<ResultadoCadastro<TestRecord>>;
  iniciar(id: string): Promise<ResultadoCadastro<TestRecord>>;
  finalizar(id: string, dados: FinishTestRequest): Promise<ResultadoCadastro<TestRecord>>;
  cancelar(id: string, dados: CancelTestRequest): Promise<ResultadoCadastro<TestRecord>>;
  amostras(id: string, query: TelemetrySearchQuery): Promise<ResultadoCadastro<TelemetrySample[]>>;
  resumos(id: string): Promise<ResultadoCadastro<EnergySummary[]>>;
  comparar(testIds: string[]): Promise<ResultadoCadastro<TestComparison>>;
}
