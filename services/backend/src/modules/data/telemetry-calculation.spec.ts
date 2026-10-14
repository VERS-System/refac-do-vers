// Confere cálculos da série inteira com oracles independentes e falhas de origem.
import { TelemetrySample } from '@prisma/client';
import { createTelemetryFixtures } from './fixtures/telemetry.fixtures';
import { calculatePowerW, calculateTelemetry } from './telemetry-calculation';

/** Obtém três amostras novas para alterar casos sem contaminar outras verificações. */
function rows(): TelemetrySample[] {
  return createTelemetryFixtures().regular.samples;
}

describe('cálculo de potência e energia', () => {
  it.each(Object.keys(createTelemetryFixtures()))('confere o oracle da fixture %s', (name) => {
    const fixture = Object.entries(createTelemetryFixtures()).find(([key]) => key === name)![1];
    const result = calculateTelemetry(fixture.samples);
    expect(result.calculationVersion).toBe(1);
    for (const [key, expected] of Object.entries(fixture.expected)) {
      const actual = result[key as keyof typeof fixture.expected];
      if (typeof expected === 'number') expect(actual).toBeCloseTo(expected, 10);
      else expect(actual).toBe(expected);
    }
  });
  it('recalcula V/I sem usar potência persistida ou reportada e sem alterar entrada', () => {
    const samples = rows();
    samples[0].powerW = 999;
    samples[0].devicePowerW = 888;
    const before = structuredClone(samples);
    expect(calculatePowerW(samples[0])).toBe(2);
    expect(calculateTelemetry(samples).averagePowerW).toBe(3.5);
    expect(samples).toEqual(before);
  });
  it.each([null, NaN, Infinity, -1])('recusa tensão/corrente %s sem inventar zero', (value) => {
    const row = rows()[0];
    expect(calculatePowerW({ ...row, voltageV: value })).toBeNull();
    expect(calculatePowerW({ ...row, currentA: value })).toBeNull();
  });
  it.each(['SUSPECT', 'INVALID'] as const)('interrompe segmentos com qualidade %s', (quality) => {
    const samples = rows();
    samples[1].quality = quality;
    expect(calculateTelemetry(samples)).toMatchObject({ recoveredEnergyWh: null,
      estimatedEnergyWh: null, averagePowerW: null, sampleCount: 2, quality: 'INVALID' });
  });
  it('mantém PARTIAL aproveitável e não promove seu resultado para GOOD', () => {
    const samples = rows();
    samples[1].quality = 'PARTIAL';
    expect(calculateTelemetry(samples)).toMatchObject({ averagePowerW: 3.5, quality: 'PARTIAL' });
  });
  it('ausência de contador não interrompe potência válida nem cria energia principal', () => {
    const samples = rows();
    samples[1].accumulatedEnergyWh = null;
    expect(calculateTelemetry(samples)).toMatchObject({ recoveredEnergyWh: null,
      averagePowerW: 3.5, sampleCount: 3, quality: 'INVALID' });
  });
  it('ausência de potência não interrompe contador válido', () => {
    const samples = rows();
    samples[1].voltageV = null;
    const result = calculateTelemetry(samples);
    expect(result.recoveredEnergyWh).toBeCloseTo(0.3);
    expect(result).toMatchObject({ estimatedEnergyWh: null, averagePowerW: null,
      peakPowerW: 4, sampleCount: 3, quality: 'PARTIAL' });
  });
  it('não cria resumo artificial para série vazia ou amostra isolada', () => {
    expect(calculateTelemetry([])).toEqual({ calculationVersion: 1, recoveredEnergyWh: null,
      estimatedEnergyWh: null, averagePowerW: null, peakPowerW: null, sampleCount: 0, quality: 'INVALID' });
    expect(calculateTelemetry(rows().slice(0, 1))).toMatchObject({ recoveredEnergyWh: null,
      estimatedEnergyWh: null, averagePowerW: null, peakPowerW: 2, sampleCount: 1, quality: 'INVALID' });
  });
  it('separa dispositivos e testes sem integrar entre suas origens', () => {
    for (const field of ['deviceId', 'testId'] as const) {
      const samples = rows();
      samples[1][field] = '00000000-0000-4000-8000-000000000999';
      expect(calculateTelemetry(samples).recoveredEnergyWh).toBeCloseTo(0.3);
      expect(calculateTelemetry(samples).estimatedEnergyWh).toBeCloseTo(0.1);
    }
  });
  it('não une dispositivos históricos nulos nem estima energia sem proveniência', () => {
    const samples = rows().map((row) => ({ ...row, deviceId: null }));
    expect(calculateTelemetry(samples)).toMatchObject({ recoveredEnergyWh: null,
      estimatedEnergyWh: null, sampleCount: 3, quality: 'INVALID' });
  });
  it('deduplica mensagem/sampleIndex mesmo com IDs diferentes, mas preserva índices distintos', () => {
    const samples = rows();
    const duplicate = { ...samples[1], id: '00000000-0000-4000-8000-000000000999' };
    expect(calculateTelemetry([...samples, duplicate])).toEqual(calculateTelemetry(samples));
    expect(calculateTelemetry(samples).sampleCount).toBe(3);
  });
  it('não deduplica mensagens nulas apenas por sampleIndex', () => {
    const samples = rows().map((row) => ({ ...row, messageId: null, sampleIndex: 0 }));
    expect(calculateTelemetry(samples).recoveredEnergyWh).toBeCloseTo(0.3);
    expect(calculateTelemetry(samples).sampleCount).toBe(3);
  });
  it('identidade conflitante não escolhe uma leitura arbitrária, mesmo mudando a ordem', () => {
    const samples = rows();
    const conflict = { ...samples[1], accumulatedEnergyWh: 50 };
    for (const input of [[...samples, conflict], [conflict, ...samples]]) {
      expect(calculateTelemetry(input)).toMatchObject({ recoveredEnergyWh: null,
        estimatedEnergyWh: null, sampleCount: 2, quality: 'INVALID' });
    }
  });
  it('timestamps conflitantes interrompem segmentos, enquanto iguais não criam duração', () => {
    const samples = rows();
    const extra = { ...samples[1], id: '00000000-0000-4000-8000-000000000999', sampleIndex: 3 };
    expect(calculateTelemetry([...samples, extra]).recoveredEnergyWh).toBeCloseTo(0.3);
    expect(calculateTelemetry([...samples, { ...extra, currentA: 2 }])).toMatchObject({
      recoveredEnergyWh: null, estimatedEnergyWh: null, sampleCount: 2, quality: 'INVALID' });
    expect(calculateTelemetry([samples[1], extra])).toMatchObject({ recoveredEnergyWh: null,
      estimatedEnergyWh: null, averagePowerW: null, sampleCount: 2 });
  });
  it('não inventa limiar temporal para intervalos longos', () => {
    const samples = rows().slice(0, 2);
    samples[1].capturedAt = new Date(samples[0].capturedAt.getTime() + 3600_000);
    expect(calculateTelemetry(samples)).toMatchObject({ estimatedEnergyWh: 3,
      averagePowerW: 3, quality: 'GOOD' });
  });
  it('rejeita datas inválidas antes de ordenar ou produzir números não finitos', () => {
    const samples = rows();
    samples[1].capturedAt = new Date(NaN);
    expect(() => calculateTelemetry(samples)).toThrow(RangeError);
  });
  it('recusa overflow de potência e de acumuladores em vez de devolver Infinity', () => {
    expect(() => calculatePowerW({ ...rows()[0], voltageV: Number.MAX_VALUE,
      currentA: 2 })).toThrow(RangeError);
    const samples = rows().map((row) => ({ ...row, voltageV: Number.MAX_VALUE,
      currentA: 1 }));
    expect(() => calculateTelemetry(samples)).toThrow(RangeError);
  });
});

