// Fixtures sintéticas e tipadas para integração dos clientes com a API VERS.

import type { AuthResponse } from './auth';
import type { PaginatedResponse } from './api';
import type { Configuration, Installation } from './installations';
import type { EnergySummary, TelemetrySample, TestComparison } from './telemetry';
import type { SupportRequest } from './support';
import type { TestRecord } from './tests';
import type { UserProfile } from './users';
import type { Vehicle } from './vehicles';

export const userProfileFixture = {
  id: '00000000-0000-4000-8000-000000000001',
  email: 'ana@example.com',
  displayName: 'Ana Silva',
  avatarUrl: null,
  roles: ['USER'],
  status: 'ACTIVE',
  emailVerifiedAt: '2026-09-20T12:00:00.000Z',
  createdAt: '2026-09-20T12:00:00.000Z',
  updatedAt: '2026-09-20T12:00:00.000Z',
} satisfies UserProfile;

export const authResponseFixture = {
  user: userProfileFixture,
} satisfies AuthResponse;

export const vehicleFixture = {
  id: '00000000-0000-4000-8000-000000000101',
  licensePlate: 'ABC1D23',
  brand: 'Marca Exemplo',
  model: 'Modelo Exemplo',
  modelYear: 2026,
  relationship: 'OWNER',
  isPrimary: true,
  createdAt: '2026-09-20T12:00:00.000Z',
  updatedAt: '2026-09-20T12:00:00.000Z',
} satisfies Vehicle;

export const vehicleListFixture = {
  data: [vehicleFixture],
  meta: {
    page: 1,
    pageSize: 20,
    totalItems: 1,
    totalPages: 1,
  },
  requestId: 'request-vehicles-001',
} satisfies PaginatedResponse<Vehicle>;

export const installationFixture = {
  id: '00000000-0000-4000-8000-000000000201',
  vehicleId: vehicleFixture.id,
  systemModel: 'VERS Protótipo A',
  status: 'ACTIVE',
  installedAt: '2026-09-20T12:00:00.000Z',
  activeDevice: {
    id: '00000000-0000-4000-8000-000000000202',
    name: 'ESP32 de demonstração',
    firmwareVersion: '0.1.0',
    status: 'ONLINE',
    lastSeenAt: '2026-09-22T12:00:00.000Z',
  },
  createdAt: '2026-09-20T12:00:00.000Z',
  updatedAt: '2026-09-20T12:00:00.000Z',
} satisfies Installation;

export const installationListFixture = {
  data: [installationFixture],
  meta: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 },
  requestId: 'request-installations-001',
} satisfies PaginatedResponse<Installation>;

export const configurationFixture = {
  id: '00000000-0000-4000-8000-000000000203',
  installationId: installationFixture.id,
  name: 'Montagem inicial',
  version: 1,
  activePiezoCount: 8,
  piezoAssociation: 'PARALLEL',
  installationPoint: 'Suporte de testes',
  storageType: 'CAPACITOR',
  notes: null,
  createdAt: '2026-09-20T12:00:00.000Z',
} satisfies Configuration;

export const configurationListFixture = {
  data: [configurationFixture],
  meta: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 },
  requestId: 'request-configurations-001',
} satisfies PaginatedResponse<Configuration>;

export const testRecordFixture = {
  id: '00000000-0000-4000-8000-000000000301',
  installationId: installationFixture.id,
  configurationId: configurationFixture.id,
  createdById: userProfileFixture.id,
  name: 'Percurso de demonstração',
  status: 'COMPLETED',
  terrain: 'CITY',
  snapshot: {
    vehicleModel: 'Modelo Exemplo',
    testLocation: 'Pista de testes',
    activePiezoCount: 8,
    configurationVersion: 1,
  },
  startedAt: '2026-09-22T12:00:00.000Z',
  endedAt: '2026-09-22T12:05:00.000Z',
  vehicleWeightKg: 1200,
  averageEngineRpm: 1900,
  averageSpeedKph: 32,
  inclineDegrees: 0,
  outcome: 'SATISFACTORY',
  notes: null,
  createdAt: '2026-09-22T11:55:00.000Z',
  updatedAt: '2026-09-22T12:05:00.000Z',
} satisfies TestRecord;

export const testListFixture = {
  data: [testRecordFixture],
  meta: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 },
  requestId: 'request-tests-001',
} satisfies PaginatedResponse<TestRecord>;

export const telemetrySampleFixture = {
  id: '00000000-0000-4000-8000-000000000401',
  testId: testRecordFixture.id,
  capturedAt: '2026-09-22T12:00:01.000Z',
  voltageV: 3.72,
  currentA: 0.018,
  powerW: 0.06696,
  devicePowerW: 0.06696,
  accumulatedEnergyWh: 0.0142,
  accelerationXMs2: 0.12,
  accelerationYMs2: 0.31,
  accelerationZMs2: 9.74,
  vibrationRmsMs2: 0.28,
  temperatureC: null,
  activePiezoCount: 8,
  quality: 'VALID',
} satisfies TelemetrySample;

export const telemetrySampleListFixture = {
  data: [telemetrySampleFixture],
  meta: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 },
  requestId: 'request-telemetry-001',
} satisfies PaginatedResponse<TelemetrySample>;

export const energySummaryFixture = {
  id: '00000000-0000-4000-8000-000000000501',
  installationId: installationFixture.id,
  testId: testRecordFixture.id,
  periodType: 'TEST',
  periodStart: '2026-09-22T12:00:00.000Z',
  periodEnd: '2026-09-22T12:05:00.000Z',
  recoveredEnergyWh: 0.0142,
  vehicleEnergyUsedWh: null,
  averagePowerW: 0.06696,
  peakPowerW: 0.081,
  moneySaved: null,
  currencyCode: null,
  energyTariffPerKwh: null,
  sampleCount: 50,
  quality: 'GOOD',
  calculatedAt: '2026-09-22T12:06:00.000Z',
} satisfies EnergySummary;

export const energySummaryListFixture = {
  data: [energySummaryFixture],
  meta: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 },
  requestId: 'request-summaries-001',
} satisfies PaginatedResponse<EnergySummary>;

export const testComparisonFixture = {
  items: [
    { testId: testRecordFixture.id, summary: energySummaryFixture },
    { testId: '00000000-0000-4000-8000-000000000302', summary: null },
  ],
} satisfies TestComparison;

export const supportRequestFixture = {
  id: '00000000-0000-4000-8000-000000000601',
  vehicleId: vehicleFixture.id,
  installationId: installationFixture.id,
  reason: 'Solicitar avaliação da montagem',
  status: 'OPEN',
  createdAt: '2026-09-22T12:10:00.000Z',
  updatedAt: '2026-09-22T12:10:00.000Z',
} satisfies SupportRequest;

export const supportRequestListFixture = {
  data: [supportRequestFixture],
  meta: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 },
  requestId: 'request-support-list-001',
} satisfies PaginatedResponse<SupportRequest>;
