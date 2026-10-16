// Ensaia gateway, autorização PostgreSQL e Pub/Sub reais somente em serviços sintéticos locais.
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { connectAsync, MqttClient } from 'mqtt';
import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { io, Socket } from 'socket.io-client';
import { Server } from 'socket.io';
import { PrismaService } from '../../src/prisma/prisma.service';
import { AuthService } from '../../src/modules/auth/auth.service';
import { LoginAttemptsService } from '../../src/modules/auth/login-attempts.service';
import { ResourceAccessService } from '../../src/modules/auth/resource-access.service';
import { RealtimeAuthorizationService } from '../../src/modules/realtime/realtime-authorization.service';
import { RealtimePubSubService } from '../../src/modules/realtime/realtime-pubsub.service';
import { RealtimeGateway } from '../../src/modules/realtime/realtime.gateway';
import { RealtimeIoAdapter } from '../../src/modules/realtime/realtime-io.adapter';
import { EnergySummaryService } from '../../src/modules/data/energy-summary.service';
import { MqttReceptionService } from '../../src/modules/mqtt/mqtt-reception.service';
import { MqttService } from '../../src/modules/mqtt/mqtt.service';
import { MqttPipelineService } from '../../src/modules/mqtt/mqtt-pipeline.service';
import { RealtimeNotificationService } from '../../src/modules/realtime/realtime-notification.service';
import { RealtimeIngestionService } from '../../src/modules/realtime/realtime-ingestion.service';
import { createFixture, envelope, removeFixture, RehearsalFixture, requireLocalDatabase } from '../mqtt/fixtures';

const origin = 'https://dashboard.vers.test';
const secret = 'segredo-sintetico-access-com-32-caracteres';
const repository = resolve(__dirname, '../../../..');

/** Aguarda estado observável com prazo, sem considerar PUBLISH como prova de entrega. */
async function until(condition: () => boolean | Promise<boolean>, timeout = 15000): Promise<void> {
  const deadline = Date.now() + timeout;
  while (!await condition()) {
    if (Date.now() >= deadline) throw new Error('Prazo do ensaio de tempo real excedido.');
    await new Promise((done) => setTimeout(done, 25));
  }
}

