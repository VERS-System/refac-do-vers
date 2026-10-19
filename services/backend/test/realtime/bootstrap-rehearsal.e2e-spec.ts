// Verifica executável real com configuração sintética, sem início manual do coordenador.
import { spawn, ChildProcess } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { resolve } from 'node:path';
import { JwtService } from '@nestjs/jwt';
import { hash } from 'bcrypt';
import { connectAsync, MqttClient } from 'mqtt';
import { io, Socket } from 'socket.io-client';
import { PrismaService } from '../../src/prisma/prisma.service';
import { createFixture, envelope, localDatabaseUrl, removeFixture, RehearsalFixture, requireLocalDatabase } from '../mqtt/fixtures';

const port = 53000;
const url = `http://127.0.0.1:${port}`;
const origin = 'https://dashboard.vers.test';
const secret = 'segredo-bootstrap-access-somente-sintetico';
const password = 'Bootstrap-Sintetico-123!';
const backend = resolve(__dirname, '../..');
const certificate = resolve(backend, '../../output/realtime-rehearsal/server.crt');

/** Aguarda condição real com prazo e falha segura se o executável filho encerrar prematuramente. */
async function until(condition: () => Promise<boolean>, child: ChildProcess): Promise<void> {
  const deadline = Date.now() + 20000;
  while (!await condition()) {
    if (child.exitCode !== null || child.signalCode !== null || Date.now() >= deadline) {
      throw new Error('Bootstrap de ensaio indisponível no prazo.');
    }
    await new Promise((done) => setTimeout(done, 100));
  }
}

/** Confere porta antes de iniciar para não consultar nem substituir um backend já existente. */
async function requireFreePort(): Promise<void> {
  await new Promise<void>((done, reject) => {
    const probe = createServer();
    probe.once('error', () => { reject(new Error('Porta HTTP de ensaio ocupada.')); });
    probe.listen(port, () => { probe.close((error) => { if (error) reject(error); else done(); }); });
  });
}

