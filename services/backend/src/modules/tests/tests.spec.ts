// Verifica planejamento e consultas experimentais por HTTP com JWT e dados sintéticos.
import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { Server } from 'http';
import { AddressInfo } from 'net';
import { configureApplication } from '../../main';
import { PrismaService } from '../../prisma/prisma.service';
import { LoginAttemptsService } from '../auth/login-attempts.service';
import { csrfToken } from '../auth/csrf.guard';

const userId = '00000000-0000-4000-8000-000000000001';
const sid = '00000000-0000-4000-8000-000000000002';
const vehicleId = '00000000-0000-4000-8000-000000000003';
const installationId = '00000000-0000-4000-8000-000000000004';
const configurationId = '00000000-0000-4000-8000-000000000005';
const id = '00000000-0000-4000-8000-000000000006';
const secret = 'access-sintetico-com-mais-de-16-caracteres';
const refreshSecret = 'refresh-sintetico-com-mais-de-16-caracteres';
const date = new Date('2026-10-06T12:00:00.000Z');
const input = { installationId, configurationId, name: 'Ensaio', terrain: 'CITY', testLocation: 'Pista' };
const row = { id, installationId, configurationId, createdById: userId, name: 'Ensaio', status: 'PLANNED', terrain: 'CITY',
  snapshotVehicleModel: 'Modelo', snapshotTestLocation: 'Pista', snapshotActivePiezoCount: 4, snapshotConfigurationVersion: 2,
  startedAt: null, endedAt: null, vehicleWeightKg: null, averageEngineRpm: null, averageSpeedKph: null,
  inclineDegrees: null, outcome: null, notes: null, createdAt: date, updatedAt: date };
const accessWhere = { OR: [{ createdById: userId }, { installation: { vehicle: { users: { some: { userId } } } } }] };

