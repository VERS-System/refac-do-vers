// Exercita suporte por HTTP/JWT reais com banco sintético e conteúdo seguro.
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
const id = '00000000-0000-4000-8000-000000000005';
const secret = 'access-sintetico-com-mais-de-16-caracteres';
const refreshSecret = 'refresh-sintetico-com-mais-de-16-caracteres';
const date = new Date('2026-10-13T12:00:00.000Z');
const record = { id, vehicleId, installationId, reason: 'O sistema não gera energia.', status: 'OPEN', createdAt: date, updatedAt: date };

describe('solicitações próprias de suporte', () => {
  let app: INestApplication;
  let url: string;
  let access: string;
  const originalEnv = { ...process.env };
  const findUser = jest.fn();
  const findSession = jest.fn();
  const findMany = jest.fn();
  const findFirst = jest.fn();
  const count = jest.fn();
  const create = jest.fn();
  const findLink = jest.fn();
  const findInstallation = jest.fn();
  const lock = jest.fn();
  const transaction = jest.fn();
  const tx = { supportRequest: { findMany, findFirst, count, create },
    userVehicle: { findUnique: findLink }, versInstallation: { findFirst: findInstallation }, $queryRaw: lock };

  /** Envia comando com sessão e CSRF vinculados, sem dependências externas. */
  function request(path = '', method = 'GET', body?: unknown, authenticated = true, csrf = true): Promise<Response> {
    const nonce = 'a'.repeat(64);
    return fetch(url + '/api/v1/support-requests' + path, { method, headers: {
      'Content-Type': 'application/json',
      ...(authenticated ? { Cookie: `vers_access=${access}; vers_csrf=${nonce}` } : {}),
      ...(csrf ? { Origin: 'http://localhost:3001', 'X-CSRF-Token': csrfToken(nonce, authenticated ? access : null, refreshSecret) } : {}),
    }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  }

  beforeAll(async () => {
    Object.assign(process.env, { DATABASE_URL: 'postgresql://user:password@localhost:5432/vers_test',
      JWT_ACCESS_SECRET: secret, JWT_REFRESH_SECRET: refreshSecret, NODE_ENV: 'test', API_PREFIX: 'api/v1', CORS_ORIGINS: 'http://localhost:3001' });
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
    findMany.mockResolvedValue([record]); findFirst.mockResolvedValue(record); count.mockResolvedValue(3);
    create.mockResolvedValue(record); findLink.mockResolvedValue({ vehicleId });
    findInstallation.mockResolvedValue({ id: installationId }); lock.mockResolvedValue([{ id: userId }]);
    transaction.mockImplementation(async (callback: (db: typeof tx) => unknown) => callback(tx));
  });
  afterAll(async () => { if (app) await app.close(); process.env = originalEnv; });

  it('lista só solicitações próprias com filtros, projeção pública e contagem consistente', async () => {
    const response = await request('?page=2&pageSize=2&status=OPEN');
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({ data: [{ ...record, createdAt: date.toISOString(), updatedAt: date.toISOString() }],
      meta: { page: 2, pageSize: 2, totalItems: 3, totalPages: 2 } });
    expect(body.requestId).toBe(response.headers.get('x-request-id'));
    expect(findMany.mock.calls[0][0]).toMatchObject({ where: { requesterId: userId, status: 'OPEN' },
      skip: 2, take: 2, orderBy: [{ createdAt: 'desc' }, { id: 'asc' }] });
    expect(count.mock.calls[0][0].where).toEqual(findMany.mock.calls[0][0].where);
    expect(findMany.mock.calls[0][0].select).toEqual({ id: true, vehicleId: true, installationId: true,
      reason: true, status: true, createdAt: true, updatedAt: true });
    expect(Object.keys(body.data[0]).sort()).toEqual(Object.keys(record).sort());
    expect(transaction.mock.calls[0][1]).toEqual({ isolationLevel: 'RepeatableRead' });
  });
  it('retorna lista vazia com padrões 1/20', async () => {
    findMany.mockResolvedValue([]); count.mockResolvedValue(0);
    const response = await request();
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ data: [], meta: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 } });
  });
  it('preserva histórico próprio após exclusão do veículo inclusive para ADMIN', async () => {
    findUser.mockResolvedValue({ id: userId, status: 'ACTIVE', roles: [{ role: 'ADMIN' }] });
    findFirst.mockResolvedValue({ ...record, vehicleId: null, installationId: null });
    const response = await request('/' + id);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ data: { id, vehicleId: null, installationId: null } });
    expect(findFirst.mock.calls[0][0].where).toEqual({ id, requesterId: userId });
  });
  it('recurso ausente ou alheio usa o mesmo 404', async () => {
    findFirst.mockResolvedValue(null);
    const response = await request('/' + id);
    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({ error: { code: 'SUPPORT_REQUEST_NOT_FOUND' } });
  });
  it.each([undefined, installationId])('cria OPEN com solicitante do guard e instalação opcional: %s', async (installation) => {
    const response = await request('', 'POST', { vehicleId, reason: record.reason, ...(installation ? { installationId: installation } : {}) });
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({ data: { id, status: 'OPEN' } });
    expect(create.mock.calls[0][0].data).toEqual({ requesterId: userId, vehicleId,
      installationId: installation ?? null, reason: record.reason, status: 'OPEN' });
    expect(findLink.mock.calls[0][0].where).toEqual({ userId_vehicleId: { userId, vehicleId } });
    expect(lock.mock.calls[0].slice(1)).toEqual([userId]);
    expect(lock.mock.calls[1].slice(1)).toEqual([vehicleId]);
    expect(lock.mock.invocationCallOrder[1]).toBeLessThan(findLink.mock.invocationCallOrder[0]);
    if (installation) expect(findInstallation.mock.calls[0][0].where).toEqual({ id: installationId, vehicleId,
      vehicle: { users: { some: { userId } } } });
    else expect(findInstallation).not.toHaveBeenCalled();
  });
  it('aceita o limite de 1000 caracteres e página de 100', async () => {
    expect((await request('', 'POST', { vehicleId, reason: 'a'.repeat(1000) })).status).toBe(201);
    expect((await request('?pageSize=100')).status).toBe(200);
  });
  it('veículo alheio é recusado mesmo para ADMIN antes da escrita', async () => {
    findUser.mockResolvedValue({ id: userId, status: 'ACTIVE', roles: [{ role: 'ADMIN' }] });
    findLink.mockResolvedValue(null);
    const response = await request('', 'POST', { vehicleId, reason: record.reason });
    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({ error: { code: 'VEHICLE_NOT_FOUND' } });
    expect(create).not.toHaveBeenCalled();
  });
  it('instalação ausente/alheia/de outro veículo é recusada antes da escrita', async () => {
    findInstallation.mockResolvedValue(null);
    const response = await request('', 'POST', { vehicleId, installationId, reason: record.reason });
    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({ error: { code: 'INSTALLATION_NOT_FOUND' } });
    expect(create).not.toHaveBeenCalled();
  });
  it('conta removida durante criação não grava solicitação', async () => {
    lock.mockResolvedValueOnce([]);
    const response = await request('', 'POST', { vehicleId, reason: record.reason });
    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({ error: { code: 'USER_NOT_FOUND' } });
    expect(create).not.toHaveBeenCalled(); expect(findLink).not.toHaveBeenCalled();
  });
  it.each([{}, { vehicleId: 'ruim', reason: 'Falha' }, { vehicleId, reason: null }, { vehicleId, reason: 12 },
    { vehicleId, reason: '' }, { vehicleId, reason: '  \n ' }, { vehicleId, reason: 'a'.repeat(1001) },
    { vehicleId, reason: 'Falha', installationId: null }, { vehicleId, reason: 'Falha', installationId: 'ruim' },
    { vehicleId, reason: 'Falha', requesterId: userId }, { vehicleId, reason: 'Falha', status: 'RESOLVED' },
    { vehicleId, reason: 'Falha', cpf: '123' }])('rejeita payload inválido: %p', async (body) => {
    expect((await request('', 'POST', body)).status).toBe(400);
    expect(create).not.toHaveBeenCalled(); expect(transaction).not.toHaveBeenCalled();
  });
  it.each(['CPF 123.456.789-00', '12345678900', 'Placa abc-1d23', 'ABC1234', 'CRLV: documento',
    'RENAVAM 123', 'Senha: teste', 'token=teste', 'Authorization: Bearer teste',
    'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ4In0.assinatura', '-----BEGIN PRIVATE KEY-----',
    'sk-proj-exemplo', 'ghp_exemplo', 'Falha\u0000no sensor'])('rejeita dados e credenciais sem ecoar conteúdo: %s', async (reason) => {
    const response = await request('', 'POST', { vehicleId, reason });
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body).toMatchObject({ error: { code: 'VALIDATION_ERROR' } });
    expect(JSON.stringify(body)).not.toContain(reason);
    expect(create).not.toHaveBeenCalled();
  });
  it.each(['?page=0', '?pageSize=101', '?page=1.5', '?status=ruim', '?requesterId=' + userId, '/ruim'])('rejeita filtro ou ID inválido: %s', async (path) => {
    expect((await request(path)).status).toBe(400);
    expect(findMany).not.toHaveBeenCalled(); expect(findFirst).not.toHaveBeenCalled();
  });
  it.each(['', '/' + id])('exige sessão ativa nas leituras %s', async (path) => {
    expect((await request(path, 'GET', undefined, false)).status).toBe(401);
    findSession.mockResolvedValue({ userId, revokedAt: date });
    expect((await request(path)).status).toBe(401);
    expect(findMany).not.toHaveBeenCalled(); expect(findFirst).not.toHaveBeenCalled();
  });
  it('exige sessão e Origin/CSRF na criação', async () => {
    expect((await request('', 'POST', { vehicleId, reason: record.reason }, false, false)).status).toBe(403);
    expect((await request('', 'POST', { vehicleId, reason: record.reason }, true, false)).status).toBe(403);
    findSession.mockResolvedValue({ userId, revokedAt: date });
    expect((await request('', 'POST', { vehicleId, reason: record.reason })).status).toBe(401);
    expect(create).not.toHaveBeenCalled();
  });
  it.each(['list', 'detail', 'create'])('falha de banco em %s não expõe causa interna', async (operation) => {
    const failure = new Error('segredo-sintetico');
    if (operation === 'list') findMany.mockRejectedValue(failure);
    if (operation === 'detail') findFirst.mockRejectedValue(failure);
    if (operation === 'create') create.mockRejectedValue(failure);
    const response = await request(operation === 'detail' ? '/' + id : '', operation === 'create' ? 'POST' : 'GET',
      operation === 'create' ? { vehicleId, reason: record.reason } : undefined);
    expect(response.status).toBe(500);
    expect(JSON.stringify(await response.json())).not.toContain('segredo-sintetico');
  });
});
