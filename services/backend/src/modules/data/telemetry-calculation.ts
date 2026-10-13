// Calcula série ou intervalo sem persistir ou confundir medição com repartição/estimativa.
import { TelemetrySample } from '@prisma/client';
import { SummaryQuality } from '../../../../../packages/shared-types/src/telemetry';

export const TELEMETRY_CALCULATION_VERSION = 1;

export type CalculationSample = Pick<TelemetrySample, 'id' | 'messageId' | 'sampleIndex' |
  'deviceId' | 'testId' | 'capturedAt' | 'voltageV' | 'currentA' |
  'accumulatedEnergyWh' | 'quality'>;

interface TelemetryCalculation {
  calculationVersion: 1;
  recoveredEnergyWh: number | null;
  estimatedEnergyWh: number | null;
  averagePowerW: number | null;
  peakPowerW: number | null;
  sampleCount: number;
  quality: SummaryQuality;
}

/** Aceita zero medido e recusa ausência, negativos e números não finitos. */
function usable(value: number | null): value is number {
  return value !== null && Number.isFinite(value) && value >= 0;
}

/** Impede resultados não finitos sem arredondar ou fabricar uma medição alternativa. */
function finite(value: number): number {
  if (!Number.isFinite(value)) throw new RangeError('Cálculo de telemetria excedeu o limite numérico.');
  return value;
}

/** Calcula V × I apenas em leituras aproveitáveis, sem usar a potência do dispositivo. */
export function calculatePowerW(row: Pick<CalculationSample, 'voltageV' | 'currentA' | 'quality'>): number | null {
  if ((row.quality !== 'VALID' && row.quality !== 'PARTIAL') ||
    !usable(row.voltageV) || !usable(row.currentA)) return null;
  return finite(row.voltageV * row.currentA);
}

/** Distingue identidades de banco e de envelope, sem colidir campos opcionais ou índices. */
function identities(row: CalculationSample): string[] {
  return [JSON.stringify(['id', row.id]), ...(row.messageId === null ? [] :
    [JSON.stringify(['message', row.messageId, row.sampleIndex])])];
}

/** Compara campos relevantes preservando a diferença entre null, NaN e Infinity. */
function measurements(row: CalculationSample): string {
  return JSON.stringify([row.voltageV, row.currentA, row.accumulatedEnergyWh, row.quality].map(String));
}

/** Detecta repetição conflitante incluindo origem e tempo, sem usar ordem de chegada. */
function signature(row: CalculationSample): string {
  return JSON.stringify([row.deviceId, row.testId, row.messageId, row.sampleIndex,
    row.capturedAt.getTime(), measurements(row)]);
}

/** Ordena origens e recorta deltas/trapézios no intervalo semiaberto, sem alterar a entrada. */
export function calculateTelemetry(samples: readonly CalculationSample[],
  interval?: { start: Date; end: Date }): TelemetryCalculation {
  const start = interval?.start.getTime() ?? -Infinity;
  const end = interval?.end.getTime() ?? Infinity;
  if (interval && (!Number.isFinite(start) || !Number.isFinite(end) || start >= end)) {
    throw new RangeError('Intervalo de cálculo inválido.');
  }
  const result: TelemetryCalculation = { calculationVersion: TELEMETRY_CALCULATION_VERSION, recoveredEnergyWh: null,
    estimatedEnergyWh: null, averagePowerW: null, peakPowerW: null, sampleCount: 0, quality: 'INVALID' };
  const byIdentity = new Map<string, CalculationSample[]>();
  for (const row of samples) {
    if (!Number.isFinite(row.capturedAt.getTime())) throw new RangeError('Timestamp de telemetria inválido.');
    for (const key of identities(row)) {
      const entries = byIdentity.get(key) ?? [];
      entries.push(row);
      byIdentity.set(key, entries);
    }
  }
  const conflicting = new Set<CalculationSample>();
  for (const entries of byIdentity.values()) {
    if (new Set(entries.map(signature)).size > 1) {
      for (const row of entries) conflicting.add(row);
    }
  }
  const seen = new Set<string>();
  const origins = new Map<string, CalculationSample[]>();
  for (const row of samples) {
    const keys = identities(row);
    if (!conflicting.has(row) && keys.some((key) => seen.has(key))) continue;
    for (const key of keys) seen.add(key);
    // Sem dispositivo conhecido, cada amostra fica isolada: IDs nulos não provam origem comum.
    const origin = JSON.stringify([row.deviceId, row.testId, row.deviceId === null ? row.id : null]);
    const entries = origins.get(origin) ?? [];
    entries.push(row);
    origins.set(origin, entries);
  }
  let partial = false;
  let powerSeconds = 0;
  let durationSeconds = 0;
  for (const entries of origins.values()) {
    entries.sort((a, b) => a.capturedAt.getTime() - b.capturedAt.getTime() || a.id.localeCompare(b.id));
    let previous: { time: number; power: number | null; counter: number | null } | null = null;
    for (let index = 0; index < entries.length;) {
      const row = entries[index];
      const time = row.capturedAt.getTime();
      let next = index + 1;
      while (next < entries.length && entries[next].capturedAt.getTime() === time) next++;
      const simultaneous = entries.slice(index, next);
      index = next;
      const inside = time >= start && time < end;
      const from = previous === null ? time : Math.max(previous.time, start);
      const to = Math.min(time, end);
      const overlaps = previous !== null && to > from;
      if (simultaneous.some((entry) => conflicting.has(entry)) ||
        new Set(simultaneous.map(measurements)).size > 1) {
        if (inside || overlaps) partial = true;
        previous = { time, power: null, counter: null };
        continue;
      }
      const power = calculatePowerW(row);
      const counter = (row.quality === 'VALID' || row.quality === 'PARTIAL') &&
        usable(row.accumulatedEnergyWh) ? row.accumulatedEnergyWh : null;
      if (inside && (power !== null || counter !== null)) result.sampleCount += simultaneous.length;
      if (inside && power !== null) result.peakPowerW = Math.max(result.peakPowerW ?? power, power);
      if (inside && (row.quality !== 'VALID' || power === null || counter === null || row.deviceId === null)) partial = true;
      if (previous !== null && overlaps && row.deviceId !== null) {
        const milliseconds = time - previous.time;
        const seconds = (to - from) / 1000;
        const fraction = (to - from) / milliseconds;
        if (power === null || previous.power === null || counter === null || previous.counter === null ||
          row.quality !== 'VALID') partial = true;
        if (counter !== null && previous.counter !== null) {
          if (counter < previous.counter) partial = true;
          else {
            result.recoveredEnergyWh = finite((result.recoveredEnergyWh ?? 0) + (counter - previous.counter) * fraction);
            if (fraction < 1) partial = true;
          }
        }
        if (power !== null && previous.power !== null) {
          const difference = power - previous.power;
          const fromPower = previous.power + difference * ((from - previous.time) / milliseconds);
          const toPower = previous.power + difference * ((to - previous.time) / milliseconds);
          const area = finite((fromPower / 2 + toPower / 2) * seconds);
          powerSeconds = finite(powerSeconds + area);
          durationSeconds = finite(durationSeconds + seconds);
        }
      }
      previous = { time, power, counter };
    }
  }
  if (durationSeconds > 0) {
    result.estimatedEnergyWh = finite(powerSeconds / 3600);
    result.averagePowerW = finite(powerSeconds / durationSeconds);
  }
  result.quality = result.recoveredEnergyWh === null ? 'INVALID' : partial ? 'PARTIAL' : 'GOOD';
  return result;
}
