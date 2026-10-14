// Verifica normalização pura, associação temporal e compatibilidade com os cálculos F06.
import { Prisma } from '@prisma/client';
import { calculateTelemetry } from '../data/telemetry-calculation';
import { TelemetryMessage } from './mqtt-contract';
import { normalizeTelemetry } from './mqtt-normalization';

const receivedAt = new Date('2026-10-14T12:00:10.000Z');
const context = { messageId: 'internal-message', deviceId: 'device', installationId: 'installation',
  test: { id: 'test', startedAt: new Date('2026-10-14T12:00:00.000Z'), endedAt: new Date('2026-10-14T12:00:02.000Z') } };

/** Cria série conhecida de 2 W com contador independente da potência reportada. */
function message(): TelemetryMessage {
  return { schemaVersion: 1, messageId: 'external-message', deviceUid: 'device', sequence: 1,
    capturedAt: '2026-10-14T12:00:00.000Z', testId: 'test', samples: [0, 1, 2].map((second) => ({
      capturedAt: `2026-10-14T12:00:0${second}.000Z`,
      measurements: { voltageV: 4, currentA: 0.5, devicePowerW: 99, accumulatedEnergyWh: 10 + second / 1800 },
    })) };
}

/** Acrescenta somente defaults do banco para exercitar o cálculo real sem Prisma. */
function calculationSamples(samples: Prisma.TelemetrySampleCreateManyInput[]): Parameters<typeof calculateTelemetry>[0] {
  return samples.map((row, index) => ({ id: `sample-${index}`, messageId: row.messageId ?? null,
    sampleIndex: row.sampleIndex, deviceId: row.deviceId ?? null, testId: row.testId ?? null,
    capturedAt: new Date(row.capturedAt), voltageV: row.voltageV ?? null, currentA: row.currentA ?? null,
    accumulatedEnergyWh: row.accumulatedEnergyWh ?? null, quality: row.quality }));
}

