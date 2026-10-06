// Exercita leituras autorizadas com HTTP/JWT reais e persistência sintética.
import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { Server } from 'http';
import { AddressInfo } from 'net';
import { configureApplication } from '../../main';
import { PrismaService } from '../../prisma/prisma.service';
import { LoginAttemptsService } from '../auth/login-attempts.service';

const userId = '00000000-0000-4000-8000-000000000001';
const sid = '00000000-0000-4000-8000-000000000002';
const vehicleId = '00000000-0000-4000-8000-000000000003';
const id = '00000000-0000-4000-8000-000000000004';
const configId = '00000000-0000-4000-8000-000000000005';
const secret = 'access-sintetico-com-mais-de-16-caracteres';
const date = new Date('2026-10-06T12:00:00.000Z');
const device = { id: sid, name: null, firmwareVersion: '1.0', status: 'OFFLINE', lastSeenAt: date };
const installation = { id, vehicleId, systemModel: 'VERS', status: 'ACTIVE', installedAt: null,
  createdAt: date, updatedAt: date, devices: [device] };
const configuration = { id: configId, installationId: id, name: 'Montagem', version: 2,
  activePiezoCount: 4, piezoAssociation: 'PARALLEL', installationPoint: 'Suspensão',
  storageType: 'BATTERY', notes: null, createdAt: date };
const accessWhere = { vehicle: { users: { some: { userId } } } };

