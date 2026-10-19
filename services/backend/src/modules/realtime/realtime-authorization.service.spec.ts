// Exercita autorização do tempo real com assinatura real e persistência sintética.
import { ConfigService } from '@nestjs/config';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { AuthService } from '../auth/auth.service';
import { ResourceAccessService } from '../auth/resource-access.service';
import { PrismaService } from '../../prisma/prisma.service';
import { LoginAttemptsService } from '../auth/login-attempts.service';
import { RealtimeAuthorizationService } from './realtime-authorization.service';

const userId = '00000000-0000-4000-8000-000000000001';
const sessionId = '00000000-0000-4000-8000-000000000002';
const resourceId = '00000000-0000-4000-8000-000000000003';
const secret = 'segredo-sintetico-access-com-32-caracteres';
const origin = 'https://dashboard.vers.test';
const command = { version: 1, resource: { type: 'test', id: resourceId } };

describe('RealtimeAuthorizationService', () => {
  const jwt = new JwtService();
  const session = jest.fn(); const user = jest.fn();
  const test = jest.fn(); const installation = jest.fn();
  const prisma = { refreshSession: { findUnique: session }, user: { findUnique: user },
    test: { findFirst: test }, versInstallation: { findFirst: installation } } as unknown as PrismaService;
  const config = new ConfigService({ auth: { accessSecret: secret }, CORS_ORIGINS: ` ${origin},${origin} ` });
  const auth = new AuthService(prisma, {} as LoginAttemptsService, jwt, config);
  const service = new RealtimeAuthorizationService(config, jwt, auth, new ResourceAccessService(prisma));
  let cookie: string;

  /** Assina apenas credenciais sintéticas para testar validação criptográfica real. */
  async function token(claims: object = {}, options: JwtSignOptions = {}): Promise<string> {
    return jwt.signAsync({ sub: userId, sid: sessionId, typ: 'access', ...claims },
      { secret, expiresIn: '15m', ...options });
  }

  beforeEach(async () => {
    jest.resetAllMocks();
    session.mockResolvedValue({ id: sessionId, userId, expiresAt: new Date(Date.now() + 60_000) });
    user.mockResolvedValue({ id: userId, status: 'ACTIVE', roles: [{ role: 'ADMIN' }] });
    test.mockResolvedValue({ id: resourceId }); installation.mockResolvedValue({ id: resourceId });
    cookie = `vers_access=${await token()}`;
  });

  it('autentica cookie, consulta sessão atual e usa regra histórica do REST', async () => {
    await expect(service.authorize(origin, cookie, command)).resolves.toEqual({ id: userId, sessionId, roles: ['ADMIN'] });
    expect(test).toHaveBeenCalledWith({ where: { id: resourceId, OR: [{ createdById: userId },
      { installation: { vehicle: { users: { some: { userId } } } } }] }, select: { id: true } });
    expect(installation).not.toHaveBeenCalled();
  });

  it('instalação exige vínculo atual mesmo para ADMIN', async () => {
    await service.authorize(origin, cookie, { version: 1, resource: { type: 'installation', id: resourceId } });
    expect(installation).toHaveBeenCalledWith({ where: { id: resourceId, vehicle: { users: { some: { userId } } } }, select: { id: true } });
    installation.mockResolvedValue(null);
    await expect(service.authorize(origin, cookie, { version: 1, resource: { type: 'installation', id: resourceId } }))
      .rejects.toThrow('RESOURCE_UNAVAILABLE');
  });

  it.each([undefined, '', 'null', '*', 'https://foreign.test', `${origin},https://foreign.test`])('recusa Origin %s antes do banco', async (value) => {
    await expect(service.authenticate(value, cookie)).rejects.toThrow('UNAUTHENTICATED');
    expect(session).not.toHaveBeenCalled();
  });

  it.each([undefined, '', 'vers_refresh=abc', 'vers_access=abc', 'vers_access=a; vers_access=b'])('recusa cookie %s', async (value) => {
    await expect(service.authenticate(origin, value)).rejects.toThrow('UNAUTHENTICATED');
    expect(session).not.toHaveBeenCalled();
  });

  it.each([
    { claims: {}, options: { secret: 'outro-segredo' } },
    { claims: {}, options: { algorithm: 'HS384' as const } },
    { claims: {}, options: { expiresIn: -1 } },
    { claims: { nbf: Math.floor(Date.now() / 1000) + 600 }, options: {} },
    { claims: { typ: 'refresh' }, options: {} },
    { claims: { sub: 'invalid' }, options: {} },
    { claims: { sid: 'invalid' }, options: {} },
  ])('recusa assinatura, prazo ou claims inválidos %#', async ({ claims, options }) => {
    await expect(service.authenticate(origin, `vers_access=${await token(claims, options)}`)).rejects.toThrow('UNAUTHENTICATED');
  });

  it('recusa JWT assinado sem expiração', async () => {
    const value = await jwt.signAsync({ sub: userId, sid: sessionId, typ: 'access' }, { secret });
    await expect(service.authenticate(origin, `vers_access=${value}`)).rejects.toThrow('UNAUTHENTICATED');
    expect(session).not.toHaveBeenCalled();
  });

  it.each([null, { revokedAt: new Date() }, { replacedBySessionId: resourceId },
    { expiresAt: new Date(0) }, { userId: resourceId }])('recusa sessão inválida %#', async (change) => {
    session.mockResolvedValue(change && { id: sessionId, userId, expiresAt: new Date(Date.now() + 60_000), ...change });
    await expect(service.authenticate(origin, cookie)).rejects.toThrow('UNAUTHENTICATED');
  });

  it.each([null, { status: 'SUSPENDED' }])('recusa conta indisponível %#', async (value) => {
    user.mockResolvedValue(value);
    await expect(service.authenticate(origin, cookie)).rejects.toThrow('UNAUTHENTICATED');
  });

  it.each([null, [], {}, { ...command, version: 2 }, { ...command, room: 'arbitrary' },
    { version: 1, resource: { type: 'user', id: resourceId } },
    { version: 1, resource: { type: 'test', id: 'invalid' } },
    { version: 1, resource: { ...command.resource, channel: 'arbitrary' } }])('recusa comando inválido %# antes do banco', async (value) => {
    await expect(service.authorize(origin, cookie, value)).rejects.toThrow('INVALID_REQUEST');
    expect(session).not.toHaveBeenCalled(); expect(test).not.toHaveBeenCalled();
  });

  it('não mantém sessão nem vínculo autorizados em cache', async () => {
    await service.authorize(origin, cookie, command);
    test.mockResolvedValue(null);
    await expect(service.authorize(origin, cookie, command)).rejects.toThrow('RESOURCE_UNAVAILABLE');
    session.mockResolvedValue(null);
    await expect(service.authorize(origin, cookie, command)).rejects.toThrow('UNAUTHENTICATED');
    expect(test).toHaveBeenCalledTimes(2);
  });

  it.each(['session', 'resource'])('falha fechada e oculta erro operacional em %s', async (stage) => {
    (stage === 'session' ? session : test).mockRejectedValue(new Error('conteúdo privado'));
    await expect(service.authorize(origin, cookie, command)).rejects.toThrow(/^REALTIME_UNAVAILABLE$/);
  });
});
