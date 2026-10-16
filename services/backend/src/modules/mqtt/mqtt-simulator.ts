// Gera lotes MQTT sintéticos em dev/test com sequência salva, sem conectar broker ou banco.
import { randomUUID } from 'node:crypto';
import { open, readFile, rename, unlink } from 'node:fs/promises';
import { TelemetryMessage, parseTelemetryMessage } from './mqtt-contract';

/** Produz dez capturas de 2 W com contador contínuo por sequência, para ensaio local determinístico. */
function batch(deviceUid: string, testId: string | null, sequence: number, start: Date): TelemetryMessage {
  return { schemaVersion: 1, messageId: randomUUID(), deviceUid, testId, sequence, capturedAt: start.toISOString(),
    samples: Array.from({ length: 10 }, (_, index) => ({
      capturedAt: new Date(start.getTime() + index * 1000).toISOString(),
      measurements: { voltageV: 4, currentA: 0.5, devicePowerW: 2,
        accumulatedEnergyWh: 10 + ((sequence - 1) * 10 + index) * 2 / 3600 },
    })) };
}

/** Reserva sequência antes da saída; lock exclusivo e troca atômica impedem reutilização concorrente. */
export async function createSimulatedMessage(statePath: string, deviceUid: string, testId: string | null,
  start: Date): Promise<TelemetryMessage> {
  if (process.env.NODE_ENV !== 'development' && process.env.NODE_ENV !== 'test') {
    throw new Error('Simulador permitido somente em desenvolvimento ou teste.');
  }
  const initial = batch(deviceUid, testId, 1, start);
  const topic = `vers/v1/devices/${deviceUid}/telemetry`;
  parseTelemetryMessage(topic, Buffer.from(JSON.stringify(initial)));
  const lock = await open(`${statePath}.lock`, 'wx');
  let temporaryCreated = false;
  try {
    let sequence = 1;
    let stateText: string | undefined;
    try { stateText = await readFile(statePath, 'utf8'); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
    if (stateText !== undefined) {
      const state: unknown = JSON.parse(stateText);
      if (!state || typeof state !== 'object' || Array.isArray(state)) throw new Error('Estado do simulador inválido.');
      const saved = state as Record<string, unknown>;
      if (saved.deviceUid !== deviceUid || typeof saved.nextSequence !== 'number' ||
        !Number.isSafeInteger(saved.nextSequence) || saved.nextSequence < 1 ||
        saved.nextSequence >= Number.MAX_SAFE_INTEGER) throw new Error('Estado do simulador inválido ou sequência esgotada.');
      sequence = saved.nextSequence;
    }
    // shortcut: apagar o estado permite reiniciar a sequência, preservar o arquivo ou provisionar nova identidade.
    const message = batch(deviceUid, testId, sequence, start);
    parseTelemetryMessage(topic, Buffer.from(JSON.stringify(message)));
    const temporary = await open(`${statePath}.tmp`, 'wx');
    temporaryCreated = true;
    try {
      await temporary.writeFile(JSON.stringify({ deviceUid, nextSequence: sequence + 1 }));
      await temporary.sync();
    } finally { await temporary.close(); }
    await rename(`${statePath}.tmp`, statePath);
    temporaryCreated = false;
    return message;
  } finally {
    try { if (temporaryCreated) await unlink(`${statePath}.tmp`); }
    finally { await lock.close(); await unlink(`${statePath}.lock`); }
  }
}

/** CLI local imprime um lote já capturado, exigindo caminho de estado e identidade explícitos. */
async function main(): Promise<void> {
  const [statePath, deviceUid, testId] = process.argv.slice(2);
  if (!statePath || !deviceUid || process.argv.length > 5) {
    throw new Error('Uso: mqtt-simulator.js <arquivo-de-estado> <deviceUid> [testId]');
  }
  const message = await createSimulatedMessage(statePath, deviceUid, testId ?? null, new Date(Date.now() - 9000));
  process.stdout.write(`${JSON.stringify(message)}\n`);
}

if (require.main === module) {
  void main().catch((error: Error) => { process.stderr.write(`${error.message}\n`); process.exitCode = 1; });
}