describe('leituras de instalações e configurações', () => {
  let app: INestApplication;
  let url: string;
  let access: string;
  const originalEnv = { ...process.env };
  const findUser = jest.fn();
  const findSession = jest.fn();
  const findMany = jest.fn();
  const findFirst = jest.fn();
  const count = jest.fn();
  const configMany = jest.fn();
  const configFirst = jest.fn();
  const configCount = jest.fn();
  const transaction = jest.fn();
  const tx = { versInstallation: { findMany, findFirst, count },
    configuration: { findMany: configMany, findFirst: configFirst, count: configCount } };

  /** Envia leituras locais sem CSRF, usando a sessão assinada quando solicitado. */
  function request(path = '', authenticated = true): Promise<Response> {
    return fetch(url + '/api/v1/installations' + path,
      { headers: authenticated ? { Cookie: `vers_access=${access}` } : {} });
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
    app = moduleRef.createNestApplication({ logger: false });
    configureApplication(app, app.get(ConfigService));
    await app.init();
    const server = app.getHttpServer() as Server;
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    access = await new JwtService().signAsync({ sub: userId, sid, typ: 'access' }, { secret, expiresIn: '15m' });
  });
  beforeEach(() => {
    jest.resetAllMocks();
    findUser.mockResolvedValue({ id: userId, status: 'ACTIVE', roles: [{ role: 'USER' }] });
    findSession.mockResolvedValue({ id: sid, userId, expiresAt: new Date(Date.now() + 60_000), revokedAt: null });
    findMany.mockResolvedValue([installation]);
    findFirst.mockResolvedValue(installation);
    count.mockResolvedValue(3);
    configMany.mockResolvedValue([configuration]);
    configFirst.mockResolvedValue(configuration);
    configCount.mockResolvedValue(3);
    transaction.mockImplementation(async (callback: (db: typeof tx) => unknown) => callback(tx));
  });
  afterAll(async () => { if (app) await app.close(); process.env = originalEnv; });

  it('lista instalações próprias com filtros, paginação e projeção pública', async () => {
    const response = await request(`?page=2&pageSize=2&vehicleId=${vehicleId}&status=ACTIVE`);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({ data: [{ id, vehicleId, installedAt: null,
      createdAt: date.toISOString(), activeDevice: { ...device, lastSeenAt: date.toISOString() } }],
      meta: { page: 2, pageSize: 2, totalItems: 3, totalPages: 2 } });
    expect(Object.keys(body.data[0]).sort()).toEqual(['id', 'vehicleId', 'systemModel', 'status',
      'installedAt', 'activeDevice', 'createdAt', 'updatedAt'].sort());
    expect(findMany.mock.calls[0][0]).toMatchObject({ where: { ...accessWhere, vehicleId, status: 'ACTIVE' },
      skip: 2, take: 2, orderBy: [{ createdAt: 'desc' }, { id: 'asc' }] });
    expect(count.mock.calls[0][0].where).toEqual(findMany.mock.calls[0][0].where);
    expect(findMany.mock.calls[0][0].select.devices).toEqual({ where: { revokedAt: null, status: { not: 'REVOKED' } },
      take: 1, select: { id: true, name: true, firmwareVersion: true, status: true, lastSeenAt: true } });
    expect(transaction.mock.calls[0][1]).toEqual({ isolationLevel: 'RepeatableRead' });
  });
  it('retorna dispositivo null e datas UTC no detalhe sem campos internos', async () => {
    findFirst.mockResolvedValue({ ...installation, installedAt: date, devices: [] });
    const response = await request('/' + id);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ data: { id, activeDevice: null, installedAt: date.toISOString() } });
    expect(findFirst.mock.calls[0][0].where).toEqual({ id, ...accessWhere });
    expect(findFirst.mock.calls[0][0].select.serialNumber).toBeUndefined();
  });
  it('lista vazia usa defaults sem envelope duplo', async () => {
    findMany.mockResolvedValue([]); count.mockResolvedValue(0);
    const response = await request();
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ data: [], meta: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 } });
    expect(findMany.mock.calls[0][0]).toMatchObject({ skip: 0, take: 20 });
  });
  it('lista versões com acesso à instalação e snapshot compartilhado', async () => {
    const response = await request(`/${id}/configurations?page=2&pageSize=2`);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ data: [{ ...configuration, createdAt: date.toISOString() }],
      meta: { page: 2, pageSize: 2, totalItems: 3, totalPages: 2 } });
    expect(findFirst.mock.calls[0][0].where).toEqual({ id, ...accessWhere });
    expect(configMany.mock.calls[0][0]).toMatchObject({ where: { installationId: id, installation: accessWhere },
      skip: 2, take: 2, orderBy: [{ version: 'desc' }, { id: 'asc' }] });
    expect(configCount.mock.calls[0][0].where).toEqual(configMany.mock.calls[0][0].where);
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(transaction.mock.calls[0][1]).toEqual({ isolationLevel: 'RepeatableRead' });
  });
  it('detalhe de configuração filtra ID, instalação e conta na própria consulta', async () => {
    const response = await request(`/${id}/configurations/${configId}`);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ data: { ...configuration, createdAt: date.toISOString() } });
    expect(configFirst.mock.calls[0][0].where).toEqual({ id: configId, installationId: id, installation: accessWhere });
  });
  it.each(['/' + id, `/${id}/configurations`])('ausência/acesso alheio usa INSTALLATION_NOT_FOUND: %s', async (path) => {
    findUser.mockResolvedValue({ id: userId, status: 'ACTIVE', roles: [{ role: 'ADMIN' }] });
    findFirst.mockResolvedValue(null);
    const response = await request(path);
    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({ error: { code: 'INSTALLATION_NOT_FOUND' } });
    expect(configMany).not.toHaveBeenCalled();
    expect(findFirst.mock.calls[0][0].where).toEqual({ id, ...accessWhere });
  });
  it('configuração ausente, alheia ou de outra instalação usa CONFIGURATION_NOT_FOUND', async () => {
    configFirst.mockResolvedValue(null);
    const response = await request(`/${id}/configurations/${configId}`);
    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({ error: { code: 'CONFIGURATION_NOT_FOUND' } });
  });
  it.each(['?page=0', '?pageSize=101', '?page=1.5', '?vehicleId=ruim', '?status=ruim', '?userId=' + userId,
    '/ruim', `/${id}/configurations/ruim`, `/${id}/configurations?vehicleId=${vehicleId}`])('rejeita parâmetros inválidos: %s', async (path) => {
    expect((await request(path)).status).toBe(400);
    expect(findMany).not.toHaveBeenCalled(); expect(findFirst).not.toHaveBeenCalled();
    expect(configFirst).not.toHaveBeenCalled(); expect(configMany).not.toHaveBeenCalled();
  });
  it.each(['', '/' + id, `/${id}/configurations`, `/${id}/configurations/${configId}`])('protege leitura %s com sessão válida', async (path) => {
    expect((await request(path, false)).status).toBe(401);
    findSession.mockResolvedValue({ userId, revokedAt: date });
    expect((await request(path)).status).toBe(401);
    expect(findFirst).not.toHaveBeenCalled(); expect(findMany).not.toHaveBeenCalled();
    expect(configFirst).not.toHaveBeenCalled(); expect(configMany).not.toHaveBeenCalled();
  });
  it('falha interna não expõe detalhes da persistência', async () => {
    configFirst.mockRejectedValue(new Error('segredo-sintetico'));
    const response = await request(`/${id}/configurations/${configId}`);
    expect(response.status).toBe(500);
    expect(JSON.stringify(await response.json())).not.toContain('segredo-sintetico');
  });
});
