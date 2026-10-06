// Confere as rotas de veículos com JWT real e persistência sintética sem acessar serviços externos.
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
const secret = 'access-sintetico-com-mais-de-16-caracteres';
const refreshSecret = 'refresh-sintetico-com-mais-de-16-caracteres';
const date = new Date('2026-10-06T12:00:00.000Z');
const vehicle = { id: vehicleId, licensePlate: 'ABC1D23', brand: null, model: null,
  modelYear: null, createdAt: date, updatedAt: date };
const expected = { ...vehicle, relationship: 'OWNER', isPrimary: true,
  createdAt: date.toISOString(), updatedAt: date.toISOString() };

describe('veículos autenticados', () => {
  let app: INestApplication;
  let url: string;
  let access: string;
  const originalEnv = { ...process.env };
  const findSession = jest.fn();
  const findUser = jest.fn();
  const findMany = jest.fn();
  const findUnique = jest.fn();
  const count = jest.fn();
  const create = jest.fn();
  const lock = jest.fn();
  const transaction = jest.fn();
  const update = jest.fn();
  const updateMany = jest.fn();
  const unlink = jest.fn();
  const deleteVehicle = jest.fn();
  const deleteMessages = jest.fn();
  const tx = { userVehicle: { findMany, findUnique, count, create, update, updateMany, delete: unlink },
    vehicle: { delete: deleteVehicle }, mqttMessage: { deleteMany: deleteMessages }, $queryRaw: lock };

  /** Envia HTTP local para verificar DTO, sessão, CSRF e envelope juntos. */
  function request(path = '', method = 'GET', body?: object, authenticated = true, csrf = true): Promise<Response> {
    const nonce = 'a'.repeat(64);
    return fetch(url + '/api/v1/vehicles' + path, { method,
      headers: { 'Content-Type': 'application/json',
        ...(authenticated ? { Cookie: `vers_access=${access}; vers_csrf=${nonce}` } : {}),
        ...(csrf ? { Origin: 'http://localhost:3001', 'X-CSRF-Token': csrfToken(nonce, access, refreshSecret) } : {}) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  }

  beforeAll(async () => {
    Object.assign(process.env, { DATABASE_URL: 'postgresql://user:password@localhost:5432/vers_test',
      JWT_ACCESS_SECRET: secret, JWT_REFRESH_SECRET: refreshSecret,
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
    findMany.mockResolvedValue([{ relationship: 'OWNER', isPrimary: true, vehicle }]);
    findUnique.mockResolvedValue({ relationship: 'OWNER', isPrimary: true, vehicle });
    count.mockResolvedValue(0);
    lock.mockResolvedValue([{ id: userId }]);
    create.mockResolvedValue({ relationship: 'OWNER', isPrimary: true, vehicle });
    update.mockResolvedValue({ relationship: 'OWNER', isPrimary: true, vehicle });
    updateMany.mockResolvedValue({ count: 1 });
    unlink.mockResolvedValue({});
    deleteVehicle.mockResolvedValue({});
    deleteMessages.mockResolvedValue({ count: 0 });
    transaction.mockImplementation(async (callback: (db: typeof tx) => unknown) => callback(tx));
  });
  afterAll(async () => { if (app) await app.close(); process.env = originalEnv; });

  it('cadastra placa normalizada e vínculo OWNER principal numa transação', async () => {
    const response = await request('', 'POST', { licensePlate: ' abc-1d23 ', brand: 'Marca', model: 'Modelo', modelYear: 2026 });
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({ data: expected, requestId: expect.any(String) });
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(lock.mock.calls[0][0].join('')).toContain('FOR UPDATE');
    expect(lock.mock.calls[0][1]).toBe(userId);
    expect(lock.mock.invocationCallOrder[0]).toBeLessThan(count.mock.invocationCallOrder[0]);
    expect(count).toHaveBeenCalledWith({ where: { userId } });
    expect(create.mock.calls[0][0].data).toEqual({ user: { connect: { id: userId } },
      relationship: 'OWNER', isPrimary: true,
      vehicle: { create: { licensePlate: 'ABC1D23', brand: 'Marca', model: 'Modelo', modelYear: 2026 } } });
  });
  it('cadastra placa antiga e veículo posterior sem promover principal', async () => {
    count.mockResolvedValue(1);
    create.mockResolvedValue({ relationship: 'OWNER', isPrimary: false, vehicle: { ...vehicle, licensePlate: 'ABC1234' } });
    const response = await request('', 'POST', { licensePlate: 'abc-1234' });
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({ data: { licensePlate: 'ABC1234', isPrimary: false } });
    expect(create.mock.calls[0][0].data.isPrimary).toBe(false);
    expect(create.mock.calls[0][0].data.vehicle.create).toEqual({ licensePlate: 'ABC1234' });
  });
  it.each([{}, { licensePlate: 'ABC' }, { licensePlate: 123 }, { licensePlate: null },
    { licensePlate: 'ABC1D23', brand: null }, { licensePlate: 'ABC1D23', model: 12 },
    { licensePlate: 'ABC1D23', brand: 'a'.repeat(81) }, { licensePlate: 'ABC1D23', model: 'a'.repeat(121) },
    { licensePlate: 'ABC1D23', modelYear: 1885 }, { licensePlate: 'ABC1D23', modelYear: 2101 },
    { licensePlate: 'ABC1D23', modelYear: 2026.5 }, { licensePlate: 'ABC1D23', modelYear: null },
    { licensePlate: 'ABC1D23', modelYear: '2026' }, { licensePlate: 'ABC1D23', userId },
    { licensePlate: 'ABC1D23', isPrimary: true }, { licensePlate: 'ABC1D23', cpf: '123' }])('rejeita entrada inválida antes da escrita: %p', async (body) => {
    const response = await request('', 'POST', body);
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: { code: 'VALIDATION_ERROR' } });
    expect(transaction).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });
  it('lista apenas vínculos da conta com paginação e ordem estável', async () => {
    count.mockResolvedValue(3);
    const response = await request('?page=2&pageSize=2');
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ data: [expected],
      meta: { page: 2, pageSize: 2, totalItems: 3, totalPages: 2 }, requestId: expect.any(String) });
    expect(findMany.mock.calls[0][0]).toMatchObject({ where: { userId }, skip: 2, take: 2,
      orderBy: [{ vehicle: { createdAt: 'desc' } }, { vehicleId: 'asc' }] });
    expect(count).toHaveBeenCalledWith({ where: { userId } });
  });
  it('lista vazia usa defaults e totalPages zero sem envelope duplo', async () => {
    findMany.mockResolvedValue([]);
    const response = await request();
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ data: [], meta: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 } });
    expect(findMany.mock.calls[0][0]).toMatchObject({ skip: 0, take: 20 });
  });
  it.each(['?page=0', '?pageSize=101', '?page=1.5', '?userId=outro'])('recusa paginação/filtros inválidos: %s', async (query) => {
    expect((await request(query)).status).toBe(400);
    expect(findMany).not.toHaveBeenCalled();
  });
  it('consulta detalhe com vínculo na própria consulta e projeta campos públicos', async () => {
    const response = await request('/' + vehicleId);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ data: expected });
    expect(findUnique.mock.calls[0][0].where).toEqual({ userId_vehicleId: { userId, vehicleId } });
    expect(findUnique.mock.calls[0][0].select.vehicle.select).toEqual({ id: true, licensePlate: true,
      brand: true, model: true, modelYear: true, createdAt: true, updatedAt: true });
  });
  it('ADMIN também exige vínculo; ausente e alheio retornam VEHICLE_NOT_FOUND', async () => {
    findUser.mockResolvedValue({ id: userId, status: 'ACTIVE', roles: [{ role: 'ADMIN' }] });
    findUnique.mockResolvedValue(null);
    const response = await request('/' + vehicleId);
    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({ error: { code: 'VEHICLE_NOT_FOUND' } });
    expect(findUnique.mock.calls[0][0].where).toEqual({ userId_vehicleId: { userId, vehicleId } });
  });
  it('rejeita UUID inválido sem consultar veículo', async () => {
    expect((await request('/invalido')).status).toBe(400);
    expect(findUnique).not.toHaveBeenCalled();
  });
  it('protege leituras, cadastro e sessão revogada', async () => {
    expect((await request('', 'GET', undefined, false)).status).toBe(401);
    expect((await request('/' + vehicleId, 'GET', undefined, false)).status).toBe(401);
    expect((await request('', 'POST', { licensePlate: 'ABC1D23' }, false, false)).status).toBe(403);
    findSession.mockResolvedValue({ userId, revokedAt: date });
    expect((await request()).status).toBe(401);
    expect((await request('', 'POST', { licensePlate: 'ABC1D23' })).status).toBe(401);
    expect(create).not.toHaveBeenCalled();
  });
  it('recusa CSRF inválido sem transação', async () => {
    expect((await request('', 'POST', { licensePlate: 'ABC1D23' }, true, false)).status).toBe(403);
    expect(transaction).not.toHaveBeenCalled();
  });
  it('mapeia placa duplicada e preserva erro interno para outras falhas', async () => {
    create.mockRejectedValueOnce({ code: 'P2002', meta: { target: ['license_plate'] } });
    const duplicate = await request('', 'POST', { licensePlate: 'ABC1D23' });
    expect(duplicate.status).toBe(409);
    expect(await duplicate.json()).toMatchObject({ error: { code: 'VEHICLE_LICENSE_PLATE_ALREADY_REGISTERED' } });
    create.mockRejectedValueOnce(new Error('segredo-sintetico'));
    const failed = await request('', 'POST', { licensePlate: 'ABC1D23' });
    expect(failed.status).toBe(500);
    expect(JSON.stringify(await failed.json())).not.toContain('segredo-sintetico');
  });
  it('não cria veículo se a conta desaparecer antes da transação', async () => {
    lock.mockResolvedValue([]);
    const response = await request('', 'POST', { licensePlate: 'ABC1D23' });
    expect(response.status).toBe(404);
    expect(create).not.toHaveBeenCalled();
  });

  it('atualiza campos nullable e promove após desmarcar o anterior', async () => {
    const response = await request('/' + vehicleId, 'PATCH', { brand: null, model: 'Novo', modelYear: null, isPrimary: true });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ data: expected });
    expect(lock.mock.calls[0][0].join('')).toContain('users');
    expect(lock.mock.calls[1][0].join('')).toContain('vehicles');
    expect(lock.mock.invocationCallOrder[1]).toBeLessThan(findUnique.mock.invocationCallOrder[0]);
    expect(updateMany).toHaveBeenCalledWith({ where: { userId, isPrimary: true }, data: { isPrimary: false } });
    expect(updateMany.mock.invocationCallOrder[0]).toBeLessThan(update.mock.invocationCallOrder[0]);
    expect(update.mock.calls[0][0]).toMatchObject({ where: { userId_vehicleId: { userId, vehicleId } },
      data: { isPrimary: true, vehicle: { update: { brand: null, model: 'Novo', modelYear: null } } } });
  });
  it('false mantém o principal e ausência preserva campos', async () => {
    expect((await request('/' + vehicleId, 'PATCH', { isPrimary: false })).status).toBe(200);
    expect(updateMany).not.toHaveBeenCalled();
    expect(update.mock.calls[0][0].data).toEqual({});
  });
  it.each([{}, { licensePlate: 'ABC1234' }, { userId }, { relationship: 'ADMIN' },
    { brand: 12 }, { brand: 'a'.repeat(81) }, { model: false }, { model: 'a'.repeat(121) },
    { modelYear: '2026' }, { modelYear: 1885 }, { modelYear: 2101 }, { modelYear: 2026.5 },
    { isPrimary: null }, { isPrimary: 'true' }])('rejeita PATCH inválido: %p', async (body) => {
    expect((await request('/' + vehicleId, 'PATCH', body)).status).toBe(400);
    expect(update).not.toHaveBeenCalled();
    expect(updateMany).not.toHaveBeenCalled();
  });
  it.each(['PATCH', 'DELETE'])('exige vínculo na mutação %s', async (method) => {
    findUnique.mockResolvedValue(null);
    const response = await request('/' + vehicleId, method, method === 'PATCH' ? { model: null } : undefined);
    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({ error: { code: 'VEHICLE_NOT_FOUND' } });
    expect(update).not.toHaveBeenCalled();
    expect(unlink).not.toHaveBeenCalled();
  });
  it.each(['PATCH', 'DELETE'])('protege %s com sessão, CSRF e UUID', async (method) => {
    const body = method === 'PATCH' ? { model: null } : undefined;
    expect((await request('/' + vehicleId, method, body, true, false)).status).toBe(403);
    findSession.mockResolvedValue({ userId, revokedAt: date });
    expect((await request('/' + vehicleId, method, body)).status).toBe(401);
    findSession.mockResolvedValue({ id: sid, userId, expiresAt: new Date(Date.now() + 60_000), revokedAt: null });
    expect((await request('/invalido', method, body)).status).toBe(400);
    expect(unlink).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });
  it('exclui último vínculo e veículo físico com resposta vazia', async () => {
    findMany.mockResolvedValue([]);
    const response = await request('/' + vehicleId, 'DELETE');
    expect(response.status).toBe(204);
    expect(await response.text()).toBe('');
    expect(unlink).toHaveBeenCalledWith({ where: { userId_vehicleId: { userId, vehicleId } } });
    expect(count).toHaveBeenCalledWith({ where: { vehicleId } });
    expect(deleteVehicle).toHaveBeenCalledWith({ where: { id: vehicleId } });
    expect(deleteMessages).toHaveBeenCalledWith({ where: { device: { vehicleId } } });
    expect(unlink.mock.invocationCallOrder[0]).toBeLessThan(deleteMessages.mock.invocationCallOrder[0]);
    expect(deleteMessages.mock.invocationCallOrder[0]).toBeLessThan(deleteVehicle.mock.invocationCallOrder[0]);
    expect(update).not.toHaveBeenCalled();
  });
  it('promove automaticamente candidato único e preserva veículo compartilhado', async () => {
    const replacement = '00000000-0000-4000-8000-000000000004';
    findMany.mockResolvedValue([{ vehicleId: replacement }]);
    count.mockResolvedValue(1);
    expect((await request('/' + vehicleId, 'DELETE')).status).toBe(204);
    expect(update).toHaveBeenCalledWith({ where: { userId_vehicleId: { userId, vehicleId: replacement } }, data: { isPrimary: true } });
    expect(unlink.mock.invocationCallOrder[0]).toBeLessThan(update.mock.invocationCallOrder[0]);
    expect(deleteVehicle).not.toHaveBeenCalled();
    expect(deleteMessages).not.toHaveBeenCalled();
  });
  it('exige escolha entre vários candidatos antes de escrever', async () => {
    findMany.mockResolvedValue([{ vehicleId: sid }, { vehicleId: userId }]);
    expect((await request('/' + vehicleId, 'DELETE')).status).toBe(400);
    expect(unlink).not.toHaveBeenCalled();
  });
  it('promove substituto próprio escolhido entre vários candidatos', async () => {
    findMany.mockResolvedValue([{ vehicleId: sid }, { vehicleId: userId }]);
    count.mockResolvedValue(1);
    expect((await request('/' + vehicleId + '?replacementVehicleId=' + sid, 'DELETE')).status).toBe(204);
    expect(findMany.mock.calls[0][0]).toMatchObject({ where: { userId, vehicleId: { not: vehicleId } }, take: 2 });
    expect(update.mock.calls[0][0].where).toEqual({ userId_vehicleId: { userId, vehicleId: sid } });
  });
  it.each(['invalido', vehicleId])('rejeita substituto inválido: %s', async (replacement) => {
    expect((await request('/' + vehicleId + '?replacementVehicleId=' + replacement, 'DELETE')).status).toBe(400);
    expect(unlink).not.toHaveBeenCalled();
  });
  it('rejeita substituto de outra conta sem alterar vínculos', async () => {
    findUnique.mockResolvedValueOnce({ relationship: 'OWNER', isPrimary: true, vehicle }).mockResolvedValueOnce(null);
    expect((await request('/' + vehicleId + '?replacementVehicleId=' + sid, 'DELETE')).status).toBe(400);
    expect(unlink).not.toHaveBeenCalled();
  });
  it('desvincula não principal sem promover outro', async () => {
    findUnique.mockResolvedValue({ relationship: 'OWNER', isPrimary: false, vehicle });
    count.mockResolvedValue(1);
    expect((await request('/' + vehicleId, 'DELETE')).status).toBe(204);
    expect(update).not.toHaveBeenCalled();
    expect(findMany).not.toHaveBeenCalled();
  });
  it('propaga falha transacional sem revelar detalhes internos', async () => {
    transaction.mockRejectedValue(new Error('falha-interna-sintetica'));
    const response = await request('/' + vehicleId, 'PATCH', { model: null });
    expect(response.status).toBe(500);
    expect(JSON.stringify(await response.json())).not.toContain('falha-interna-sintetica');
  });
  it('interrompe exclusão física quando limpeza MQTT falha dentro da transação', async () => {
    findMany.mockResolvedValue([]);
    deleteMessages.mockRejectedValue(new Error('mqtt-sintetico'));
    const response = await request('/' + vehicleId, 'DELETE');
    expect(response.status).toBe(500);
    expect(deleteVehicle).not.toHaveBeenCalled();
    expect(transaction).toHaveBeenCalledTimes(1);
  });
  it('rejeita query extra de exclusão antes de iniciar transação', async () => {
    expect((await request('/' + vehicleId + '?userId=' + sid, 'DELETE')).status).toBe(400);
    expect(transaction).not.toHaveBeenCalled();
  });
});
