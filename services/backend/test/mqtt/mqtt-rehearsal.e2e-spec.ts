// Ensaia TLS, ACL, sessão/reconexão e processos reais somente no projeto Compose local de ensaio.
import { fork, ChildProcess, execFileSync } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import { connectAsync, MqttClient } from 'mqtt';
import { PrismaService } from '../../src/prisma/prisma.service';
import { createSimulatedMessage } from '../../src/modules/mqtt/mqtt-simulator';
import { createFixture, localDatabaseUrl, removeFixture, RehearsalFixture, requireLocalDatabase } from './fixtures';

const repository = resolve(__dirname, '../../../..');
const certificate = resolve(repository, 'output/mqtt-rehearsal/server.crt');
const compose = ['compose', '-p', 'vers-mqtt-rehearsal', '--env-file', 'docker/mqtt-test/compose.env.example',
  '-f', 'docker-compose.test-db.yml', '-f', 'docker-compose.test-mqtt.yml'];

/** Controla somente o serviço mqtt-test do projeto fixo, sem shell ou alvo informado externamente. */
function brokerCommand(args: string[]): void {
  execFileSync('docker', [...compose, ...args], { cwd: repository, stdio: 'pipe', timeout: 20000 });
}

/** Aguarda condição observável sem substituir captura por chegada ou aceitar espera ilimitada. */
async function until(condition: () => Promise<boolean>, timeout = 15000): Promise<void> {
  const deadline = Date.now() + timeout;
  while (!await condition()) {
    if (Date.now() >= deadline) throw new Error('Prazo do ensaio local excedido.');
    await new Promise((resolveTimer) => setTimeout(resolveTimer, 100));
  }
}

