// Fornece séries sintéticas isoladas para testes/consultas, sem carregar banco.
import { TelemetrySample } from '@prisma/client';
import { SummaryQuality } from '../../../../../../packages/shared-types/src/telemetry';
import { installationFixture, telemetrySampleFixture } from '../../../../../../packages/shared-types/src/fixtures';

interface TelemetryFixture {
  samples: TelemetrySample[];
  expected: {
    recoveredEnergyWh: number | null;
    estimatedEnergyWh: number | null;
    averagePowerW: number | null;
    peakPowerW: number | null;
    sampleCount: number;
    quality: SummaryQuality;
  };
}

type FixtureName = 'regular' | 'irregular' | 'gap' | 'absent' | 'zero' |
  'duplicate' | 'outOfOrder' | 'delayed' | 'invalid' | 'reset';

/** Reutiliza dados públicos sintéticos com datas e origem no formato da persistência. */
function sample(index: number, seconds: number, counter: number | null, power: number | null,
  fields: Partial<TelemetrySample> = {}): TelemetrySample {
  const capturedAt = new Date(Date.UTC(2026, 9, 13) + seconds * 1000);
  return { ...telemetrySampleFixture, id: `00000000-0000-4000-8000-${String(401 + index).padStart(12, '0')}`,
    deviceId: '00000000-0000-4000-8000-000000000601', installationId: installationFixture.id,
    messageId: '00000000-0000-4000-8000-000000000701', sampleIndex: index,
    capturedAt, createdAt: new Date(capturedAt), voltageV: power === null ? null : 4,
    currentA: power === null ? null : power / 4, powerW: power,
    devicePowerW: power === null ? null : 20, accumulatedEnergyWh: counter, ...fields };
}

/** Cria a série conhecida novamente para impedir contaminação entre cenários. */
function regularSamples(): TelemetrySample[] {
  return [sample(0, 0, 10, 2), sample(1, 60, 10.1, 4), sample(2, 120, 10.3, 4)];
}

/** Gera apenas em dev/test, com oracles explícitos da série inteira e sem efeitos externos. */
export function createTelemetryFixtures(): Record<FixtureName, TelemetryFixture> {
  if (process.env.NODE_ENV !== 'development' && process.env.NODE_ENV !== 'test') {
    throw new Error('Fixtures permitidas somente em desenvolvimento ou teste.');
  }
  const regularExpected = { recoveredEnergyWh: 0.3, estimatedEnergyWh: 0.11666666666666667,
    averagePowerW: 3.5, peakPowerW: 4, sampleCount: 3, quality: 'GOOD' as const };
  const duplicate = regularSamples();
  duplicate.splice(2, 0, { ...duplicate[1], capturedAt: new Date(duplicate[1].capturedAt), createdAt: new Date(duplicate[1].createdAt) });
  const outOfOrder = regularSamples();
  const delayed = regularSamples();
  delayed[1].createdAt = new Date(delayed[1].capturedAt.getTime() + 600_000);
  return {
    regular: { samples: regularSamples(), expected: { ...regularExpected } },
    irregular: { samples: [sample(0, 0, 10, 2), sample(1, 60, 10.1, 4), sample(2, 180, 10.3, 4)],
      expected: { ...regularExpected, estimatedEnergyWh: 0.18333333333333332, averagePowerW: 3.6666666666666665 } },
    gap: { samples: [sample(0, 0, 10, 2), sample(1, 60, 10.1, 4),
      sample(2, 120, null, null, { quality: 'PARTIAL' }), sample(3, 180, 10.3, 4)],
      expected: { recoveredEnergyWh: 0.1, estimatedEnergyWh: 0.05, averagePowerW: 3,
        peakPowerW: 4, sampleCount: 3, quality: 'PARTIAL' } },
    absent: { samples: [sample(0, 0, null, null, { quality: 'PARTIAL' })],
      expected: { recoveredEnergyWh: null, estimatedEnergyWh: null, averagePowerW: null,
        peakPowerW: null, sampleCount: 0, quality: 'INVALID' } },
    zero: { samples: [sample(0, 0, 10, 0), sample(1, 60, 10, 0)],
      expected: { recoveredEnergyWh: 0, estimatedEnergyWh: 0, averagePowerW: 0,
        peakPowerW: 0, sampleCount: 2, quality: 'GOOD' } },
    duplicate: { samples: duplicate, expected: { ...regularExpected } },
    outOfOrder: { samples: [outOfOrder[2], outOfOrder[0], outOfOrder[1]], expected: { ...regularExpected } },
    delayed: { samples: delayed, expected: { ...regularExpected } },
    // Valores não finitos são entrada de teste, nunca payload JSON ou seed de banco.
    invalid: { samples: [sample(0, 0, 10, 2), sample(1, 60, NaN, NaN,
      { voltageV: NaN, currentA: Infinity, quality: 'INVALID' }), sample(2, 120, -1, -4, { quality: 'SUSPECT' })],
      expected: { recoveredEnergyWh: null, estimatedEnergyWh: null, averagePowerW: null,
        peakPowerW: 2, sampleCount: 1, quality: 'INVALID' } },
    reset: { samples: [sample(0, 0, 10, 2), sample(1, 60, 10.1, 2), sample(2, 120, 0, 2), sample(3, 180, 0.05, 2)],
      expected: { recoveredEnergyWh: 0.15, estimatedEnergyWh: 0.1, averagePowerW: 2,
        peakPowerW: 2, sampleCount: 4, quality: 'PARTIAL' } },
  };
}
