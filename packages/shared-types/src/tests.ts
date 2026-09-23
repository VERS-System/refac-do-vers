// Define o contrato público e as transições solicitadas para testes do VERS.

export type TestStatus = 'PLANNED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
export type TerrainType = 'HIGHWAY' | 'CITY' | 'OFFROAD' | 'MIXED' | 'OTHER';
export type TestOutcome = 'SATISFACTORY' | 'UNSATISFACTORY' | 'INCONCLUSIVE';

export interface TestSnapshot {
  vehicleModel: string | null;
  testLocation: string;
  activePiezoCount: number;
  configurationVersion: number;
}

export interface TestRecord {
  id: string;
  installationId: string | null;
  configurationId: string | null;
  createdById: string | null;
  name: string;
  status: TestStatus;
  terrain: TerrainType;
  snapshot: TestSnapshot;
  startedAt: string | null;
  endedAt: string | null;
  vehicleWeightKg: number | null;
  averageEngineRpm: number | null;
  averageSpeedKph: number | null;
  inclineDegrees: number | null;
  outcome: TestOutcome | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTestRequest {
  installationId: string;
  configurationId: string;
  name: string;
  terrain: TerrainType;
  testLocation: string;
  vehicleWeightKg?: number | null;
  notes?: string | null;
}

export type StartTestRequest = Record<string, never>;

export interface FinishTestRequest {
  status: 'COMPLETED' | 'FAILED';
  outcome?: TestOutcome | null;
  averageEngineRpm?: number | null;
  averageSpeedKph?: number | null;
  inclineDegrees?: number | null;
  vehicleWeightKg?: number | null;
  notes?: string | null;
}

export interface CancelTestRequest {
  reason?: string;
}

export interface TestSearchQuery {
  page?: number;
  pageSize?: number;
  installationId?: string;
  status?: TestStatus;
  startedFrom?: string;
  startedTo?: string;
}