describe('ensaio MQTT TLS e PostgreSQL isolados', () => {
  const prisma = new PrismaService();
  let f: RehearsalFixture;
  let directory: string;
  let consumer: ChildProcess | undefined;
  const clients: MqttClient[] = [];

  /** Abre remetente/credencial de bancada com TLS validado e sem retentativa oculta. */
  async function publisher(username = 'vers-sim-001', password = 'synthetic-one-only'): Promise<MqttClient> {
    const client = await connectAsync('mqtts://localhost:58883', { username, password, ca: readFileSync(certificate),
      rejectUnauthorized: true, protocolVersion: 5, reconnectPeriod: 0, connectTimeout: 2000 });
    clients.push(client); return client;
  }

  /** Inicia novo processo Node usando apenas configuração sintética e certificado público de ensaio. */
  async function startConsumer(): Promise<void> {
    const child = fork(resolve(__dirname, 'consumer.cjs'), [], { cwd: resolve(__dirname, '../..'), silent: true, execArgv: [],
      env: { PATH: process.env.PATH, SystemRoot: process.env.SystemRoot, TEMP: process.env.TEMP, TMP: process.env.TMP,
        NODE_ENV: 'test', DATABASE_URL: localDatabaseUrl, NODE_EXTRA_CA_CERTS: certificate } });
    consumer = child;
    await new Promise<void>((resolveReady, reject) => {
      const timer = setTimeout(() => { reject(new Error('Consumidor local não iniciou.')); }, 20000);
      child.on('message', (message: { event?: string }) => {
        if (message.event === 'ready') { clearTimeout(timer); resolveReady(); }
        else if (message.event === 'failed') { clearTimeout(timer); reject(new Error('Consumidor local falhou.')); }
      });
      child.once('error', () => { clearTimeout(timer); reject(new Error('Falha ao iniciar processo local.')); });
      child.once('exit', () => { clearTimeout(timer); reject(new Error('Consumidor local terminou antes da prontidão.')); });
    });
  }

  /** Para somente o filho criado pelo teste, com prazo de encerramento e término forçado se necessário. */
  async function stopConsumer(crash = false): Promise<void> {
    const child = consumer; consumer = undefined;
    if (!child || child.exitCode !== null || child.signalCode !== null) return;
    await new Promise<void>((resolveExit) => {
      const timer = setTimeout(() => { child.kill(); }, 8000);
      child.once('exit', () => { clearTimeout(timer); resolveExit(); });
      if (crash || !child.connected) child.kill(); else child.send('stop');
    });
  }

  beforeAll(async () => {
    requireLocalDatabase();
    if (process.env.NODE_EXTRA_CA_CERTS !== certificate) throw new Error('Processo exige certificado público específico do ensaio.');
    await prisma.$connect();
  });
  beforeEach(async () => {
    f = await createFixture(prisma, 'vers-sim-001');
    directory = await mkdtemp(join(tmpdir(), 'vers-mqtt-rehearsal-'));
  });
  afterEach(async () => {
    await stopConsumer();
    await Promise.allSettled(clients.splice(0).map((client) => client.endAsync(true)));
    if (f) await removeFixture(prisma, f);
    if (directory) {
      if (!resolve(directory).startsWith(resolve(tmpdir()) + sep + 'vers-mqtt-rehearsal-')) throw new Error('Diretório temporário fora do ensaio.');
      await rm(directory, { recursive: true, force: true });
    }
  });
  afterAll(async () => { await prisma.$disconnect(); });

  it('simulador percorre TLS→bruto→amostras→resumos sem duplicar energia na retransmissão', async () => {
    await startConsumer(); const client = await publisher();
    const state = join(directory, 'sequence.json');
    const first = await createSimulatedMessage(state, f.deviceUid, f.testId, f.startedAt);
    const topic = `vers/v1/devices/${f.deviceUid}/telemetry`;
    await client.publishAsync(topic, JSON.stringify(first), { qos: 1 });
    await until(async () => (await prisma.mqttMessage.findUnique({ where: { messageId: first.messageId } }))?.status === 'PROCESSED');
    expect((await prisma.energySummary.findFirstOrThrow({ where: { testId: f.testId, periodType: 'TEST' } })).recoveredEnergyWh).toBeCloseTo(0.005, 12);
    await client.publishAsync(topic, JSON.stringify(first), { qos: 1 });
    const second = await createSimulatedMessage(state, f.deviceUid, f.testId, new Date(f.startedAt.getTime() + 10000));
    await client.publishAsync(topic, JSON.stringify(second), { qos: 1 });
    await until(async () => (await prisma.mqttMessage.findUnique({ where: { messageId: second.messageId } }))?.status === 'PROCESSED');
    expect(await prisma.mqttMessage.count({ where: { deviceId: f.deviceId } })).toBe(2);
    expect(await prisma.telemetrySample.count({ where: { deviceId: f.deviceId } })).toBe(20);
    expect((await prisma.energySummary.findFirstOrThrow({ where: { testId: f.testId, periodType: 'TEST' } })).recoveredEnergyWh).toBeCloseTo(38 / 3600, 12);
  });

  it('novo processo recupera sessão offline com mesmo clientId sem perder o lote', async () => {
    await startConsumer(); await stopConsumer(true);
    const client = await publisher();
    const source = await createSimulatedMessage(join(directory, 'sequence.json'), f.deviceUid, f.testId, f.startedAt);
    await client.publishAsync(`vers/v1/devices/${f.deviceUid}/telemetry`, JSON.stringify(source), { qos: 1 });
    await startConsumer();
    await until(async () => (await prisma.mqttMessage.findUnique({ where: { messageId: source.messageId } }))?.status === 'PROCESSED');
    expect(await prisma.telemetrySample.count({ where: { deviceId: f.deviceId } })).toBe(10);
  });

  it('reconecta após reinício do broker e volta a persistir dados', async () => {
    await startConsumer(); brokerCommand(['restart', 'mqtt-test']);
    let client: MqttClient | undefined;
    await until(async () => { try { client = await publisher(); return true; } catch { return false; } });
    const source = await createSimulatedMessage(join(directory, 'sequence.json'), f.deviceUid, f.testId, f.startedAt);
    await client!.publishAsync(`vers/v1/devices/${f.deviceUid}/telemetry`, JSON.stringify(source), { qos: 1 });
    await until(async () => (await prisma.mqttMessage.findUnique({ where: { messageId: source.messageId } }))?.status === 'PROCESSED');
    expect(await prisma.telemetrySample.count({ where: { deviceId: f.deviceId } })).toBe(10);
  });

  it('não conecta sem confiar no certificado do servidor nem com senha inválida', async () => {
    await expect(connectAsync('mqtts://localhost:58883', { username: 'vers-sim-001', password: 'synthetic-one-only',
      ca: [], rejectUnauthorized: true, reconnectPeriod: 0, connectTimeout: 1500 })).rejects.toThrow();
    await expect(publisher('vers-sim-001', 'invalid-synthetic-password')).rejects.toThrow();
  });

  it('broker encerra pacote acima do limite antes de persistir envelope', async () => {
    const client = await publisher(); let closed = false; let reason: number | undefined;
    client.once('close', () => { closed = true; });
    client.once('disconnect', (packet) => { reason = packet.reasonCode; });
    void client.publishAsync('vers/v1/devices/vers-sim-001/telemetry', Buffer.alloc(66049), { qos: 1 }).catch(() => {});
    await until(async () => closed, 5000);
    expect(reason).toBe(149);
    expect(await prisma.mqttMessage.count({ where: { deviceId: f.deviceId } })).toBe(0);
  });

  it('ACL impede publicar em tópico alheio, ler como dispositivo e publicar como consumidor', async () => {
    const device = await publisher();
    await expect(device.publishAsync('vers/v1/devices/vers-sim-002/telemetry', '{}', { qos: 1 })).rejects.toThrow();
    const topic = 'vers/v1/devices/vers-sim-001/telemetry';
    let unauthorizedDelivery = false;
    device.on('message', () => { unauthorizedDelivery = true; });
    await device.subscribeAsync(topic, { qos: 1 });
    const backend = await publisher('backend-test', 'backend-test-only');
    await backend.subscribeAsync(topic, { qos: 1 });
    let authorizedDelivery = false;
    backend.on('message', () => { authorizedDelivery = true; });
    await device.publishAsync(topic, 'synthetic-acl-probe', { qos: 1 });
    await until(async () => authorizedDelivery);
    await new Promise((resolveTimer) => setTimeout(resolveTimer, 200));
    expect(unauthorizedDelivery).toBe(false);
    await expect(backend.publishAsync(topic, '{}', { qos: 1 })).rejects.toThrow();
  });

  it('remoção da credencial no broker impede nova conexão e pode ser restaurada para outro ensaio', async () => {
    const client = await publisher(); await client.endAsync(true);
    try {
      brokerCommand(['exec', '-T', 'mqtt-test', 'mosquitto_passwd', '-D', '/auth/passwords', 'vers-sim-001']);
      brokerCommand(['kill', '-s', 'SIGHUP', 'mqtt-test']);
      await new Promise((resolveTimer) => setTimeout(resolveTimer, 250));
      await expect(publisher()).rejects.toThrow();
    } finally {
      brokerCommand(['exec', '-T', 'mqtt-test', 'mosquitto_passwd', '-b', '/auth/passwords', 'vers-sim-001', 'synthetic-one-only']);
      brokerCommand(['kill', '-s', 'SIGHUP', 'mqtt-test']);
    }
  });
});
