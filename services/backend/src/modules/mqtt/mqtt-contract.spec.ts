// Confere o envelope MQTT e metadados temporais sem broker, banco ou normalização.
import { parseTelemetryMessage, classifyDelivery, resolveSampleTest } from './mqtt-contract';

/** Cria um lote isolado para testar entradas sem compartilhar mutações. */
function payload(): Record<string, unknown> {
  return { schemaVersion: 1, messageId: '00000000-0000-4000-8000-000000000701',
    deviceUid: 'vers-sim-001', sequence: 1, capturedAt: '2026-10-14T12:00:00.000Z',
    testId: '00000000-0000-4000-8000-000000000501', samples: [
      { capturedAt: '2026-10-14T12:00:00.000Z', measurements: { voltageV: 4, currentA: 0.5, accumulatedEnergyWh: 10 } },
      { capturedAt: '2026-10-14T12:00:09.000Z', measurements: { voltageV: 4, currentA: 0.5, accumulatedEnergyWh: 10.005 } },
    ] };
}

/** Serializa bytes iguais aos que o consumidor futuro receberá do broker. */
function bytes(value: unknown = payload()): Buffer {
  return Buffer.from(JSON.stringify(value));
}

const topic = 'vers/v1/devices/vers-sim-001/telemetry';

describe('contrato MQTT v1', () => {
  it('aceita lote, identifica posições pela ordem e preserva payload', () => {
    expect(parseTelemetryMessage(topic, bytes())).toEqual(payload());
  });
  it('preserva ausência, null e zero e não adiciona campos calculados', () => {
    const source = payload();
    source.testId = null;
    source.samples = [{ capturedAt: source.capturedAt, measurements: { voltageV: null, currentA: 0 } }];
    expect(parseTelemetryMessage(topic, bytes(source))).toEqual(source);
    source.samples = [{ capturedAt: source.capturedAt, measurements: {} }];
    expect(parseTelemetryMessage(topic, bytes(source))).toEqual(source);
  });
  it.each([
    { schemaVersion: 2 }, { schemaVersion: '1' }, { messageId: 'bad' }, { testId: 'bad' },
    { deviceUid: 'other' }, { sequence: -1 }, { sequence: 1.5 }, { sequence: '1' },
    { sequence: 9007199254740992 }, { capturedAt: '2026-02-30T12:00:00.000Z' },
    { capturedAt: '2026-10-14T12:00:00Z' }, { capturedAt: null },
    { samples: [] }, { samples: null }, { extra: 'secret' },
  ])('recusa campos de envelope inválidos sem ecoar conteúdo %j', (changes) => {
    expect(() => parseTelemetryMessage(topic, bytes({ ...payload(), ...changes }))).toThrow('MQTT_INVALID_ENVELOPE');
  });
  it.each(['vers/v1/devices/vers-sim-001/status', 'vers/v1/devices/vers-sim-001/telemetry/extra',
    'vers/v1/devices/+/telemetry', 'vers/v1/devices/vers-sim-001/events'])('recusa tópico %s', (invalidTopic) => {
    expect(() => parseTelemetryMessage(invalidTopic, bytes())).toThrow('MQTT_INVALID_TOPIC');
  });
  it.each([null, [], 4, 'secret'])('recusa JSON sem objeto de envelope %j', (value) => {
    expect(() => parseTelemetryMessage(topic, bytes(value))).toThrow('MQTT_INVALID_ENVELOPE');
  });
  it.each([
    { voltageV: -1 }, { currentA: '0.5' }, { currentA: -1 }, { voltageV: true },
    { accumulatedEnergyWh: -1 }, { vibrationRmsMs2: -1 }, { devicePowerW: -1 },
    { activePiezoCount: 1.5 }, { activePiezoCount: 2147483648 }, { powerW: 2 },
    { temperatureC: { nested: 1 } }, { voltageV: 1e308, currentA: 1e308 },
  ])('recusa lote inteiro com medição inválida %j', (measurements) => {
    const source = payload();
    source.samples = [{ capturedAt: source.capturedAt, measurements },
      { capturedAt: '2026-10-14T12:00:09.000Z', measurements: {} }];
    expect(() => parseTelemetryMessage(topic, bytes(source))).toThrow('MQTT_INVALID_ENVELOPE');
  });
  it('aceita temperatura/aceleração assinadas e contagem limite', () => {
    const source = payload();
    source.samples = [{ capturedAt: source.capturedAt, measurements: {
      temperatureC: -5, accelerationXMs2: -1, accelerationYMs2: 0,
      accelerationZMs2: 9.8, activePiezoCount: 2147483647 } }];
    expect(parseTelemetryMessage(topic, bytes(source))).toEqual(source);
  });
  it.each([
    [{ capturedAt: '2026-10-14T12:00:01.000Z', measurements: {} }],
    [{ capturedAt: '2026-10-14T12:00:00.000Z', measurements: {}, quality: 'VALID' }],
    [{ capturedAt: '2026-10-14T12:00:00.000Z', measurements: [] }],
    [{ capturedAt: '2026-10-14T12:00:00.000Z', measurements: {} }, { capturedAt: '2026-10-14T12:00:00.000Z', measurements: {} }],
    [{ capturedAt: '2026-10-14T12:00:00.000Z', measurements: {} }, { capturedAt: '2026-10-14T11:59:59.000Z', measurements: {} }],
  ])('recusa posição/data/estrutura inválida de amostra %#', (samples) => {
    expect(() => parseTelemetryMessage(topic, bytes({ ...payload(), samples }))).toThrow('MQTT_INVALID_ENVELOPE');
  });
  it('aceita até cem amostras e recusa cento e uma', () => {
    const source = payload();
    source.samples = Array.from({ length: 100 }, (_, index) => ({
      capturedAt: new Date(Date.parse(String(source.capturedAt)) + index * 1000).toISOString(), measurements: {} }));
    expect(parseTelemetryMessage(topic, bytes(source)).samples).toHaveLength(100);
    (source.samples as unknown[]).push({ capturedAt: '2026-10-14T12:01:40.000Z', measurements: {} });
    expect(() => parseTelemetryMessage(topic, bytes(source))).toThrow('MQTT_INVALID_ENVELOPE');
  });
  it('limita bytes antes de parse e aceita exatamente 64 KiB', () => {
    const source = bytes();
    expect(() => parseTelemetryMessage(topic, Buffer.concat([source, Buffer.alloc(65536 - source.length, 32)]))).not.toThrow();
    expect(() => parseTelemetryMessage(topic, Buffer.alloc(65537, 123))).toThrow('MQTT_PAYLOAD_TOO_LARGE');
  });
  it('recusa JSON truncado, UTF-8 inválido e número não finito sem expor conteúdo', () => {
    expect(() => parseTelemetryMessage(topic, Buffer.from('{"password":"secret"'))).toThrow('MQTT_INVALID_JSON');
    expect(() => parseTelemetryMessage(topic, Buffer.from([0xff]))).toThrow('MQTT_INVALID_JSON');
    expect(() => parseTelemetryMessage(topic, Buffer.from(bytes().toString().replace('"voltageV":4', '"voltageV":1e999'))))
      .toThrow('MQTT_INVALID_ENVELOPE');
  });
});