describe('planejamento e leituras de testes', () => {
  let app: INestApplication;
  let url: string;
  let access: string;
  const originalEnv = { ...process.env };
  const findUser = jest.fn(); const findSession = jest.fn();
  const findMany = jest.fn(); const findFirst = jest.fn(); const count = jest.fn(); const create = jest.fn();
  const installation = jest.fn(); const configuration = jest.fn(); const lock = jest.fn(); const transaction = jest.fn();
  const tx = { test: { findMany, findFirst, count, create }, versInstallation: { findFirst: installation },
    configuration: { findFirst: configuration }, $queryRaw: lock };

  /** Exercita a API local com sessão assinada e CSRF opcional nas escritas. */
  function request(path = '', method = 'GET', body?: object, authenticated = true, csrf = true): Promise<Response> {
    const nonce = 'a'.repeat(64);
    return fetch(url + '/api/v1/tests' + path, { method,
      headers: { 'Content-Type': 'application/json',
        ...(authenticated ? { Cookie: `vers_access=${access}; vers_csrf=${nonce}` } : {}),
        ...(csrf ? { Origin: 'http://localhost:3001', 'X-CSRF-Token': csrfToken(nonce, access, refreshSecret) } : {}) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  }
  beforeAll(async () => {
    Object.assign(process.env, { DATABASE_URL: 'postgresql://user:password@localhost:5432/vers_test',
      JWT_ACCESS_SECRET: secret, JWT_REFRESH_SECRET: refreshSecret, NODE_ENV: 'test', API_PREFIX: 'api/v1', CORS_ORIGINS: 'http://localhost:3001' });
    const { AppModule } = await import('../../app.module');
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService).useValue({ ...tx, $transaction: transaction,
        user: { findUnique: findUser }, refreshSession: { findUnique: findSession } })
      .overrideProvider(LoginAttemptsService).useValue({}).compile();
    app = moduleRef.createNestApplication({ logger: false }); configureApplication(app, app.get(ConfigService)); await app.init();
    const server = app.getHttpServer() as Server;
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    access = await new JwtService().signAsync({ sub: userId, sid, typ: 'access' }, { secret, expiresIn: '15m' });
  });
  beforeEach(() => {
    jest.resetAllMocks();
    findUser.mockResolvedValue({ id: userId, status: 'ACTIVE', roles: [{ role: 'USER' }] });
    findSession.mockResolvedValue({ id: sid, userId, expiresAt: new Date(Date.now() + 60_000), revokedAt: null });
    findMany.mockResolvedValue([row]); findFirst.mockResolvedValue(row); count.mockResolvedValue(3); create.mockResolvedValue(row);
    installation.mockResolvedValue({ id: installationId, vehicleId, status: 'ACTIVE', vehicle: { model: 'Modelo' } });
    configuration.mockResolvedValue({ id: configurationId, activePiezoCount: 4, version: 2 }); lock.mockResolvedValue([{ id: userId }]);
    transaction.mockImplementation(async (callback: (db: typeof tx) => unknown) => callback(tx));
  });
  afterAll(async () => { if (app) await app.close(); process.env = originalEnv; });

  it('cria PLANNED com snapshot e criador do servidor após bloquear recursos', async () => {
    const response = await request('', 'POST', { ...input, vehicleWeightKg: 1000, notes: null });
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({ data: { id, status: 'PLANNED', createdById: userId,
      snapshot: { vehicleModel: 'Modelo', testLocation: 'Pista', activePiezoCount: 4, configurationVersion: 2 } } });
    expect(lock.mock.calls[0][0].join('')).toContain('users');
    expect(lock.mock.calls[1][0].join('')).toContain('FOR UPDATE');
    expect(lock.mock.invocationCallOrder[1]).toBeLessThan(installation.mock.invocationCallOrder[0]);
    expect(installation.mock.calls[0][0].where).toEqual({ id: installationId, vehicle: { users: { some: { userId } } } });
    expect(configuration.mock.calls[0][0].where).toEqual({ id: configurationId, installationId });
    expect(create.mock.calls[0][0].data).toEqual({ vehicleId, installationId, configurationId, createdById: userId,
      name: 'Ensaio', terrain: 'CITY', status: 'PLANNED', snapshotVehicleModel: 'Modelo', snapshotTestLocation: 'Pista',
      snapshotActivePiezoCount: 4, snapshotConfigurationVersion: 2, vehicleWeightKg: 1000, notes: null });
  });
  it('aceita peso null e modelo ausente sem inventar medições', async () => {
    installation.mockResolvedValue({ id: installationId, vehicleId, status: 'ACTIVE', vehicle: { model: null } });
    expect((await request('', 'POST', { ...input, vehicleWeightKg: null })).status).toBe(201);
    expect(create.mock.calls[0][0].data).toMatchObject({ vehicleWeightKg: null, snapshotVehicleModel: null });
    expect(create.mock.calls[0][0].data.startedAt).toBeUndefined();
  });
  it.each([{ name: '' }, { name: '   ' }, { name: 'a'.repeat(121) }, { name: 12 }, { testLocation: '' },
    { testLocation: ' ' }, { testLocation: 'a'.repeat(161) }, { terrain: 'INVALID' }, { installationId: 'ruim' },
    { configurationId: 'ruim' }, { vehicleWeightKg: 0 }, { vehicleWeightKg: -1 }, { vehicleWeightKg: '1000' },
    { notes: 12 }, { notes: 'a'.repeat(1001) }, { status: 'RUNNING' }, { createdById: sid }, { snapshot: {} },
    { startedAt: date.toISOString() }, { licensePlate: 'ABC1234' }])('rejeita payload inválido: %p', async (fields) => {
    expect((await request('', 'POST', { ...input, ...fields })).status).toBe(400);
    expect(transaction).not.toHaveBeenCalled(); expect(create).not.toHaveBeenCalled();
  });
  it('recusa campos obrigatórios ausentes', async () => {
    expect((await request('', 'POST', {})).status).toBe(400); expect(create).not.toHaveBeenCalled();
  });
  it.each(['installation', 'configuration', 'inactive'])('não cria com recurso inválido: %s', async (failure) => {
    if (failure === 'installation') installation.mockResolvedValue(null);
    if (failure === 'configuration') configuration.mockResolvedValue(null);
    if (failure === 'inactive') installation.mockResolvedValue({ status: 'INACTIVE' });
    const response = await request('', 'POST', input);
    expect(response.status).toBe(failure === 'inactive' ? 409 : 404);
    expect(await response.json()).toMatchObject({ error: { code: failure === 'inactive' ? 'INSTALLATION_STATE_CONFLICT' :
      failure === 'installation' ? 'INSTALLATION_NOT_FOUND' : 'CONFIGURATION_NOT_FOUND' } });
    expect(create).not.toHaveBeenCalled();
  });
  it('lista criador ou vínculo atual com filtros e intervalo semiaberto', async () => {
    const response = await request(`?page=2&pageSize=2&installationId=${installationId}&status=RUNNING&startedFrom=2026-10-01T00:00:00Z&startedTo=2026-10-02T00:00:00Z`);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ data: [{ id }], meta: { page: 2, pageSize: 2, totalItems: 3, totalPages: 2 } });
    expect(findMany.mock.calls[0][0]).toMatchObject({ where: { ...accessWhere, installationId, status: 'RUNNING',
      startedAt: { gte: new Date('2026-10-01T00:00:00Z'), lt: new Date('2026-10-02T00:00:00Z') } },
      skip: 2, take: 2, orderBy: [{ createdAt: 'desc' }, { id: 'asc' }] });
    expect(count.mock.calls[0][0].where).toEqual(findMany.mock.calls[0][0].where);
    expect(transaction.mock.calls[0][1]).toEqual({ isolationLevel: 'RepeatableRead' });
  });
  it('preserva consulta histórica e não retorna vehicleId/placa nem snapshot interno', async () => {
    findFirst.mockResolvedValue({ ...row, installationId: null, configurationId: null });
    const response = await request('/' + id);
    expect(response.status).toBe(200); const body = await response.json();
    expect(body.data).toMatchObject({ installationId: null, configurationId: null, createdAt: date.toISOString(), snapshot: { vehicleModel: 'Modelo' } });
    expect(body.data.vehicleId).toBeUndefined(); expect(body.data.snapshotVehicleModel).toBeUndefined();
    expect(findFirst.mock.calls[0][0].where).toEqual({ id, ...accessWhere });
    expect(findFirst.mock.calls[0][0].select.vehicleId).toBeUndefined();
  });
  it('lista vazia aplica defaults', async () => {
    findMany.mockResolvedValue([]); count.mockResolvedValue(0);
    expect(await (await request()).json()).toMatchObject({ data: [], meta: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 } });
  });
  it('ADMIN sem acesso também recebe TEST_NOT_FOUND', async () => {
    findUser.mockResolvedValue({ id: userId, status: 'ACTIVE', roles: [{ role: 'ADMIN' }] }); findFirst.mockResolvedValue(null);
    const response = await request('/' + id); expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({ error: { code: 'TEST_NOT_FOUND' } });
  });
  it.each(['?page=0', '?pageSize=101', '?status=ruim', '?installationId=ruim', '?userId=' + sid,
    '?startedFrom=2026-02-30T00:00:00Z', '?startedTo=2026-10-01T00:00:00-03:00',
    '?startedFrom=2026-10-02T00:00:00Z&startedTo=2026-10-01T00:00:00Z', '/ruim'])('rejeita filtro/ID inválido: %s', async (path) => {
    expect((await request(path)).status).toBe(400); expect(findMany).not.toHaveBeenCalled(); expect(findFirst).not.toHaveBeenCalled();
  });
  it('protege leituras e criação com sessão e CSRF', async () => {
    expect((await request('', 'GET', undefined, false)).status).toBe(401);
    expect((await request('/' + id, 'GET', undefined, false)).status).toBe(401);
    expect((await request('', 'POST', input, true, false)).status).toBe(403);
    findSession.mockResolvedValue({ userId, revokedAt: date });
    expect((await request('', 'POST', input)).status).toBe(401); expect(create).not.toHaveBeenCalled();
  });
  it('não expõe falha interna de criação', async () => {
    create.mockRejectedValue(new Error('segredo-sintetico'));
    const response = await request('', 'POST', input); expect(response.status).toBe(500);
    expect(JSON.stringify(await response.json())).not.toContain('segredo-sintetico');
  });
  it.each(['account', 'installation'])('não cria após recurso desaparecer no bloqueio: %s', async (resource) => {
    if (resource === 'account') lock.mockResolvedValueOnce([]);
    else lock.mockResolvedValueOnce([{ id: userId }]).mockResolvedValueOnce([]);
    const response = await request('', 'POST', input);
    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({ error: { code: resource === 'account' ? 'USER_NOT_FOUND' : 'INSTALLATION_NOT_FOUND' } });
    expect(create).not.toHaveBeenCalled();
  });
});