describe('F08 — bootstrap compilado com bancada local', () => {
  const prisma = new PrismaService();
  let child: ChildProcess | undefined;
  let f: RehearsalFixture | undefined;
  let userId: string | undefined;
  let cookie: string;
  let publisher: MqttClient | undefined;
  let socket: Socket | undefined;

  /** Usa CSRF e cookies reais para provar login HTTP sem fabricar JWT no cenário integrado. */
  async function login(): Promise<void> {
    const cookies = new Map<string, string>();
    /** Retém somente os pares de cookies recebidos para enviar na próxima requisição local. */
    function retain(response: Response): void {
      for (const value of response.headers.getSetCookie()) {
        const pair = value.split(';')[0]; const separator = pair.indexOf('=');
        cookies.set(pair.slice(0, separator), pair.slice(separator + 1));
      }
      cookie = [...cookies].map(([name, value]) => `${name}=${value}`).join('; ');
    }
    const csrf = await fetch(`${url}/api/v1/auth/csrf`, { signal: AbortSignal.timeout(3000) });
    expect(csrf.status).toBe(200); retain(csrf);
    const body = await csrf.json() as { data: { csrfToken: string } };
    const response = await fetch(`${url}/api/v1/auth/login`, {
      method: 'POST', headers: { Origin: origin, Cookie: cookie, 'Content-Type': 'application/json', 'X-Request-Id': userId!,
        'X-CSRF-Token': body.data.csrfToken },
      body: JSON.stringify({ email: `${userId}@bootstrap.invalid`, password }), signal: AbortSignal.timeout(5000),
    });
    expect(response.status).toBe(200); retain(response);
    expect(cookies.has('vers_access')).toBe(true); expect(cookies.has('vers_refresh')).toBe(true);
    const result = await response.json() as { data: { user: { id: string } } };
    expect(result.data.user.id).toBe(userId);
  }

  /** Inicia somente o processo criado pela suíte, com destinos fixos e sem herdar segredos da sessão. */
  async function start(enabled: boolean): Promise<ChildProcess> {
    const processChild = spawn(process.execPath, [resolve(backend, 'dist/services/backend/src/main.js')], {
      cwd: backend, windowsHide: true, stdio: 'ignore', env: {
        SystemRoot: process.env.SystemRoot, NODE_ENV: 'test', PORT: String(port), API_PREFIX: 'api/v1',
        DATABASE_URL: localDatabaseUrl, REDIS_HOST: '127.0.0.1', REDIS_PORT: '56379', CORS_ORIGINS: origin,
        JWT_ACCESS_SECRET: secret, JWT_REFRESH_SECRET: 'segredo-bootstrap-refresh-somente-sintetico',
        JWT_ACCESS_EXPIRATION: '15m', JWT_REFRESH_EXPIRATION: '7d', NODE_EXTRA_CA_CERTS: certificate,
        RATE_LIMIT_TTL_SECONDS: '60', RATE_LIMIT_MAX_REQUESTS: '1000',
        MQTT_ENABLED: String(enabled), MQTT_URL: 'mqtts://localhost:58883', MQTT_USERNAME: 'backend-test',
        MQTT_PASSWORD: 'backend-test-only', MQTT_CLIENT_ID: `bootstrap-${randomUUID()}`,
      },
    });
    child = processChild;
    await new Promise<void>((done, reject) => {
      processChild.once('spawn', done); processChild.once('error', () => { reject(new Error('Falha ao iniciar backend sintético.')); });
    });
    await until(async () => {
      try {
        const response = await fetch(`${url}/api/v1/health/ready`, { signal: AbortSignal.timeout(1500) });
        const body = await response.json() as { data?: { dependencies?: { mqtt?: string } } };
        return response.ok && body.data?.dependencies?.mqtt === (enabled ? 'ok' : 'disabled');
      } catch { return false; }
    }, processChild);
    return processChild;
  }

  beforeAll(async () => { requireLocalDatabase(); await prisma.$connect(); });
  beforeEach(async () => {
    child = undefined; f = undefined; userId = undefined; socket = undefined; publisher = undefined;
    await requireFreePort();
    f = await createFixture(prisma, 'vers-sim-001'); userId = randomUUID(); const sessionId = randomUUID();
    await prisma.user.create({ data: { id: userId, email: `${userId}@bootstrap.invalid`,
      passwordHash: await hash(password, 10), status: 'ACTIVE',
      refreshSessions: { create: { id: sessionId, tokenHash: randomUUID(), expiresAt: new Date(Date.now() + 600000) } },
      vehicles: { create: { vehicleId: f.vehicleId, relationship: 'OWNER' } } } });
    cookie = `vers_access=${await new JwtService().signAsync({ sub: userId, sid: sessionId, typ: 'access' },
      { secret, expiresIn: '5m' })}`;
  });
  afterEach(async () => {
    socket?.disconnect(); if (publisher) await publisher.endAsync(true);
    if (child?.pid && child.exitCode === null && child.signalCode === null) {
      const processChild = child;
      await new Promise<void>((done, reject) => {
        const timer = setTimeout(() => { reject(new Error('Processo filho não encerrou no prazo.')); }, 5000);
        processChild.once('exit', () => { clearTimeout(timer); done(); });
        if (!processChild.kill('SIGKILL')) { clearTimeout(timer); reject(new Error('Não foi possível encerrar processo filho.')); }
      });
    }
    if (userId) {
      await prisma.auditEvent.deleteMany({ where: { requestId: userId, action: 'auth.login' } });
      await prisma.userVehicle.deleteMany({ where: { userId } });
      await prisma.user.deleteMany({ where: { id: userId } });
    }
    if (f) await removeFixture(prisma, f);
  });
  afterAll(async () => { await prisma.$disconnect(); });

  it('desabilitado mantém REST pronto e namespace inativo', async () => {
    await start(false);
    socket = io(`${url}/realtime`, { transports: ['websocket'], extraHeaders: { Origin: origin, Cookie: cookie },
      reconnection: false, autoConnect: false, timeout: 3000 });
    const connection = socket;
    await expect(new Promise<void>((done, reject) => {
      connection.once('connect', done); connection.once('connect_error', reject); connection.connect();
    })).rejects.toThrow();
    expect(await prisma.mqttMessage.count({ where: { deviceId: f!.deviceId } })).toBe(0);
  }, 60000);

  it('habilitado recebe MQTT, avisa cliente e retorna resumo REST sem start manual', async () => {
    const running = await start(true); const fixture = f!;
    await login();
    socket = io(`${url}/realtime`, { transports: ['websocket'], extraHeaders: { Origin: origin, Cookie: cookie },
      reconnection: false, autoConnect: false, timeout: 3000 });
    const connection = socket;
    await new Promise<void>((done, reject) => {
      connection.once('connect', done); connection.once('connect_error', reject); connection.connect();
    });
    const notices: unknown[] = []; connection.on('data.updated', (notice: unknown) => { notices.push(notice); });
    const ack = await new Promise<unknown>((done, reject) => {
      connection.timeout(3000).emit('subscribe', { version: 1, resource: { type: 'test', id: fixture.testId } },
        (error: Error | null, value: unknown) => { if (error) reject(error); else done(value); });
    });
    expect(ack).toMatchObject({ ok: true });
    publisher = await connectAsync('mqtts://localhost:58883', { username: fixture.deviceUid,
      password: 'synthetic-one-only', ca: readFileSync(certificate), rejectUnauthorized: true,
      reconnectPeriod: 0, connectTimeout: 3000 });
    const topic = `vers/v1/devices/${fixture.deviceUid}/telemetry`;
    const first = envelope(fixture);
    await publisher.publishAsync(topic, JSON.stringify(first), { qos: 1 });
    await until(async () => notices.length >= 1, running);
    expect(notices).toContainEqual(expect.objectContaining({ type: 'data.updated', resource: { type: 'test', id: fixture.testId } }));
    expect(await prisma.telemetrySample.count({ where: { deviceId: fixture.deviceId } })).toBe(3);
    const response = await fetch(`${url}/api/v1/tests/${fixture.testId}/energy-summaries`,
      { headers: { Cookie: cookie }, signal: AbortSignal.timeout(3000) });
    const body = await response.json() as { data: { recoveredEnergyWh: number }[] };
    expect(response.status).toBe(200); expect(body.data).toHaveLength(1);
    expect(body.data[0].recoveredEnergyWh).toBeCloseTo(4 / 3600, 12);

    await publisher.publishAsync(topic, JSON.stringify(first), { qos: 1 });
    // O próximo lote processado serve de barreira observável após o reenvio, sem espera arbitrária.
    const next = envelope({ ...fixture, startedAt: new Date(fixture.startedAt.getTime() + 3000) }, 2);
    // Mantém o contador acumulado contínuo entre lotes, sem simular reset do dispositivo.
    next.samples.forEach((sample, index) => { sample.measurements.accumulatedEnergyWh = 10 + (index + 3) / 1800; });
    await publisher.publishAsync(topic, JSON.stringify(next), { qos: 1 });
    await until(async () => (await prisma.mqttMessage.findUnique({ where: { messageId: next.messageId } }))?.status === 'PROCESSED', running);
    expect(await prisma.mqttMessage.count({ where: { deviceId: fixture.deviceId } })).toBe(2);
    expect(await prisma.telemetrySample.count({ where: { deviceId: fixture.deviceId } })).toBe(6);
    const summary = await fetch(`${url}/api/v1/tests/${fixture.testId}/energy-summaries`,
      { headers: { Cookie: cookie }, signal: AbortSignal.timeout(3000) });
    expect(summary.status).toBe(200);
    const updated = await summary.json() as { data: { recoveredEnergyWh: number }[] };
    expect(updated.data).toHaveLength(1);
    expect(updated.data[0].recoveredEnergyWh).toBeCloseTo(10 / 3600, 12);
    const series = await fetch(`${url}/api/v1/tests/${fixture.testId}/telemetry`,
      { headers: { Cookie: cookie }, signal: AbortSignal.timeout(3000) });
    expect(series.status).toBe(200);
    const samples = await series.json() as { data: unknown[]; meta: { totalItems: number } };
    expect(samples.data).toHaveLength(6); expect(samples.meta.totalItems).toBe(6);

    await prisma.userVehicle.deleteMany({ where: { userId, vehicleId: fixture.vehicleId } });
    for (const resource of ['telemetry', 'energy-summaries']) {
      const denied = await fetch(`${url}/api/v1/tests/${fixture.testId}/${resource}`,
        { headers: { Cookie: cookie }, signal: AbortSignal.timeout(3000) });
      expect(denied.status).toBe(404);
    }
    const deniedAck = await new Promise<unknown>((done, reject) => {
      connection.timeout(3000).emit('subscribe', { version: 1, resource: { type: 'test', id: fixture.testId } },
        (error: Error | null, value: unknown) => { if (error) reject(error); else done(value); });
    });
    expect(deniedAck).toEqual({ ok: false, version: 1, code: 'RESOURCE_UNAVAILABLE' });
  }, 60000);
});