describe('normalização MQTT', () => {
  it('calcula potência sem usar potência reportada, conserva origem e não altera bruto', () => {
    const input = message(); const before = JSON.stringify(input);
    const result = normalizeTelemetry(input, context, receivedAt);
    expect(result.samples[0]).toEqual({ messageId: context.messageId, deviceId: context.deviceId,
      installationId: context.installationId, sampleIndex: 0, testId: 'test', capturedAt: context.test.startedAt,
      voltageV: 4, currentA: 0.5, powerW: 2, devicePowerW: 99, accumulatedEnergyWh: 10,
      accelerationXMs2: null, accelerationYMs2: null, accelerationZMs2: null, vibrationRmsMs2: null,
      temperatureC: null, activePiezoCount: null, quality: 'VALID' });
    expect(result.associations).toEqual(['ASSOCIATED', 'ASSOCIATED', 'ASSOCIATED']);
    expect(JSON.stringify(input)).toBe(before);
    const calculation = calculateTelemetry(calculationSamples(result.samples));
    expect(calculation.recoveredEnergyWh).toBeCloseTo(2 / 3600 * 2, 12);
    expect(calculation.estimatedEnergyWh).toBeCloseTo(2 / 3600 * 2, 12);
    expect(calculation.averagePowerW).toBe(2); expect(calculation.quality).toBe('GOOD');
  });
  it.each([{}, { voltageV: null, currentA: null, accumulatedEnergyWh: null },
    { voltageV: 4, accumulatedEnergyWh: 0 }, { currentA: 0.5 }])('normaliza ausência sem fabricar zero %j', (measurements) => {
    const input = message(); input.samples = [{ capturedAt: input.capturedAt, measurements }];
    const [row] = normalizeTelemetry(input, context, receivedAt).samples;
    expect(row.quality).toBe('PARTIAL'); expect(row.powerW).toBeNull();
    expect(row.currentA).toBe(measurements.currentA ?? null);
    expect(row.accumulatedEnergyWh).toBe(measurements.accumulatedEnergyWh ?? null);
  });
  it('zero é medição válida e todos os sensores mantêm unidades/sinais', () => {
    const input = message(); input.samples[0].measurements = { voltageV: 0, currentA: 0, accumulatedEnergyWh: 0,
      devicePowerW: 0, accelerationXMs2: -9.8, accelerationYMs2: 0, accelerationZMs2: 9.8,
      vibrationRmsMs2: 0, temperatureC: -10, activePiezoCount: 0 };
    expect(normalizeTelemetry(input, context, receivedAt).samples[0]).toMatchObject({
      ...input.samples[0].measurements, powerW: 0, quality: 'VALID' });
  });
  it('ausência de contador mantém potência calculável como PARTIAL', () => {
    const input = message(); delete input.samples[0].measurements.accumulatedEnergyWh;
    expect(normalizeTelemetry(input, context, receivedAt).samples[0]).toMatchObject({ quality: 'PARTIAL', powerW: 2 });
  });
  it('atraso não reduz qualidade e idade usa recebimento original', () => {
    const result = normalizeTelemetry(message(), context, new Date('2026-10-14T13:00:00.000Z'));
    expect(result.delivery.delivery).toBe('DELAYED');
    expect(result.samples.map((row) => row.quality)).toEqual(['VALID', 'VALID', 'VALID']);
  });
  it('somente capturas futuras ficam SUSPECT, conservando potência e medições', () => {
    const result = normalizeTelemetry(message(), context, new Date('2026-10-14T12:00:01.000Z'));
    expect(result.delivery.delivery).toBe('CLOCK_SKEW');
    expect(result.samples.map((row) => row.quality)).toEqual(['VALID', 'VALID', 'SUSPECT']);
    expect(result.samples[2]).toMatchObject({ capturedAt: context.test.endedAt, powerW: 2, devicePowerW: 99 });
    const calculation = calculateTelemetry(calculationSamples(result.samples));
    expect(calculation.recoveredEnergyWh).toBeCloseTo(1 / 1800, 12); expect(calculation.sampleCount).toBe(2);
  });
  it('todas futuras ficam preservadas e fora dos cálculos F06', () => {
    const result = normalizeTelemetry(message(), context, new Date('2026-10-14T11:59:59.000Z'));
    const calculation = calculateTelemetry(calculationSamples(result.samples));
    expect(result.samples).toHaveLength(3); expect(calculation.sampleCount).toBe(0);
    expect(calculation.recoveredEnergyWh).toBeNull(); expect(calculation.estimatedEnergyWh).toBeNull();
  });
  it('mantém fora do intervalo na instalação e inclui leitura terminal no vínculo', () => {
    const result = normalizeTelemetry(message(), { ...context, test: { ...context.test,
      startedAt: new Date('2026-10-14T12:00:01.000Z'), endedAt: new Date('2026-10-14T12:00:01.500Z') } }, receivedAt);
    expect(result.associations).toEqual(['OUTSIDE_TEST', 'ASSOCIATED', 'OUTSIDE_TEST']);
    expect(result.samples.map((row) => row.testId)).toEqual([null, 'test', null]);
    expect(result.samples.every((row) => row.installationId === context.installationId)).toBe(true);
    expect(result.samples.every((row) => row.quality === 'VALID')).toBe(true);
  });
  it('sem teste mantém somente vínculo da instalação', () => {
    const result = normalizeTelemetry(message(), { ...context, test: null }, receivedAt);
    expect(result.associations).toEqual(['NO_TEST', 'NO_TEST', 'NO_TEST']);
    expect(result.samples.every((row) => row.testId === null)).toBe(true);
  });
  it('contador reiniciado permanece medido e F06 segmenta sem energia negativa', () => {
    const input = message(); input.samples[0].measurements.accumulatedEnergyWh = 10;
    input.samples[1].measurements.accumulatedEnergyWh = 0; input.samples[2].measurements.accumulatedEnergyWh = 0.1;
    const result = normalizeTelemetry(input, context, receivedAt);
    expect(result.samples.map((row) => row.accumulatedEnergyWh)).toEqual([10, 0, 0.1]);
    expect(calculateTelemetry(calculationSamples(result.samples)).recoveredEnergyWh).toBeCloseTo(0.1, 12);
  });
});
