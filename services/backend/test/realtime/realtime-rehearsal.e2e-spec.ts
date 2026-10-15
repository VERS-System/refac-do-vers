// Ensaia gateway, autorização PostgreSQL e Pub/Sub reais somente em serviços sintéticos locais.
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { io, Socket } from 'socket.io-client';
import { PrismaService } from '../../src/prisma/prisma.service';
import { AuthService } from '../../src/modules/auth/auth.service';
import { LoginAttemptsService } from '../../src/modules/auth/login-attempts.service';
import { ResourceAccessService } from '../../src/modules/auth/resource-access.service';
import { RealtimeAuthorizationService } from '../../src/modules/realtime/realtime-authorization.service';
import { RealtimePubSubService } from '../../src/modules/realtime/realtime-pubsub.service';
import { RealtimeGateway } from '../../src/modules/realtime/realtime.gateway';
import { RealtimeIoAdapter } from '../../src/modules/realtime/realtime-io.adapter';
import { createFixture, removeFixture, RehearsalFixture, requireLocalDatabase } from '../mqtt/fixtures';

const origin = 'https://dashboard.vers.test';
const secret = 'segredo-sintetico-access-com-32-caracteres';
const repository = resolve(__dirname, '../../../..');

/** Aguarda estado observável com prazo, sem considerar PUBLISH como prova de entrega. */
async function until(condition: () => boolean, timeout = 15000): Promise<void> {
  const deadline = Date.now() + timeout;
  while (!condition()) {
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
  let redis: RealtimePubSubService;
  let f: RehearsalFixture;
  let userId: string;
  let sessionId: string;
  let cookie: string;
  let url: string;
  const sockets: Socket[] = [];

  /** Abre transporte real sem reconexão automática, permitindo observar cada nova assinatura. */
  async function connect(transport = 'websocket', headers = { Origin: origin, Cookie: cookie }): Promise<Socket> {
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
    app = module.createNestApplication(); app.useWebSocketAdapter(new RealtimeIoAdapter(app, config));
    await app.listen(0, '127.0.0.1'); url = await app.getUrl();
    redis = app.get(RealtimePubSubService); app.get(RealtimeGateway).start(); redis.start();
    await until(() => redis.status === 'ok');
  });
  afterEach(async () => {
    for (const socket of sockets.splice(0)) socket.disconnect();
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
});
