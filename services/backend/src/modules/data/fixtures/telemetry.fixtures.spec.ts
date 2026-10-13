// Verifica integridade das séries sintéticas e seus oracles antes do calculador.
import { telemetrySampleFixture } from '../../../../../../packages/shared-types/src/fixtures';
import { createTelemetryFixtures } from './telemetry.fixtures';

describe('fixtures determinísticas de telemetria', () => {
  const originalEnvironment = process.env.NODE_ENV;
  beforeEach(() => { process.env.NODE_ENV = 'test'; });
  afterAll(() => {
    if (originalEnvironment === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalEnvironment;
  });

  it.each(['production', '', undefined])('recusa geração no ambiente %s', (environment) => {
    if (environment === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = environment;
    expect(() => createTelemetryFixtures()).toThrow('Fixtures permitidas somente em desenvolvimento ou teste.');
  });
  it.each(['development', 'test'])('permite geração explícita em %s sem depender do banco', (environment) => {
    process.env.NODE_ENV = environment;
    expect(Object.keys(createTelemetryFixtures())).toEqual(['regular', 'irregular', 'gap', 'absent', 'zero',
      'duplicate', 'outOfOrder', 'delayed', 'invalid', 'reset']);
  });
  it('usa identidades sintéticas e formato Prisma sem modificar a fixture pública', () => {
    const before = JSON.stringify(telemetrySampleFixture);
    const fixtures = createTelemetryFixtures();
    for (const fixture of Object.values(fixtures)) {
      for (const row of fixture.samples) {
        for (const id of [row.id, row.deviceId, row.installationId, row.testId, row.messageId]) {
          expect(id).toMatch(/^00000000-0000-4000-8000-\d{12}$/);
        }
        expect(row.capturedAt).toBeInstanceOf(Date);
        expect(row.createdAt.getTime()).toBeGreaterThanOrEqual(row.capturedAt.getTime());
        expect(row.sampleIndex).toBeGreaterThanOrEqual(0);
        for (const field of ['email', 'licensePlate', 'token']) expect(row).not.toHaveProperty(field);
      }
    }
    expect(JSON.stringify(telemetrySampleFixture)).toBe(before);
  });
  it('retorna séries novas sem contaminação entre chamadas ou cenários', () => {
    const fixtures = createTelemetryFixtures();
    fixtures.regular.samples[0].voltageV = 99;
    fixtures.regular.samples[0].capturedAt.setUTCFullYear(2000);
    expect(fixtures.irregular.samples[0].voltageV).toBe(4);
    expect(fixtures.irregular.samples[0].capturedAt.getUTCFullYear()).toBe(2026);
    expect(createTelemetryFixtures().regular.samples[0].voltageV).toBe(4);
    expect(createTelemetryFixtures().regular.samples[0].capturedAt.getUTCFullYear()).toBe(2026);
  });
  it('distingue contador e estimativa com resultado regular explícito', () => {
    const { samples, expected } = createTelemetryFixtures().regular;
    expect(samples.map((row) => row.accumulatedEnergyWh)).toEqual([10, 10.1, 10.3]);
    expect(samples.map((row) => row.powerW)).toEqual([2, 4, 4]);
    for (const row of samples) expect(row.powerW).toBeCloseTo(row.voltageV! * row.currentA!);
    expect(samples[0].devicePowerW).toBe(20);
    expect(expected).toEqual({ recoveredEnergyWh: 0.3, estimatedEnergyWh: 0.11666666666666667,
      averagePowerW: 3.5, peakPowerW: 4, sampleCount: 3, quality: 'GOOD' });
    expect(expected.estimatedEnergyWh).toBeCloseTo((3 * 60 + 4 * 60) / 3600);
  });
  it('conserva intervalos irregulares e média ponderada, sem média simples', () => {
    const { samples, expected } = createTelemetryFixtures().irregular;
    expect(samples.map((row) => row.capturedAt.toISOString())).toEqual([
      '2026-10-13T00:00:00.000Z', '2026-10-13T00:01:00.000Z', '2026-10-13T00:03:00.000Z']);
    expect(expected.estimatedEnergyWh).toBeCloseTo(660 / 3600);
    expect(expected.averagePowerW).toBeCloseTo(660 / 180);
  });
  it('lacuna interrompe segmento, ausência não vira zero e zero medido é calculável', () => {
    const { gap, absent, zero } = createTelemetryFixtures();
    expect(gap.samples[2]).toMatchObject({ voltageV: null, currentA: null, powerW: null,
      accumulatedEnergyWh: null, quality: 'PARTIAL' });
    expect(gap.expected).toMatchObject({ recoveredEnergyWh: 0.1, estimatedEnergyWh: 0.05,
      averagePowerW: 3, sampleCount: 3, quality: 'PARTIAL' });
    expect(absent.expected).toEqual({ recoveredEnergyWh: null, estimatedEnergyWh: null,
      averagePowerW: null, peakPowerW: null, sampleCount: 0, quality: 'INVALID' });
    expect(zero.samples.map((row) => row.accumulatedEnergyWh)).toEqual([10, 10]);
    expect(zero.expected).toEqual({ recoveredEnergyWh: 0, estimatedEnergyWh: 0,
      averagePowerW: 0, peakPowerW: 0, sampleCount: 2, quality: 'GOOD' });
  });
  it('repetição, ordem e chegada tardia não mudam o resultado esperado', () => {
    const { regular, duplicate, outOfOrder, delayed } = createTelemetryFixtures();
    expect(duplicate.samples).toHaveLength(4);
    expect(duplicate.samples[1]).toEqual(duplicate.samples[2]);
    expect(new Set(duplicate.samples.map((row) => row.id)).size).toBe(3);
    expect(outOfOrder.samples.map((row) => row.sampleIndex)).toEqual([2, 0, 1]);
    expect(delayed.samples[1].createdAt.getTime() - delayed.samples[1].capturedAt.getTime()).toBe(600_000);
    for (const fixture of [duplicate, outOfOrder, delayed]) expect(fixture.expected).toEqual(regular.expected);
  });
  it('contém entradas inválidas explícitas, sem promover qualidade suspeita', () => {
    const { invalid } = createTelemetryFixtures();
    expect(Number.isNaN(invalid.samples[1].voltageV)).toBe(true);
    expect(invalid.samples[1].currentA).toBe(Infinity);
    expect(invalid.samples[1].quality).toBe('INVALID');
    expect(invalid.samples[2]).toMatchObject({ accumulatedEnergyWh: -1, quality: 'SUSPECT' });
    expect(invalid.expected).toMatchObject({ recoveredEnergyWh: null, estimatedEnergyWh: null,
      averagePowerW: null, sampleCount: 1, quality: 'INVALID' });
  });
  it('reinício não acrescenta o valor absoluto do contador ao total', () => {
    const { reset } = createTelemetryFixtures();
    expect(reset.samples.map((row) => row.accumulatedEnergyWh)).toEqual([10, 10.1, 0, 0.05]);
    expect(reset.expected).toMatchObject({ recoveredEnergyWh: 0.15, sampleCount: 4, quality: 'PARTIAL' });
  });
});
