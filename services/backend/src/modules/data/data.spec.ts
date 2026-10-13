// Verifica consulta de telemetria por HTTP/JWT reais com fonte sintética isolada.
import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { Server } from 'http';
import { AddressInfo } from 'net';
import { configureApplication } from '../../main';
import { PrismaService } from '../../prisma/prisma.service';
import { LoginAttemptsService } from '../auth/login-attempts.service';
import { createTelemetryFixtures } from './fixtures/telemetry.fixtures';

const userId = '00000000-0000-4000-8000-000000000001';
const sid = '00000000-0000-4000-8000-000000000002';
const testId = '00000000-0000-4000-8000-000000000301';
const secret = 'access-sintetico-com-mais-de-16-caracteres';
const accessWhere = { OR: [{ createdById: userId }, { installation: { vehicle: { users: { some: { userId } } } } }] };
const publicKeys = ['id', 'testId', 'capturedAt', 'voltageV', 'currentA', 'powerW', 'devicePowerW',
  'accumulatedEnergyWh', 'accelerationXMs2', 'accelerationYMs2', 'accelerationZMs2', 'vibrationRmsMs2',
  'temperatureC', 'activePiezoCount', 'quality'];

describe('consulta autorizada de telemetria', () => {
  let app: INestApplication;
  let url: string;
  let access: string;
  const originalEnv = { ...process.env };
  const findUser = jest.fn(); const findSession = jest.fn();
  const findTest = jest.fn(); const findMany = jest.fn(); const count = jest.fn(); const transaction = jest.fn();
  const tx = { test: { findFirst: findTest }, telemetrySample: { findMany, count } };

  /** Envia leitura sem CSRF e usa exclusivamente o cookie de sessão quando solicitado. */
  function request(query = '', token: string | null = access, id = testId): Promise<Response> {
    return fetch(`${url}/api/v1/tests/${id}/telemetry${query}`, { headers: token === null ? {} : { Cookie: `vers_access=${token}` } });
  }

  beforeAll(async () => {
    Object.assign(process.env, { DATABASE_URL: 'postgresql://user:password@localhost:5432/vers_test',
      JWT_ACCESS_SECRET: secret, JWT_REFRESH_SECRET: 'refresh-sintetico-com-mais-de-16-caracteres',
      NODE_ENV: 'test', API_PREFIX: 'api/v1', CORS_ORIGINS: 'http://localhost:3001' });
    const { AppModule } = await import('../../app.module');
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService).useValue({ ...tx, $transaction: transaction,
        user: { findUnique: findUser }, refreshSession: { findUnique: findSession } })
      .overrideProvider(LoginAttemptsService).useValue({}).compile();
    app = moduleRef.createNestApplication({ logger: false }); configureApplication(app, app.get(ConfigService));
    await app.init(); const server = app.getHttpServer() as Server;
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    access = await new JwtService().signAsync({ sub: userId, sid, typ: 'access' }, { secret, expiresIn: '15m' });
  });
  beforeEach(() => {
    jest.resetAllMocks();
    findUser.mockResolvedValue({ id: userId, status: 'ACTIVE', roles: [{ role: 'USER' }] });
    findSession.mockResolvedValue({ id: sid, userId, expiresAt: new Date(Date.now() + 60_000), revokedAt: null });
    findTest.mockResolvedValue({ id: testId });
    findMany.mockResolvedValue(createTelemetryFixtures().regular.samples); count.mockResolvedValue(3);
    transaction.mockImplementation(async (callback: (db: typeof tx) => unknown) => callback(tx));
  });
  afterAll(async () => { if (app) await app.close(); process.env = originalEnv; });

  it('consulta pai, filtros e contagem no mesmo snapshot e retorna somente campos públicos', async () => {
    const response = await request('?page=2&pageSize=2&quality=VALID&capturedFrom=2026-10-13T00:00:00Z&capturedTo=2026-10-13T00:02:00Z');
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.meta).toEqual({ page: 2, pageSize: 2, totalItems: 3, totalPages: 2 });
    expect(body.requestId).toBe(response.headers.get('x-request-id'));
    expect(Object.keys(body.data[0]).sort()).toEqual([...publicKeys].sort());
    expect(body.data[0]).toMatchObject({ testId, capturedAt: '2026-10-13T00:00:00.000Z', powerW: 2, devicePowerW: 20 });
    expect(findTest.mock.calls[0][0]).toEqual({ where: { id: testId, ...accessWhere }, select: { id: true } });
    expect(findMany.mock.calls[0][0]).toMatchObject({ where: { testId, test: accessWhere, quality: 'VALID',
      capturedAt: { gte: new Date('2026-10-13T00:00:00Z'), lt: new Date('2026-10-13T00:02:00Z') } },
      skip: 2, take: 2, orderBy: [{ capturedAt: 'asc' }, { id: 'asc' }] });
    expect(Object.keys(findMany.mock.calls[0][0].select).sort()).toEqual([...publicKeys].sort());
    expect(count.mock.calls[0][0].where).toEqual(findMany.mock.calls[0][0].where);
    expect(transaction.mock.calls[0][1]).toEqual({ isolationLevel: 'RepeatableRead' });
    expect(findTest.mock.invocationCallOrder[0]).toBeLessThan(findMany.mock.invocationCallOrder[0]);
  });
  it('vazio autorizado usa padrões 1/20 e não confunde ausência de teste com lista vazia', async () => {
    findMany.mockResolvedValue([]); count.mockResolvedValue(0);
    const response = await request(); expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ data: [], meta: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 } });
    expect(findMany.mock.calls[0][0]).toMatchObject({ skip: 0, take: 20, where: { testId, test: accessWhere } });
  });
  it('preserva null, zero e histórico após remoção de referências sem expor origem interna', async () => {
    findTest.mockResolvedValue({ id: testId, createdById: userId, installationId: null });
    const fixtures = createTelemetryFixtures();
    findMany.mockResolvedValue([fixtures.absent.samples[0], { ...fixtures.zero.samples[1], deviceId: null, installationId: null, messageId: null }]);
    const response = await request(); expect(response.status).toBe(200);
    const { data } = await response.json();
    expect(data[0]).toMatchObject({ voltageV: null, currentA: null, powerW: null, accumulatedEnergyWh: null });
    expect(data[1]).toMatchObject({ voltageV: 4, currentA: 0, powerW: 0, accumulatedEnergyWh: 10 });
    for (const row of data) expect(Object.keys(row).sort()).toEqual([...publicKeys].sort());
  });
  it('ordena timestamps empatados pelo ID sem deduplicar leituras no endpoint', async () => {
    const samples = createTelemetryFixtures().regular.samples;
    findMany.mockResolvedValue([{ ...samples[0] }, { ...samples[1], capturedAt: samples[0].capturedAt }]);
    const response = await request(); expect(response.status).toBe(200);
    expect((await response.json()).data).toHaveLength(2);
    expect(findMany.mock.calls[0][0].orderBy).toEqual([{ capturedAt: 'asc' }, { id: 'asc' }]);
  });
  it.each(['USER', 'ADMIN'])('teste alheio/ausente usa TEST_NOT_FOUND para %s, sem consultar amostras', async (role) => {
    findUser.mockResolvedValue({ id: userId, status: 'ACTIVE', roles: [{ role }] }); findTest.mockResolvedValue(null);
    const response = await request(); expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({ error: { code: 'TEST_NOT_FOUND' } });
    expect(findTest.mock.calls[0][0].where).toEqual({ id: testId, ...accessWhere });
    expect(findMany).not.toHaveBeenCalled(); expect(count).not.toHaveBeenCalled();
  });
  it.each(['VALID', 'PARTIAL', 'SUSPECT', 'INVALID'])('aceita filtro de qualidade %s sem alterá-lo', async (quality) => {
    expect((await request('?quality=' + quality)).status).toBe(200);
    expect(findMany.mock.calls[0][0].where.quality).toBe(quality);
  });
  it.each(['capturedFrom', 'capturedTo'])('aceita limite UTC isolado %s e página máxima', async (field) => {
    expect((await request(`?${field}=2026-10-13T00:00:00Z&pageSize=100`)).status).toBe(200);
    expect(findMany.mock.calls[0][0].where.capturedAt).toEqual({ [field === 'capturedFrom' ? 'gte' : 'lt']: new Date('2026-10-13T00:00:00Z') });
    expect(findMany.mock.calls[0][0].take).toBe(100);
  });
  it.each(['?page=0', '?pageSize=101', '?page=1.5', '?quality=GOOD', '?quality=VALID&quality=PARTIAL',
    '?capturedFrom=2026-02-31T00:00:00Z', '?capturedTo=ruim', '?capturedFrom=2026-10-13T00:00:00-03:00',
    '?capturedFrom=2026-10-13T00:02:00Z&capturedTo=2026-10-13T00:01:00Z',
    '?capturedFrom=2026-10-13T00:01:00Z&capturedTo=2026-10-13T00:01:00Z', '?deviceId=' + sid,
    '?startedFrom=2026-10-13T00:00:00Z', '?userId=' + userId])('recusa filtros inválidos antes da consulta: %s', async (query) => {
    const response = await request(query); expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: { code: 'VALIDATION_ERROR' } });
    expect(transaction).not.toHaveBeenCalled();
  });
  it('recusa UUID inválido antes de consultar o pai', async () => {
    expect((await request('', access, 'ruim')).status).toBe(400); expect(findTest).not.toHaveBeenCalled();
  });
  it.each([null, 'malformado'])('exige access cookie válido: %s', async (token) => {
    expect((await request('', token)).status).toBe(401); expect(transaction).not.toHaveBeenCalled();
  });
  it('recusa sessão revogada sem acessar dados', async () => {
    findSession.mockResolvedValue({ userId, revokedAt: new Date() });
    expect((await request()).status).toBe(401); expect(transaction).not.toHaveBeenCalled();
  });
  it.each(['parent', 'samples', 'count'])('falha de %s não expõe detalhes internos', async (operation) => {
    const failure = new Error('segredo-sintetico');
    if (operation === 'parent') findTest.mockRejectedValue(failure);
    if (operation === 'samples') findMany.mockRejectedValue(failure);
    if (operation === 'count') count.mockRejectedValue(failure);
    const response = await request(); expect(response.status).toBe(500);
    expect(JSON.stringify(await response.json())).not.toContain('segredo-sintetico');
  });
});