describe('recorte de energia por intervalo semiaberto', () => {
  /** Define fronteiras relativas à série para comparar recortes sem depender do relógio. */
  function interval(start: number, end: number): { start: Date; end: Date } {
    const time = rows()[0].capturedAt.getTime();
    return { start: new Date(time + start * 1000), end: new Date(time + end * 1000) };
  }

  it('fecha o último delta com a leitura no fim, sem contá-la novamente', () => {
    const result = calculateTelemetry(rows(), interval(0, 120));
    expect(result.recoveredEnergyWh).toBeCloseTo(0.3);
    expect(result.estimatedEnergyWh).toBeCloseTo(420 / 3600);
    expect(result).toMatchObject({ sampleCount: 2, quality: 'GOOD', peakPowerW: 4 });
  });
  it('reparte contador e interpola potência conservando totais entre períodos', () => {
    const samples = rows().slice(0, 2);
    const first = calculateTelemetry(samples, interval(0, 30));
    const second = calculateTelemetry(samples, interval(30, 60));
    expect(first.recoveredEnergyWh).toBeCloseTo(0.05);
    expect(second.recoveredEnergyWh).toBeCloseTo(0.05);
    expect(first.estimatedEnergyWh).toBeCloseTo(75 / 3600);
    expect(second.estimatedEnergyWh).toBeCloseTo(105 / 3600);
    expect(first.averagePowerW).toBeCloseTo(2.5);
    expect(second.averagePowerW).toBeCloseTo(3.5);
    expect(first.quality).toBe('PARTIAL');
    expect(second.quality).toBe('PARTIAL');
    expect(first.sampleCount + second.sampleCount).toBe(1);
    expect(second.peakPowerW).toBeNull();
    expect(first.recoveredEnergyWh! + second.recoveredEnergyWh!).toBeCloseTo(0.1);
  });
  it('combina recortes em segmentos diferentes sem média simples', () => {
    const result = calculateTelemetry(rows(), interval(30, 90));
    expect(result.recoveredEnergyWh).toBeCloseTo(0.15);
    expect(result.estimatedEnergyWh).toBeCloseTo(225 / 3600);
    expect(result).toMatchObject({ averagePowerW: 3.75, sampleCount: 1, quality: 'PARTIAL' });
  });
  it('não extrapola além das amostras nem considera falhas distantes fora do intervalo', () => {
    const samples = rows();
    samples.push({ ...samples[2], id: 'distant', sampleIndex: 3,
      capturedAt: interval(600, 601).start, quality: 'INVALID' });
    expect(calculateTelemetry(samples, interval(0, 120))).toMatchObject({
      averagePowerW: 3.5, sampleCount: 2, quality: 'GOOD' });
    expect(calculateTelemetry(rows(), interval(130, 200))).toMatchObject({
      recoveredEnergyWh: null, estimatedEnergyWh: null, peakPowerW: null, sampleCount: 0 });
  });
  it('mantém a interrupção por ausência ou reinício mesmo dentro de um recorte', () => {
    const samples = rows();
    samples[1].accumulatedEnergyWh = null;
    expect(calculateTelemetry(samples, interval(30, 90)).recoveredEnergyWh).toBeNull();
    samples[1].accumulatedEnergyWh = 0;
    expect(calculateTelemetry(samples, interval(0, 60))).toMatchObject({
      recoveredEnergyWh: null, estimatedEnergyWh: 0.05, quality: 'INVALID' });
  });
  it('sinaliza conflito de vizinho sem atravessá-lo ou escolher valores arbitrários', () => {
    const samples = rows();
    const duplicate = { ...samples[0], currentA: 2 };
    const result = calculateTelemetry([...samples, duplicate], interval(30, 120));
    expect(result.recoveredEnergyWh).toBeCloseTo(0.2);
    expect(result.estimatedEnergyWh).toBeCloseTo(240 / 3600);
    expect(result.quality).toBe('PARTIAL');
  });
  it.each([[0, 0], [60, 0], [NaN, 60], [0, NaN]])('recusa intervalo %s/%s', (start, end) => {
    expect(() => calculateTelemetry(rows(), interval(start, end))).toThrow(RangeError);
  });
});
