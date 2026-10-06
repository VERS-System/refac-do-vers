// Valida o perfil nas rotas reais com JWT e persistência sintética, sem serviços externos.
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

const id = '00000000-0000-4000-8000-000000000001';
const sid = '00000000-0000-4000-8000-000000000002';
const secret = 'access-sintetico-com-mais-de-16-caracteres';
const refreshSecret = 'refresh-sintetico-com-mais-de-16-caracteres';
const date = new Date('2026-10-06T12:00:00.000Z');
const publicProfile = { id, email: 'ana@example.com', displayName: 'Ana', avatarUrl: null,
  status: 'ACTIVE', roles: ['USER'], emailVerifiedAt: null,
  createdAt: date.toISOString(), updatedAt: date.toISOString() };

describe('perfil autenticado', () => {
  let app: INestApplication;
  let url: string;
  let access: string;
  const originalEnv = { ...process.env };
  const findUnique = jest.fn();
  const update = jest.fn();
  const findSession = jest.fn();

  /** Envia requisição real para conferir guards, DTO e envelope em conjunto. */
  function request(method = 'GET', body?: object, authenticated = true, csrf = true): Promise<Response> {
    const nonce = 'a'.repeat(64);
    return fetch(url + '/api/v1/users/me', { method,
      headers: { 'Content-Type': 'application/json',
        ...(authenticated ? { Cookie: `vers_access=${access}; vers_csrf=${nonce}` } : {}),
        ...(csrf ? { Origin: 'http://localhost:3001', 'X-CSRF-Token': csrfToken(nonce, access, refreshSecret) } : {}) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  }

  beforeAll(async () => {
    Object.assign(process.env, { DATABASE_URL: 'postgresql://user:password@localhost:5432/vers_test',
      JWT_ACCESS_SECRET: secret, JWT_REFRESH_SECRET: refreshSecret,
      NODE_ENV: 'test', API_PREFIX: 'api/v1', CORS_ORIGINS: 'http://localhost:3001' });
    const { AppModule } = await import('../../app.module');
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService).useValue({ user: { findUnique, update }, refreshSession: { findUnique: findSession } })
      .overrideProvider(LoginAttemptsService).useValue({}).compile();
    app = moduleRef.createNestApplication({ logger: false });
    configureApplication(app, app.get(ConfigService));
    await app.init();
    const server = app.getHttpServer() as Server;
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    access = await new JwtService().signAsync({ sub: id, sid, typ: 'access' }, { secret, expiresIn: '15m' });
  });
  beforeEach(() => {
    jest.resetAllMocks();
    findSession.mockResolvedValue({ id: sid, userId: id, expiresAt: new Date(Date.now() + 60_000), revokedAt: null });
    findUnique.mockImplementation(async ({ select }: { select: { email?: boolean } }) => select.email
      ? { ...publicProfile, roles: [{ role: 'USER' }], createdAt: date, updatedAt: date,
        passwordHash: 'segredo-sintetico' }
      : { id, status: 'ACTIVE', roles: [{ role: 'USER' }] });
    update.mockResolvedValue({ ...publicProfile, roles: [{ role: 'USER' }], createdAt: date, updatedAt: date });
  });
  afterAll(async () => { if (app) await app.close(); process.env = originalEnv; });

  it('retorna somente perfil público com datas UTC e consulta restrita à conta', async () => {
    const response = await request();
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ data: publicProfile, requestId: expect.any(String) });
    expect(findUnique.mock.calls[1][0].where).toEqual({ id });
    expect(findUnique.mock.calls[1][0].select.passwordHash).toBeUndefined();
    const second = await request();
    expect(JSON.stringify(await second.json())).not.toContain('segredo-sintetico');
  });
  it('atualiza apenas campo enviado e permite limpar campos com null', async () => {
    for (const data of [{ displayName: 'Novo nome' }, { avatarUrl: 'https://example.com/avatar.png' }, { displayName: null, avatarUrl: null }]) {
      const response = await request('PATCH', data);
      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({ data: publicProfile });
      expect(update.mock.calls.at(-1)[0]).toMatchObject({ where: { id }, data });
      expect(Object.keys(update.mock.calls.at(-1)[0].data)).toEqual(Object.keys(data));
    }
  });
  it.each([{}, { email: 'outra@example.com' }, { roles: ['ADMIN'] }, { id: sid },
    { displayName: 'a'.repeat(121) }, { displayName: 123 }, { avatarUrl: 123 }, { avatarUrl: 'invalida' }])('rejeita payload inválido sem escrita: %p', async (data) => {
    const response = await request('PATCH', data);
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: { code: 'VALIDATION_ERROR' } });
    expect(update).not.toHaveBeenCalled();
  });
  it('exige autenticação nas duas rotas e recusa sessão revogada', async () => {
    expect((await request('GET', undefined, false)).status).toBe(401);
    expect((await request('PATCH', { displayName: 'Ana' }, false, false)).status).toBe(403);
    findSession.mockResolvedValue({ userId: id, revokedAt: date });
    expect((await request()).status).toBe(401);
    expect((await request('PATCH', { displayName: 'Ana' })).status).toBe(401);
    expect(update).not.toHaveBeenCalled();
  });
  it('exige CSRF antes de escrever', async () => {
    expect((await request('PATCH', { displayName: 'Ana' }, true, false)).status).toBe(403);
    expect(update).not.toHaveBeenCalled();
  });
  it('trata perfil removido e falha de banco sem vazar detalhes', async () => {
    findUnique.mockResolvedValueOnce({ id, status: 'ACTIVE', roles: [] }).mockResolvedValueOnce(null);
    const absent = await request();
    expect(absent.status).toBe(404);
    expect(await absent.json()).toMatchObject({ error: { code: 'USER_NOT_FOUND' } });
    update.mockRejectedValueOnce({ code: 'P2025' });
    expect((await request('PATCH', { displayName: 'Ana' })).status).toBe(404);
    update.mockRejectedValueOnce(new Error('segredo-sintetico'));
    const failed = await request('PATCH', { displayName: 'Ana' });
    expect(failed.status).toBe(500);
    expect(JSON.stringify(await failed.json())).not.toContain('segredo-sintetico');
  });
});
