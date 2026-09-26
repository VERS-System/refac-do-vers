// Testa contratos de consulta de telemetria, resumos de energia e comparação.

import type {
  ApiSuccessResponse,
  CompareTestsQuery,
  EnergySummary,
  PaginatedResponse,
  SummarySearchQuery,
  TelemetrySample,
  TelemetrySearchQuery,
  TestComparison,
} from '../src/index';
import {
  energySummaryFixture,
  energySummaryListFixture,
  telemetrySampleFixture,
  telemetrySampleListFixture,
  testComparisonFixture,
} from '../src/index';

const telemetryQuery: TelemetrySearchQuery = {
  page: 1,
  pageSize: 20,
  capturedFrom: '2026-09-22T12:00:00.000Z',
  capturedTo: '2026-09-22T12:05:00.000Z',
  quality: 'VALID',
};
const summaryQuery: SummarySearchQuery = {
  page: 1,
  pageSize: 20,
  periodType: 'HOUR',
  periodFrom: '2026-09-22T00:00:00.000Z',
  periodTo: '2026-09-23T00:00:00.000Z',
};
const comparisonQuery: CompareTestsQuery = { testIds: ['test-1', 'test-2'] };
// @ts-expect-error A comparação requer pelo menos dois testes.
const comparisonWithOneTest: CompareTestsQuery = { testIds: ['test-1'] };
void comparisonWithOneTest;
// @ts-expect-error A comparação aceita no máximo cinco testes.
const comparisonWithSixTests: CompareTestsQuery = { testIds: ['1', '2', '3', '4', '5', '6'] };
void comparisonWithSixTests;
const sample: ApiSuccessResponse<TelemetrySample> = {
  data: telemetrySampleFixture,
  requestId: 'request-sample-001',
};
const samples: PaginatedResponse<TelemetrySample> = telemetrySampleListFixture;
const summary: ApiSuccessResponse<EnergySummary> = {
  data: energySummaryFixture,
  requestId: 'request-summary-001',
};
const summaries: PaginatedResponse<EnergySummary> = energySummaryListFixture;
const comparison: ApiSuccessResponse<TestComparison> = {
  data: testComparisonFixture,
  requestId: 'request-comparison-001',
};

void telemetryQuery;
void summaryQuery;
void comparisonQuery;
void sample;
void samples;
void summary;
void summaries;
void comparison;

// @ts-expect-error Leituras indisponíveis são nulas, não strings sem unidade.
const invalidVoltage: TelemetrySample = { ...telemetrySampleFixture, voltageV: '3.72' };
void invalidVoltage;

// @ts-expect-error Dinheiro usa decimal serializado como string.
const invalidMoney: EnergySummary = { ...energySummaryFixture, moneySaved: 0.01 };
void invalidMoney;

// @ts-expect-error A qualidade pertence ao catálogo público.
const invalidQuality: TelemetrySample = { ...telemetrySampleFixture, quality: 'UNKNOWN' };
void invalidQuality;
