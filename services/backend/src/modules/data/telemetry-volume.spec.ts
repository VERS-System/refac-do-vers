// Ensaia volume sintético em memória, sem representar carga real de banco ou hardware.
import { performance } from 'node:perf_hooks';
import { CalculationSample, calculateTelemetry } from './telemetry-calculation';
import { createTelemetryFixtures } from './fixtures/telemetry.fixtures';

/** Reutiliza origem sintética e gera contador linear/potência constante com fronteiras entre leituras. */
function volumeSamples(): CalculationSample[] {
  const base = createTelemetryFixtures().regular.samples[0];
  return Array.from({ length: 10_000 }, (_, index) => ({
    id: `00000000-0000-4000-8000-${String(1000 + index).padStart(12, '0')}`,
    messageId: null, sampleIndex: index, deviceId: base.deviceId, testId: base.testId,
    capturedAt: new Date(base.capturedAt.getTime() + index * 1000 + 250),
    voltageV: 4, currentA: 0.5, accumulatedEnergyWh: 100 + index / 1000, quality: 'VALID',
  }));
}

describe('volume sintético da F06', () => {
  it('mantém 10 mil amostras, deduplicação e conservação ao recortar três horas UTC', () => {
    const samples = volumeSamples();
    const started = performance.now();
    const whole = calculateTelemetry(samples);
    expect(whole.recoveredEnergyWh).toBeCloseTo(9.999, 9);
    expect(whole.estimatedEnergyWh).toBeCloseTo(2 * 9999 / 3600, 9);
    expect(whole).toMatchObject({ averagePowerW: 2, peakPowerW: 2, sampleCount: 10_000, quality: 'GOOD' });
    const repeated = samples.filter((_row, index) => index % 1000 === 0);
    expect(calculateTelemetry([...samples].reverse().concat(repeated))).toEqual(whole);

    const start = Date.UTC(2026, 9, 13);
    const periods = [0, 1, 2].map((hour) => calculateTelemetry(samples,
      { start: new Date(start + hour * 3600_000), end: new Date(start + (hour + 1) * 3600_000) }));
    // Durações analíticas cobertas: primeira leitura em 00:00:00.250 e última em 02:46:39.250.
    const seconds = [3599.75, 3600, 2799.25];
    for (let index = 0; index < periods.length; index++) {
      expect(periods[index].recoveredEnergyWh).toBeCloseTo(seconds[index] / 1000, 9);
      expect(periods[index].estimatedEnergyWh).toBeCloseTo(2 * seconds[index] / 3600, 9);
      expect(periods[index]).toMatchObject({ averagePowerW: 2, peakPowerW: 2, quality: 'PARTIAL' });
    }
    expect(periods.reduce((total, period) => total + period.recoveredEnergyWh!, 0)).toBeCloseTo(9.999, 9);
    expect(periods.reduce((total, period) => total + period.estimatedEnergyWh!, 0)).toBeCloseTo(2 * 9999 / 3600, 9);
    expect(periods.map((period) => period.sampleCount)).toEqual([3600, 3600, 2800]);
    expect(samples[0].capturedAt.toISOString()).toBe('2026-10-13T00:00:00.250Z');
    console.info(`Volume sintético: 10.000 amostras, cinco cálculos/recortes em ${(performance.now() - started).toFixed(1)} ms.`);
  });
});