describe('tempo de entrega e associação ao teste', () => {
  it.each([
    ['2026-10-14T12:00:10.000Z', 'CURRENT', 1],
    ['2026-10-14T12:00:24.000Z', 'CURRENT', 15],
    ['2026-10-14T12:00:24.001Z', 'DELAYED', 15.001],
    ['2026-10-15T12:00:09.000Z', 'DELAYED', 86400],
    ['2026-10-14T12:00:08.000Z', 'CLOCK_SKEW', -1],
  ])('classifica chegada %s sem recusar leitura', (receivedAt, delivery, lagSeconds) => {
    const message = parseTelemetryMessage(topic, bytes());
    const result = classifyDelivery(message, new Date(receivedAt));
    expect(result).toMatchObject({ delivery, lagSeconds });
    expect(result.sampleLagSeconds).toHaveLength(2);
    expect(result.sampleLagSeconds[0]).toBeCloseTo(lagSeconds + 9, 12);
    expect(result.sampleLagSeconds[1]).toBe(lagSeconds);
    expect(message).toEqual(payload());
  });
  it('recusa receivedAt inválido como erro do chamador', () => {
    expect(() => classifyDelivery(parseTelemetryMessage(topic, bytes()), new Date(NaN))).toThrow(RangeError);
  });
  const test = { id: '00000000-0000-4000-8000-000000000501',
    startedAt: new Date('2026-10-14T12:00:00.000Z'), endedAt: new Date('2026-10-14T12:00:10.000Z') };
  it.each([
    ['2026-10-14T11:59:59.999Z', null, 'OUTSIDE_TEST'],
    ['2026-10-14T12:00:00.000Z', test.id, 'ASSOCIATED'],
    ['2026-10-14T12:00:10.000Z', test.id, 'ASSOCIATED'],
    ['2026-10-14T12:00:10.001Z', null, 'OUTSIDE_TEST'],
  ])('resolve intervalo %s preservando captura fora do teste', (capturedAt, testId, association) => {
    expect(resolveSampleTest(new Date(capturedAt), test)).toEqual({ testId, association });
  });
  it('não inventa teste para leitura sem contexto ou teste não iniciado', () => {
    const time = new Date('2026-10-14T12:00:05.000Z');
    expect(resolveSampleTest(time, null)).toEqual({ testId: null, association: 'NO_TEST' });
    expect(resolveSampleTest(time, { ...test, startedAt: null })).toEqual({ testId: null, association: 'OUTSIDE_TEST' });
    expect(resolveSampleTest(time, { ...test, endedAt: null })).toEqual({ testId: test.id, association: 'ASSOCIATED' });
  });
  it('recusa datas/contexto inconsistentes sem fabricar associação', () => {
    expect(() => resolveSampleTest(new Date(NaN), test)).toThrow(RangeError);
    expect(() => resolveSampleTest(new Date(), { ...test, endedAt: new Date(NaN) })).toThrow(RangeError);
    expect(() => resolveSampleTest(new Date(), { ...test, endedAt: new Date('2026-10-13') })).toThrow(RangeError);
  });
});
