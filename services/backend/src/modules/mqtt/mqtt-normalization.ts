// Converte envelope validado em amostras sem efeitos externos, conservando qualidade e vínculo individual.
import { Prisma } from '@prisma/client';
import { calculatePowerW } from '../data/telemetry-calculation';
import { classifyDelivery, resolveSampleTest, TelemetryMessage } from './mqtt-contract';

export interface NormalizedTelemetry {
  samples: Prisma.TelemetrySampleCreateManyInput[];
  delivery: ReturnType<typeof classifyDelivery>;
  associations: ReturnType<typeof resolveSampleTest>['association'][];
}

/** Reutiliza cálculo/intervalo existentes; ausência vira null e futuro permanece SUSPECT sem corrigir captura. */
export function normalizeTelemetry(message: TelemetryMessage, context: {
  messageId: string; deviceId: string; installationId: string;
  test: { id: string; startedAt: Date | null; endedAt: Date | null } | null;
}, receivedAt: Date): NormalizedTelemetry {
  const delivery = classifyDelivery(message, receivedAt);
  const associations: NormalizedTelemetry['associations'] = [];
  const samples = message.samples.map(({ capturedAt, measurements }, sampleIndex): Prisma.TelemetrySampleCreateManyInput => {
    const voltageV = measurements.voltageV ?? null;
    const currentA = measurements.currentA ?? null;
    const accumulatedEnergyWh = measurements.accumulatedEnergyWh ?? null;
    const electricalQuality = voltageV === null || currentA === null || accumulatedEnergyWh === null ? 'PARTIAL' : 'VALID';
    const time = new Date(capturedAt);
    const association = resolveSampleTest(time, context.test);
    associations.push(association.association);
    return { messageId: context.messageId, deviceId: context.deviceId, installationId: context.installationId,
      sampleIndex, capturedAt: time, testId: association.testId, voltageV, currentA, accumulatedEnergyWh,
      powerW: calculatePowerW({ voltageV, currentA, quality: electricalQuality }),
      devicePowerW: measurements.devicePowerW ?? null,
      accelerationXMs2: measurements.accelerationXMs2 ?? null, accelerationYMs2: measurements.accelerationYMs2 ?? null,
      accelerationZMs2: measurements.accelerationZMs2 ?? null, vibrationRmsMs2: measurements.vibrationRmsMs2 ?? null,
      temperatureC: measurements.temperatureC ?? null, activePiezoCount: measurements.activePiezoCount ?? null,
      quality: delivery.sampleLagSeconds[sampleIndex] < 0 ? 'SUSPECT' : electricalQuality };
  });
  return { samples, delivery, associations };
}
