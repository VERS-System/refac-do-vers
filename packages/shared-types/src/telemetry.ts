// Define consultas públicas de telemetria validada, energia e comparação VERS.

export type TelemetryQuality = 'VALID' | 'PARTIAL' | 'SUSPECT' | 'INVALID';
export type SummaryPeriod = 'TEST' | 'HOUR' | 'DAY' | 'MONTH';
export type SummaryQuality = 'GOOD' | 'PARTIAL' | 'INVALID';

export interface TelemetrySample {
  id: string;
  testId: string | null;
  capturedAt: string;
  voltageV: number | null;
  currentA: number | null;
  powerW: number | null;
  devicePowerW: number | null;
  accumulatedEnergyWh: number | null;
  accelerationXMs2: number | null;
  accelerationYMs2: number | null;
  accelerationZMs2: number | null;
  vibrationRmsMs2: number | null;
  temperatureC: number | null;
  activePiezoCount: number | null;
  quality: TelemetryQuality;
}

export interface TelemetrySearchQuery {
  page?: number;
  pageSize?: number;
  capturedFrom?: string;
  capturedTo?: string;
  quality?: TelemetryQuality;
}

export interface EnergySummary {
  id: string;
  installationId: string | null;
  testId: string | null;
  periodType: SummaryPeriod;
  periodStart: string;
  periodEnd: string;
  recoveredEnergyWh: number;
  vehicleEnergyUsedWh: number | null;
  averagePowerW: number | null;
  peakPowerW: number | null;
  moneySaved: string | null;
  currencyCode: string | null;
  energyTariffPerKwh: string | null;
  sampleCount: number;
  quality: SummaryQuality;
  calculatedAt: string;
}

export interface SummarySearchQuery {
  page?: number;
  pageSize?: number;
  periodType?: SummaryPeriod;
  periodFrom?: string;
  periodTo?: string;
}

export interface CompareTestsQuery {
  testIds:
    | [string, string]
    | [string, string, string]
    | [string, string, string, string]
    | [string, string, string, string, string];
}

export interface TestComparisonItem {
  testId: string;
  summary: EnergySummary | null;
}

export interface TestComparison {
  items: TestComparisonItem[];
}
