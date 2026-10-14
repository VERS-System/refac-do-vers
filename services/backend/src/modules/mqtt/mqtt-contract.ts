// Valida telemetria MQTT v1 e descreve tempo/vínculo sem persistência ou efeitos externos.
import 'reflect-metadata';
import { TextDecoder } from 'node:util';
import { isUUID } from 'class-validator';
import { IsValidUtcDateTime } from '../../common/dto/pagination.dto';

const measurementNames = ['voltageV', 'currentA', 'devicePowerW', 'accumulatedEnergyWh',
  'accelerationXMs2', 'accelerationYMs2', 'accelerationZMs2', 'vibrationRmsMs2',
  'temperatureC', 'activePiezoCount'] as const;
type MeasurementName = typeof measurementNames[number];

export interface TelemetryMessage {
  schemaVersion: 1;
  messageId: string;
  deviceUid: string;
  sequence: number;
  capturedAt: string;
  testId: string | null;
  samples: { capturedAt: string; measurements: Partial<Record<MeasurementName, number | null>> }[];
}

/** Impede tipos coercíveis, campos extras e objetos profundos usando o formato fechado do contrato. */
function object(value: unknown, allowed: readonly string[], required: readonly string[] = allowed): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) throw new Error('MQTT_INVALID_ENVELOPE');
  const row = value as Record<string, unknown>;
  if (Object.keys(row).some((key) => !allowed.includes(key)) ||
    required.some((key) => !Object.hasOwnProperty.call(row, key))) throw new Error('MQTT_INVALID_ENVELOPE');
  return row;
}

/** Reutiliza a validação UTC comum e exige milissegundos para um formato de transporte único. */
function timestamp(value: unknown): number {
  if (typeof value !== 'string' || value.length !== 24 || !new IsValidUtcDateTime().validate(value)) {
    throw new Error('MQTT_INVALID_ENVELOPE');
  }
  return Date.parse(value);
}

/** Limita bytes antes do parse e valida cada campo, preservando ausente/null/zero no payload original. */
export function parseTelemetryMessage(topic: string, payload: Buffer): TelemetryMessage {
  const match = /^vers\/v1\/devices\/([A-Za-z0-9_-]{1,64})\/telemetry$/.exec(topic);
  if (!match) throw new Error('MQTT_INVALID_TOPIC');
  if (payload.length > 65536) throw new Error('MQTT_PAYLOAD_TOO_LARGE');
  let decoded: unknown;
  try { decoded = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(payload)); }
  catch { throw new Error('MQTT_INVALID_JSON'); }
  const envelope = object(decoded, ['schemaVersion', 'messageId', 'deviceUid', 'sequence', 'capturedAt', 'testId', 'samples']);
  if (envelope.schemaVersion !== 1 || envelope.deviceUid !== match[1] ||
    typeof envelope.messageId !== 'string' || !isUUID(envelope.messageId, '4') ||
    (envelope.testId !== null && (typeof envelope.testId !== 'string' || !isUUID(envelope.testId, '4'))) ||
    typeof envelope.sequence !== 'number' || !Number.isSafeInteger(envelope.sequence) || envelope.sequence < 0 ||
    !Array.isArray(envelope.samples) || envelope.samples.length < 1 || envelope.samples.length > 100) {
    throw new Error('MQTT_INVALID_ENVELOPE');
  }
  const firstTime = timestamp(envelope.capturedAt);
  let previousTime = -Infinity;
  for (const [index, value] of envelope.samples.entries()) {
    const sample = object(value, ['capturedAt', 'measurements']);
    const time = timestamp(sample.capturedAt);
    if (time <= previousTime || (index === 0 && time !== firstTime)) throw new Error('MQTT_INVALID_ENVELOPE');
    previousTime = time;
    const measurements = object(sample.measurements, measurementNames, []);
    for (const [key, number] of Object.entries(measurements)) {
      if (number === null) continue;
      const signed = key.startsWith('acceleration') || key === 'temperatureC';
      if (typeof number !== 'number' || !Number.isFinite(number) || (!signed && number < 0) ||
        (key === 'activePiezoCount' && (!Number.isInteger(number) || number > 2147483647))) {
        throw new Error('MQTT_INVALID_ENVELOPE');
      }
    }
    if (typeof measurements.voltageV === 'number' && typeof measurements.currentA === 'number' &&
      !Number.isFinite(measurements.voltageV * measurements.currentA)) throw new Error('MQTT_INVALID_ENVELOPE');
  }
  // A allowlist fixa acima limita o formato a quatro níveis; nenhuma medição aceita objeto/array.
  return decoded as TelemetryMessage;
}

/** Usa a última captura para descontar o lote normal e conserva idade individual e divergência de relógio. */
export function classifyDelivery(message: TelemetryMessage, receivedAt: Date): {
  delivery: 'CURRENT' | 'DELAYED' | 'CLOCK_SKEW'; lagSeconds: number; sampleLagSeconds: number[];
} {
  if (!Number.isFinite(receivedAt.getTime()) || message.samples.length === 0) throw new RangeError('Tempo de entrega inválido.');
  const sampleLagSeconds = message.samples.map((sample) => (receivedAt.getTime() - timestamp(sample.capturedAt)) / 1000);
  const lagSeconds = sampleLagSeconds[sampleLagSeconds.length - 1];
  return { delivery: sampleLagSeconds.some((lag) => lag < 0) ? 'CLOCK_SKEW' : lagSeconds > 15 ? 'DELAYED' : 'CURRENT',
    lagSeconds, sampleLagSeconds };
}

/** Recebe somente teste já autorizado; separa leituras fora do intervalo incluindo a leitura terminal válida. */
export function resolveSampleTest(capturedAt: Date, test: {
  id: string; startedAt: Date | null; endedAt: Date | null;
} | null): { testId: string | null; association: 'NO_TEST' | 'OUTSIDE_TEST' | 'ASSOCIATED' } {
  if (!Number.isFinite(capturedAt.getTime()) || (test?.startedAt && !Number.isFinite(test.startedAt.getTime())) ||
    (test?.endedAt && !Number.isFinite(test.endedAt.getTime())) ||
    (test?.startedAt && test.endedAt && test.endedAt <= test.startedAt)) throw new RangeError('Intervalo de teste inválido.');
  if (!test) return { testId: null, association: 'NO_TEST' };
  if (!test.startedAt || capturedAt < test.startedAt || (test.endedAt && capturedAt > test.endedAt)) {
    return { testId: null, association: 'OUTSIDE_TEST' };
  }
  return { testId: test.id, association: 'ASSOCIATED' };
}
