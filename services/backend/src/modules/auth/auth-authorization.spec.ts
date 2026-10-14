// Exercita autorização HTTP com JWT real e persistência exclusivamente sintética.

import { Controller, Get, INestApplication, Param, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { Server } from 'http';
import { AddressInfo } from 'net';
import { configureApplication } from '../../main';
import { PrismaService } from '../../prisma/prisma.service';
import { LoginAttemptsService } from './login-attempts.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthPrincipal } from './auth-principal';
import { ResourceAccessService } from './resource-access.service';

const userId = '00000000-0000-4000-8000-000000000001';
const sessionId = '00000000-0000-4000-8000-000000000002';
const resourceId = '00000000-0000-4000-8000-000000000003';
const otherId = '00000000-0000-4000-8000-000000000004';
const accessSecret = 'access-sintetico-com-mais-de-16-caracteres';
const refreshSecret = 'refresh-sintetico-com-mais-de-16-caracteres';

@Controller('authorization-fixture')
@UseGuards(JwtAuthGuard, RolesGuard)
class AuthorizationFixtureController {
  /** Injeta o helper real para testar a consulta autorizada sem rota de produção. */
  constructor(private readonly resources: ResourceAccessService) {}

  /** Demonstra exceção pública em controlador protegido. */
  @Public()
  @Roles('ADMIN')
  @Get('public')
  publicRoute(): object { return { ok: true }; }

  /** Expõe somente o principal mínimo para verificar a identidade autenticada. */
  @Get('me')
  me(@CurrentUser() user: AuthPrincipal): AuthPrincipal { return user; }

  /** Exige papel global atual, sem confiar nos papéis enviados no JWT. */
  @Roles('ADMIN')
  @Get('admin')
  admin(): object { return { ok: true }; }

  /** Permite sobrescrever os papéis do controlador em uma rota específica. */
  @Roles('USER', 'ADMIN')
  @Get('member')
  member(): object { return { ok: true }; }

  /** Verifica vínculo de veículo antes de devolver uma confirmação sintética. */
  @Get('vehicles/:id')
  async vehicle(@CurrentUser() user: AuthPrincipal, @Param('id') id: string): Promise<object> {
    await this.resources.requireVehicle(user.id, id);
    return { ok: true };
  }

  /** Verifica acesso histórico do criador e vínculo atual com a instalação. */
  @Get('tests/:id')
  async test(@CurrentUser() user: AuthPrincipal, @Param('id') id: string): Promise<object> {
    await this.resources.requireTest(user.id, id);
    return { ok: true };
  }
}

// Controlador exclusivo do harness para verificar metadados herdados e sobrescritos.
@Controller('role-fixture')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
class RoleFixtureController {
  /** Usa o papel declarado no controlador quando a rota não define exceção. */
  @Get('inherited')
  inherited(): object { return { ok: true }; }

  /** Restringe a rota a USER mesmo quando o controlador declara ADMIN. */
  @Roles('USER')
  @Get('override')
  override(): object { return { ok: true }; }
}

describe('guards e autorização por cookie', () => {
  let app: INestApplication;
  let baseUrl: string;
  const findSession = jest.fn();
  const findUser = jest.fn();
  const findVehicle = jest.fn();
  const findInstallation = jest.fn();
  const findTest = jest.fn();
  const jwt = new JwtService();
  const originalEnv = { ...process.env };

  /** Assina tokens sintéticos para exercitar assinatura, expiração e claims reais. */
  async function token(claims: object = {}, options: JwtSignOptions = {}): Promise<string> {
    return jwt.signAsync({ sub: userId, sid: sessionId, typ: 'access', ...claims }, {
      secret: accessSecret, expiresIn: '15m', ...options,
    });
  }

  /** Faz uma chamada HTTP com cookie para verificar os guards na composição real. */
  async function request(path = 'me', cookie?: string): Promise<Response> {
    return fetch(`${baseUrl}/api/v1/authorization-fixture/${path}`, {
      headers: cookie ? { Cookie: cookie } : {},
    });
  }

  beforeAll(async () => {
    Object.assign(process.env, {
      DATABASE_URL: 'postgresql://user:password@localhost:5432/vers_test',
      JWT_ACCESS_SECRET: accessSecret, JWT_REFRESH_SECRET: refreshSecret,
      NODE_ENV: 'test', API_PREFIX: 'api/v1', CORS_ORIGINS: 'http://localhost:3001',
    });
    const { AppModule } = await import('../../app.module');
    const { AuthModule } = await import('./auth.module');
    const moduleRef = await Test.createTestingModule({ imports: [AppModule, AuthModule], controllers: [AuthorizationFixtureController, RoleFixtureController] })
      .overrideProvider(PrismaService).useValue({
        refreshSession: { findUnique: findSession }, user: { findUnique: findUser },
        vehicle: { findFirst: findVehicle }, versInstallation: { findFirst: findInstallation },
        test: { findFirst: findTest },
      })
      .overrideProvider(LoginAttemptsService).useValue({})
      .compile();
    app = moduleRef.createNestApplication({ logger: false });
    configureApplication(app, app.get(ConfigService));
    await app.init();
    const server = app.getHttpServer() as Server;
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  beforeEach(() => {
    jest.resetAllMocks();
    findSession.mockResolvedValue({ id: sessionId, userId, expiresAt: new Date(Date.now() + 60_000), revokedAt: null, replacedBySessionId: null });
    findUser.mockResolvedValue({ id: userId, status: 'ACTIVE', roles: [{ role: 'USER' }] });
  });

  afterAll(async () => {
    if (app) await app.close();
    process.env = originalEnv;
  });

  it('mantém rotas públicas acessíveis mesmo com cookie inválido', async () => {
    expect((await request('public', 'vers_access=invalido')).status).toBe(200);
    expect(findSession).not.toHaveBeenCalled();
    expect((await fetch(`${baseUrl}/api/v1/health/live`)).status).toBe(200);
  });

  it('recusa ausência e cookie duplicado; bearer e query não autenticam', async () => {
    const valid = await token();
    for (const cookie of [undefined, 'vers_refresh=' + valid, `vers_access=${valid}; vers_access=${valid}`]) {
      expect((await request('me', cookie)).status).toBe(401);
    }
    const bearer = await fetch(`${baseUrl}/api/v1/authorization-fixture/me?accessToken=${valid}`, {
      headers: { Authorization: `Bearer ${valid}` },
    });
    expect(bearer.status).toBe(401);
    expect(findSession).not.toHaveBeenCalled();
  });

  it('devolve somente identidade, sessão e papéis do banco, sem credenciais', async () => {
    const valid = await token({ roles: ['ADMIN'] });
    const response = await request('me', 'vers_access=' + valid);
    expect(response.status).toBe(200);
    const body = (await response.json()) as { data: object };
    expect(body.data).toEqual({ id: userId, sessionId, roles: ['USER'] });
    expect(findUser).toHaveBeenCalledWith({ where: { id: userId }, select: { id: true, status: true, roles: { select: { role: true } } } });
  });

  it('recusa assinatura, algoritmo, tipo, expiração e claims inválidos', async () => {
    const invalid = [
      'malformado', await token({}, { secret: refreshSecret }),
      await token({}, { algorithm: 'HS384' }), await token({}, { expiresIn: -1 }),
      await token({ typ: 'refresh' }), await token({ sub: null }),
      await token({ sid: null }), await token({ sid: 'id-invalido' }),
      await jwt.signAsync({ sub: userId, sid: sessionId, typ: 'access' }, { secret: accessSecret }),
    ];
    for (const value of invalid) {
      const response = await request('me', 'vers_access=' + value);
      expect(response.status).toBe(401);
      expect(await response.json()).toMatchObject({ error: { code: 'AUTH_UNAUTHORIZED' } });
    }
  });

  it.each([
    null,
    { userId: otherId },
    { revokedAt: new Date() },
    { replacedBySessionId: otherId },
    { expiresAt: new Date(0) },
  ])('recusa sessão ausente, alheia, revogada, substituída ou expirada: %p', async (change) => {
    findSession.mockResolvedValue(change === null ? null : {
      id: sessionId, userId, expiresAt: new Date(Date.now() + 60_000), revokedAt: null,
      replacedBySessionId: null, ...change,
    });
    expect((await request('me', 'vers_access=' + await token())).status).toBe(401);
  });

  it.each(['BLOCKED', 'PENDING_VERIFICATION', null])('recusa conta não ativa: %p', async (status) => {
    findUser.mockResolvedValue(status ? { id: userId, status, roles: [] } : null);
    expect((await request('me', 'vers_access=' + await token())).status).toBe(401);
  });

  it('usa papel atual do banco e aceita USER/ADMIN simultâneos', async () => {
    const cookie = 'vers_access=' + await token({ roles: ['ADMIN'] });
    expect((await request('admin', cookie)).status).toBe(403);
    expect((await request('member', cookie)).status).toBe(200);
    findUser.mockResolvedValue({ id: userId, status: 'ACTIVE', roles: [{ role: 'USER' }, { role: 'ADMIN' }] });
    expect((await request('admin', cookie)).status).toBe(200);
    findUser.mockResolvedValue({ id: userId, status: 'ACTIVE', roles: [{ role: 'USER' }] });
    expect((await request('admin', cookie)).status).toBe(403);
  });

  it('perde acesso imediatamente após revogação ou bloqueio da conta', async () => {
    const cookie = 'vers_access=' + await token();
    expect((await request('me', cookie)).status).toBe(200);
    findSession.mockResolvedValueOnce(null);
    expect((await request('me', cookie)).status).toBe(401);
    findUser.mockResolvedValueOnce({ id: userId, status: 'BLOCKED', roles: [] });
    expect((await request('me', cookie)).status).toBe(401);
  });

  it('herda papéis do controlador e permite sobrescrita pela rota', async () => {
    const cookie = 'vers_access=' + await token();
    const inherited = `${baseUrl}/api/v1/role-fixture/inherited`;
    const override = `${baseUrl}/api/v1/role-fixture/override`;
    expect((await fetch(inherited, { headers: { Cookie: cookie } })).status).toBe(403);
    expect((await fetch(override, { headers: { Cookie: cookie } })).status).toBe(200);
    findUser.mockResolvedValue({ id: userId, status: 'ACTIVE', roles: [{ role: 'ADMIN' }] });
    expect((await fetch(inherited, { headers: { Cookie: cookie } })).status).toBe(200);
    expect((await fetch(override, { headers: { Cookie: cookie } })).status).toBe(403);
  });

  it('filtra veículo pelo vínculo, inclusive para ADMIN, e mantém 404 indistinguível', async () => {
    const cookie = 'vers_access=' + await token();
    findUser.mockResolvedValue({ id: userId, status: 'ACTIVE', roles: [{ role: 'ADMIN' }] });
    findVehicle.mockResolvedValueOnce({ id: resourceId });
    expect((await request('vehicles/' + resourceId, cookie)).status).toBe(200);
    expect(findVehicle).toHaveBeenCalledWith({ where: { id: resourceId, users: { some: { userId } } }, select: { id: true } });
    findVehicle.mockResolvedValue(null);
    const foreign = await request('vehicles/' + resourceId, cookie);
    const absent = await request('vehicles/' + otherId, cookie);
    expect(foreign.status).toBe(404);
    expect(absent.status).toBe(404);
    expect(((await foreign.json()) as { error: object }).error).toEqual(((await absent.json()) as { error: object }).error);
  });

  it('preserva acesso do criador ao teste histórico sem instalação', async () => {
    findTest.mockResolvedValue({ id: resourceId });
    expect((await request('tests/' + resourceId, 'vers_access=' + await token())).status).toBe(200);
    expect(findTest).toHaveBeenCalledWith({
      where: { id: resourceId, OR: [{ createdById: userId }, { installation: { vehicle: { users: { some: { userId } } } } }] },
      select: { id: true },
    });
    findTest.mockResolvedValue(null);
    expect((await request('tests/' + otherId, 'vers_access=' + await token())).status).toBe(404);
  });

  it('consulta instalação apenas pelo vínculo atual e recusa recurso inacessível', async () => {
    const resources = app.get(ResourceAccessService);
    findInstallation.mockResolvedValueOnce({ id: resourceId });
    await expect(resources.requireInstallation(userId, resourceId)).resolves.toBeUndefined();
    expect(findInstallation).toHaveBeenCalledWith({ where: { id: resourceId, vehicle: { users: { some: { userId } } } }, select: { id: true } });
    await expect(resources.requireInstallation(userId, otherId)).rejects.toMatchObject({ status: 404 });
  });

  it('falha fechada quando o banco não responde, sem revelar a falha interna', async () => {
    findSession.mockRejectedValueOnce(new Error('postgresql://segredo-sintetico'));
    const response = await request('me', 'vers_access=' + await token());
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body).toMatchObject({ error: { code: 'INTERNAL_SERVER_ERROR' } });
    expect(JSON.stringify(body)).not.toContain('segredo-sintetico');
  });
});