describe('F08.7 — Redis/Socket.IO/PostgreSQL locais', () => {
  const prisma = new PrismaService();
  const jwt = new JwtService();
  const config = new ConfigService({ CORS_ORIGINS: origin, auth: { accessSecret: secret },
    REDIS_HOST: '127.0.0.1', REDIS_PORT: 56379 });
  let app: INestApplication;
  let server: Server;
  let redis: RealtimePubSubService;
  let f: RehearsalFixture;
  let userId: string;
  let sessionId: string;
  let cookie: string;
  let url: string;
  const sockets: Socket[] = [];
  let coordinator: RealtimeIngestionService | undefined;
  let reception: MqttReceptionService | undefined;
  let publisher: MqttClient | undefined;

  /** Abre transporte real sem reconexão automática, permitindo observar cada nova assinatura. */
  async function connect(transport = 'websocket', headers = { Origin: origin, Cookie: cookie }): Promise<Socket> {
    if (redis.status === 'stopped') { app.get(RealtimeGateway).start(); redis.start(); }
    await until(() => redis.status === 'ok');
    const socket = io(`${url}/realtime`, { transports: [transport], extraHeaders: headers,
      reconnection: false, forceNew: true, autoConnect: false, timeout: 3000 });
    sockets.push(socket);
    await new Promise<void>((ready, reject) => {
      socket.once('connect', ready); socket.once('connect_error', reject); socket.connect();
    });
    return socket;
  }

  /** Solicita assinatura com ACK e prazo, usando o mesmo contrato público do cliente. */
  async function subscribe(socket: Socket, id = f.testId): Promise<unknown> {
    return new Promise((done, reject) => {
      socket.timeout(3000).emit('subscribe', { version: 1, resource: { type: 'test', id } },
        (error: Error | null, ack: unknown) => { if (error) reject(error); else done(ack); });
    });
  }

  /** Publica apenas invalidação do teste sintético, sem simular entrega ou acesso. */
  async function publish(): Promise<void> {
    await Promise.all([
      once(redis.events, 'data.updated', { signal: AbortSignal.timeout(3000) }),
      redis.publish({ version: 1, type: 'data.updated', resource: { type: 'test', id: f.testId },
        occurredAt: new Date().toISOString() }).then((published) => { expect(published).toBe(true); }),
    ]);
  }

  beforeAll(async () => { requireLocalDatabase(); await prisma.$connect(); });
  beforeEach(async () => {
    coordinator = undefined; reception = undefined; publisher = undefined;
    f = await createFixture(prisma); userId = randomUUID(); sessionId = randomUUID();
    await prisma.user.create({ data: { id: userId, email: `${userId}@realtime.invalid`,
      passwordHash: 'synthetic-unusable-hash', status: 'ACTIVE',
      refreshSessions: { create: { id: sessionId, tokenHash: randomUUID(), expiresAt: new Date(Date.now() + 600000) } },
      vehicles: { create: { vehicleId: f.vehicleId, relationship: 'OWNER' } } } });
    cookie = `vers_access=${await jwt.signAsync({ sub: userId, sid: sessionId, typ: 'access' }, { secret, expiresIn: '5m' })}`;
    const module = await Test.createTestingModule({ providers: [RealtimeGateway,
      { provide: RealtimePubSubService, useValue: new RealtimePubSubService(config) },
      { provide: RealtimeAuthorizationService, useValue: new RealtimeAuthorizationService(config, jwt,
        new AuthService(prisma, {} as LoginAttemptsService, jwt, config), new ResourceAccessService(prisma)) },
    ] }).compile();
    app = module.createNestApplication();
    const adapter = new RealtimeIoAdapter(app, config);
    const created = jest.spyOn(adapter, 'createIOServer'); app.useWebSocketAdapter(adapter);
    await app.listen(0, '127.0.0.1'); url = await app.getUrl();
    server = created.mock.results[0].value as Server;
    redis = app.get(RealtimePubSubService);
  });
  afterEach(async () => {
    // Fecha os transportes de ensaio antes dos hooks para evitar espera graciosa de 30 s no polling.
    server?.engine.close();
    for (const socket of sockets.splice(0)) socket.disconnect();
    if (coordinator) await coordinator.onModuleDestroy();
    if (publisher) await publisher.endAsync(true);
    reception?.onModuleDestroy();
    if (app) await app.close();
    if (userId) {
      await prisma.userVehicle.deleteMany({ where: { userId } });
      await prisma.user.deleteMany({ where: { id: userId } });
    }
    if (f) await removeFixture(prisma, f);
  });
  afterAll(async () => { await prisma.$disconnect(); });

  it.each(['polling', 'websocket'])('%s recebe aviso após ACK e recusa recurso alheio/ausente', async (transport) => {
    const socket = await connect(transport); const notices: unknown[] = [];
    socket.on('data.updated', (value: unknown) => { notices.push(value); });
    await publish();
    expect(await subscribe(socket)).toMatchObject({ ok: true });
    await publish(); await until(() => notices.length === 1);
    expect(notices[0]).toMatchObject({ version: 1, type: 'data.updated', resource: { type: 'test', id: f.testId } });
    const other = await createFixture(prisma);
    try {
      expect(await subscribe(socket, other.testId)).toEqual({ ok: false, version: 1, code: 'RESOURCE_UNAVAILABLE' });
      expect(await subscribe(socket, randomUUID())).toEqual({ ok: false, version: 1, code: 'RESOURCE_UNAVAILABLE' });
    } finally { await removeFixture(prisma, other); }
  });

  it('recusa Origin alheio no transporte real', async () => {
    await expect(connect('websocket', { Origin: 'https://alheio.invalid', Cookie: cookie })).rejects.toThrow();
  });

  it('vínculo removido não recebe próximo aviso nem permite nova assinatura', async () => {
    const socket = await connect(); expect(await subscribe(socket)).toMatchObject({ ok: true });
    const notices: unknown[] = []; socket.on('data.updated', (value: unknown) => { notices.push(value); });
    await prisma.userVehicle.deleteMany({ where: { userId, vehicleId: f.vehicleId } });
    await publish();
    expect(await subscribe(socket)).toMatchObject({ code: 'RESOURCE_UNAVAILABLE' });
    await new Promise((done) => setTimeout(done, 250));
    expect(notices).toEqual([]);
  });

  it('sessão revogada encerra conexão antes da próxima entrega', async () => {
    const socket = await connect(); expect(await subscribe(socket)).toMatchObject({ ok: true });
    const notices: unknown[] = []; socket.on('data.updated', (value: unknown) => { notices.push(value); });
    await prisma.refreshSession.update({ where: { id: sessionId }, data: { revokedAt: new Date() } });
    await publish(); await until(() => !socket.connected); expect(notices).toEqual([]);
  });

  it('restart exclusivo do Redis exige nova conexão/assinatura e volta a entregar', async () => {
    const previous = await connect(); expect(await subscribe(previous)).toMatchObject({ ok: true });
    execFileSync('docker', ['compose', '-p', 'vers-realtime-rehearsal', '--env-file',
      'docker/mqtt-test/compose.env.example', '-f', 'docker-compose.test-db.yml', '-f',
      'docker-compose.test-realtime.yml', 'restart', 'redis-test'], { cwd: repository, timeout: 20000, stdio: 'pipe' });
    await until(() => !previous.connected); await until(() => redis.status === 'ok');
    const next = await connect(); const notices: unknown[] = [];
    next.on('data.updated', (value: unknown) => { notices.push(value); });
    await publish(); expect(await subscribe(next)).toMatchObject({ ok: true });
    await publish(); await until(() => notices.length === 1);
    expect(previous.connected).toBe(false);
  });

  it('MQTT/TLS chega ao cliente e retoma sessão offline após pausa por Redis sem duplicar energia', async () => {
    const certificate = resolve(repository, 'output/realtime-rehearsal/server.crt');
    expect(process.env.NODE_EXTRA_CA_CERTS).toBe(certificate);
    f.deviceUid = 'vers-sim-001';
    await prisma.device.update({ where: { id: f.deviceId }, data: { deviceUid: f.deviceUid } });
    const mqttConfig = new ConfigService({ MQTT_ENABLED: true, MQTT_URL: 'mqtts://localhost:58883',
      MQTT_USERNAME: 'backend-test', MQTT_PASSWORD: 'backend-test-only', MQTT_CLIENT_ID: `vers-realtime-${f.deviceId}` });
    const transport = new MqttService(mqttConfig);
    const summaries = new EnergySummaryService(prisma);
    reception = new MqttReceptionService(prisma, summaries);
    const pipeline = new MqttPipelineService(prisma, reception, summaries, transport);
    const notifications = new RealtimeNotificationService(pipeline, prisma, redis);
    coordinator = new RealtimeIngestionService(redis, pipeline, notifications, app.get(RealtimeGateway));
    const pause = jest.spyOn(pipeline, 'pause');
    const receipts = jest.spyOn(reception, 'receive');
    let testUpdates = 0;
    redis.events.on('data.updated', (notice: { resource: { type: string; id: string } }) => {
      if (notice.resource.type === 'test' && notice.resource.id === f.testId) testUpdates++;
    });
    coordinator.start(); await until(() => transport.status === 'ok');
    const previous = await connect(); expect(await subscribe(previous)).toMatchObject({ ok: true });
    const notices: unknown[] = []; previous.on('data.updated', (value: unknown) => { notices.push(value); });
    publisher = await connectAsync('mqtts://localhost:58883', { username: f.deviceUid, password: 'synthetic-one-only',
      ca: readFileSync(certificate), rejectUnauthorized: true, reconnectPeriod: 0, connectTimeout: 3000 });
    const topic = `vers/v1/devices/${f.deviceUid}/telemetry`;
    const first = envelope(f, 1);
    await publisher.publishAsync(topic, JSON.stringify(first), { qos: 1 });
    await until(() => notices.length === 1);
    expect(await prisma.telemetrySample.count({ where: { deviceId: f.deviceId } })).toBe(3);
    expect((await prisma.energySummary.findFirstOrThrow({ where: { testId: f.testId, periodType: 'TEST' } })).recoveredEnergyWh).toBeCloseTo(4 / 3600, 12);
    await publisher.publishAsync(topic, JSON.stringify(first), { qos: 1 });
    await until(async () => receipts.mock.results.length >= 2 && (await receipts.mock.results[1].value).outcome === 'DUPLICATE');
    expect(await prisma.telemetrySample.count({ where: { deviceId: f.deviceId } })).toBe(3);
    const compose = ['compose', '-p', 'vers-realtime-rehearsal', '--env-file', 'docker/mqtt-test/compose.env.example',
      '-f', 'docker-compose.test-db.yml', '-f', 'docker-compose.test-realtime.yml', '-f', 'docker-compose.test-mqtt.yml'];
    execFileSync('docker', [...compose, 'stop', 'redis-test'], { cwd: repository, timeout: 20000, stdio: 'pipe' });
    await until(() => pause.mock.results.length > 0 && !previous.connected);
    await Promise.all(pause.mock.results.map((result) => result.value));
    expect(redis.status).toBe('unavailable');
    expect(notices).toHaveLength(1);
    expect((await prisma.energySummary.findFirstOrThrow({ where: { testId: f.testId, periodType: 'TEST' } })).recoveredEnergyWh).toBeCloseTo(4 / 3600, 12);
    const second = envelope(f, 2);
    // Mantém capturas e contador contínuos: os nove pontos cobrem oito segundos a 2 W.
    for (const [index, sample] of second.samples.entries()) {
      sample.capturedAt = new Date(f.startedAt.getTime() + (index + 3) * 1000).toISOString();
      sample.measurements.accumulatedEnergyWh = 10 + (index + 3) / 1800;
    }
    second.capturedAt = second.samples[0].capturedAt;
    await publisher.publishAsync(topic, JSON.stringify(second), { qos: 1 });
    expect(await prisma.mqttMessage.count({ where: { messageId: second.messageId } })).toBe(0);
    expect(await prisma.telemetrySample.count({ where: { deviceId: f.deviceId } })).toBe(3);
    execFileSync('docker', [...compose, 'start', 'redis-test'], { cwd: repository, timeout: 20000, stdio: 'pipe' });
    await until(() => transport.status === 'ok' && redis.status === 'ok');
    await until(async () => (await prisma.mqttMessage.findUnique({ where: { messageId: second.messageId } }))?.status === 'PROCESSED');
    await until(() => testUpdates === 2);
    expect(await prisma.telemetrySample.count({ where: { deviceId: f.deviceId } })).toBe(6);
    expect((await prisma.energySummary.findFirstOrThrow({ where: { testId: f.testId, periodType: 'TEST' } })).recoveredEnergyWh).toBeCloseTo(10 / 3600, 12);
    const next = await connect(); expect(await subscribe(next)).toMatchObject({ ok: true });
    const nextNotices: unknown[] = []; next.on('data.updated', (value: unknown) => { nextNotices.push(value); });
    const third = envelope(f, 3);
    for (const [index, sample] of third.samples.entries()) {
      sample.capturedAt = new Date(f.startedAt.getTime() + (index + 6) * 1000).toISOString();
      sample.measurements.accumulatedEnergyWh = 10 + (index + 6) / 1800;
    }
    third.capturedAt = third.samples[0].capturedAt;
    await publisher.publishAsync(topic, JSON.stringify(third), { qos: 1 });
    await until(() => testUpdates === 3 && nextNotices.length === 1);
    expect(await prisma.mqttMessage.count({ where: { deviceId: f.deviceId } })).toBe(3);
    expect(await prisma.telemetrySample.count({ where: { deviceId: f.deviceId } })).toBe(9);
    expect((await prisma.energySummary.findFirstOrThrow({ where: { testId: f.testId, periodType: 'TEST' } })).recoveredEnergyWh).toBeCloseTo(16 / 3600, 12);
  }, 60000);
});
