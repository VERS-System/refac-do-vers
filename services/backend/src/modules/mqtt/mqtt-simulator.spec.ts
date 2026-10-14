// Confere geração sintética e sequência persistente com arquivos temporários próprios.
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createSimulatedMessage } from './mqtt-simulator';
import { classifyDelivery, parseTelemetryMessage } from './mqtt-contract';
import { calculateTelemetry } from '../data/telemetry-calculation';

describe('simulador MQTT local', () => {
  let directory: string;
  let statePath: string;
  const start = new Date('2026-10-14T12:00:00.000Z');
  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), 'vers-mqtt-'));
    statePath = join(directory, 'sequence.json');
  });
  afterEach(async () => { await rm(directory, { recursive: true, force: true }); });

  it('gera dez leituras válidas, com oracle de potência/contador independente', async () => {
    const message = await createSimulatedMessage(statePath, 'vers-sim-001', null, start);
    expect(message.sequence).toBe(1);
    expect(parseTelemetryMessage('vers/v1/devices/vers-sim-001/telemetry', Buffer.from(JSON.stringify(message))))
      .toEqual(message);
    expect(message.samples).toHaveLength(10);
    expect(message.samples[9].capturedAt).toBe('2026-10-14T12:00:09.000Z');
    const rows = message.samples.map((sample, index) => ({ id: String(index), messageId: message.messageId,
      sampleIndex: index, deviceId: 'synthetic-device', testId: null, capturedAt: new Date(sample.capturedAt),
      voltageV: sample.measurements.voltageV ?? null, currentA: sample.measurements.currentA ?? null,
      accumulatedEnergyWh: sample.measurements.accumulatedEnergyWh ?? null, quality: 'VALID' as const }));
    const result = calculateTelemetry(rows);
    expect(result.recoveredEnergyWh).toBeCloseTo(0.005, 12);
    expect(result.estimatedEnergyWh).toBeCloseTo(0.005, 12);
    expect(result.averagePowerW).toBe(2);
    expect(result.sampleCount).toBe(10);
    expect(classifyDelivery(message, new Date('2026-10-14T12:00:10.000Z')).delivery).toBe('CURRENT');
    expect(classifyDelivery(message, new Date('2026-10-14T12:01:00.000Z')).delivery).toBe('DELAYED');
  });
  it('retoma sequência salva e mantém contador sintético entre lotes', async () => {
    const first = await createSimulatedMessage(statePath, 'vers-sim-001', null, start);
    const second = await createSimulatedMessage(statePath, 'vers-sim-001', null, new Date(start.getTime() + 10000));
    expect(second.sequence).toBe(2);
    expect(second.messageId).not.toBe(first.messageId);
    expect(second.samples[0].measurements.accumulatedEnergyWh! - first.samples[9].measurements.accumulatedEnergyWh!)
      .toBeCloseTo(2 / 3600, 12);
    expect(JSON.parse(await readFile(statePath, 'utf8'))).toEqual({ deviceUid: 'vers-sim-001', nextSequence: 3 });
  });
  it.each(['bad json', '{"deviceUid":"vers-sim-001","nextSequence":0}',
    '{"deviceUid":"other","nextSequence":3}', '{"deviceUid":"vers-sim-001","nextSequence":"3"}',
    '{"deviceUid":"vers-sim-001","nextSequence":9007199254740991}'])(
  'falha sem resetar estado inconsistente %s', async (state) => {
    await writeFile(statePath, state);
    await expect(createSimulatedMessage(statePath, 'vers-sim-001', null, start)).rejects.toThrow();
    expect(await readFile(statePath, 'utf8')).toBe(state);
  });
  it('não reutiliza sequência com estado bloqueado ou concorrência', async () => {
    await writeFile(`${statePath}.lock`, 'existing');
    await expect(createSimulatedMessage(statePath, 'vers-sim-001', null, start)).rejects.toThrow();
    expect(await readFile(`${statePath}.lock`, 'utf8')).toBe('existing');
    await rm(`${statePath}.lock`);
    const results = await Promise.allSettled([
      createSimulatedMessage(statePath, 'vers-sim-001', null, start),
      createSimulatedMessage(statePath, 'vers-sim-001', null, start),
    ]);
    const fulfilled = results.filter((result) => result.status === 'fulfilled');
    expect(fulfilled).toHaveLength(1);
    expect(JSON.parse(await readFile(statePath, 'utf8')).nextSequence).toBe(2);
  });
  it('valida argumentos antes de reservar sequência', async () => {
    await expect(createSimulatedMessage(statePath, 'invalid/topic', null, start)).rejects.toThrow();
    await expect(createSimulatedMessage(statePath, 'vers-sim-001', 'bad-test', start)).rejects.toThrow();
    await expect(createSimulatedMessage(statePath, 'vers-sim-001', null, new Date(NaN))).rejects.toThrow();
    await expect(readFile(statePath)).rejects.toMatchObject({ code: 'ENOENT' });
  });
  it('não permite geração em produção nem toca estado', async () => {
    const before = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      await expect(createSimulatedMessage(statePath, 'vers-sim-001', null, start)).rejects.toThrow('Simulador permitido somente em desenvolvimento ou teste.');
      await expect(readFile(statePath)).rejects.toMatchObject({ code: 'ENOENT' });
    } finally { process.env.NODE_ENV = before; }
  });
});
