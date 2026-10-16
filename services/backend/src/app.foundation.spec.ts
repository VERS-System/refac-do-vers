// Testes HTTP da fundacao REST versionada do backend.

import { ConflictException, Controller, Get, HttpException, HttpStatus, INestApplication, Logger, Param, Post, Query, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { Server } from 'http';
import { AddressInfo } from 'net';
import Redis from 'ioredis';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { createHash } from 'crypto';
import { configureApplication } from './main';
import { PrismaService } from './prisma/prisma.service';
import { LoginAttemptsService } from './modules/auth/login-attempts.service';
import { AuthService } from './modules/auth/auth.service';
import { MqttService } from './modules/mqtt/mqtt.service';
import {
  PaginationQueryDto,
  UtcDateRangeQueryDto,
  UuidParamDto,
} from './common/dto/pagination.dto';

/** Expõe DTOs comuns apenas no harness HTTP para verificar a validação global. */
@Controller('foundation-fixture')
class FoundationFixtureController {
  /** Exercita a proteção CSRF sobre uma mutação sem dados reais. */
  @Post('mutation')
  mutation(): object {
    return { ok: true };
  }
  /** Responde sem dependências para verificar o limite HTTP real. */
  @Get('throttle')
  throttle(): object {
    return { ok: true };
  }

  /** Devolve uma lista sintética no contrato público para verificar o envelope. */
  @Get('list')
  list(): object {
    return {
      data: [],
      meta: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 },
      requestId: 'fixture-list',
    };
  }

  /** Provoca conflitos conhecidos somente no harness HTTP. */
  @Get('conflict')
  conflict(): never {
    throw new ConflictException('detalhe interno de conflito');
  }

  /** Provoca limite conhecido somente no harness HTTP. */
  @Get('rate-limit')
  rateLimit(): never {
    throw new HttpException('detalhe interno de limite', HttpStatus.TOO_MANY_REQUESTS);
  }

  /** Provoca falha inesperada somente no harness HTTP. */
  @Get('failure')
  failure(): never {
    throw new Error('senha-sintetica-sql-interno');
  }

  /** Recebe filtros e paginação sintéticos sem consultar dependências. */
  @Get('pagination')
  pagination(@Query() pagination: PaginationQueryDto): object {
    return { pagination };
  }

  /** Recebe datas sintéticas para verificar calendário e intervalo. */
  @Get('dates')
  dates(@Query() dates: UtcDateRangeQueryDto): object {
    return { dates };
  }

  /** Recebe um identificador sintético para verificar a validação de UUID. */
  @Get(':id')
  byId(@Param() params: UuidParamDto): object {
    return params;
  }
}

describe('fundacao HTTP da aplicacao', () => {
  let app: INestApplication;
  let baseUrl: string;
  let prismaQuery: jest.SpyInstance;
  let prismaConnect: jest.SpyInstance;
  let redisPing: jest.SpyInstance;
  let createUser: jest.SpyInstance;
  let findUser: jest.SpyInstance;
  let createSession: jest.SpyInstance;
  let createAudit: jest.SpyInstance;
  const loginAttempts = {
    assertAllowed: jest.fn(),
    recordFailure: jest.fn().mockResolvedValue(0),
    clear: jest.fn(),
  };

  beforeAll(async () => {
    process.env.DATABASE_URL =
      'postgresql://user:password@localhost:5432/vers_test';
    process.env.JWT_ACCESS_SECRET = 'segredo-access-sintetico-com-mais-de-16-caracteres';
    process.env.JWT_REFRESH_SECRET = 'segredo-refresh-sintetico-com-mais-de-16-caracteres';
    process.env.CORS_ORIGINS = 'http://localhost:3001';
    process.env.NODE_ENV = 'test';
    process.env.API_PREFIX = 'api/v1';

    redisPing = jest.spyOn(Redis.prototype, 'ping').mockResolvedValue('PONG');
    jest.spyOn(Redis.prototype, 'disconnect').mockImplementation();
    const prisma = new PrismaService();
    prismaConnect = jest.spyOn(prisma, '$connect').mockRejectedValue(new Error('database unavailable'));
    prismaQuery = jest.spyOn(prisma, '$queryRawUnsafe').mockResolvedValue([{ ok: 1 }]);
    createUser = jest.spyOn(prisma.user, 'create').mockResolvedValue({ id: 'user-id' } as never);
    findUser = jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(null);
    createSession = jest.spyOn(prisma.refreshSession, 'create').mockResolvedValue({ id: 'session-id' } as never);
    createAudit = jest.spyOn(prisma.auditEvent, 'create').mockResolvedValue({ id: 'audit-id' } as never);
    jest.spyOn(prisma, '$disconnect').mockResolvedValue(undefined);

    const { AppModule } = await import('./app.module');
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [FoundationFixtureController],
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .overrideProvider(LoginAttemptsService)
      .useValue(loginAttempts)
      .compile();

    app = moduleRef.createNestApplication();
    configureApplication(app, app.get(ConfigService));
    await app.init();

    const server = app.getHttpServer() as Server;
    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', resolve);
    });
    const address = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    await app.close();
    jest.restoreAllMocks();
  });

  it('responde live em /api/v1 com envelope e requestId', async () => {
    const response = await fetch(`${baseUrl}/api/v1/health/live`, {
      headers: { 'x-request-id': 'integration-live' },
    });
    const body = (await response.json()) as {
      data: { status: string; service: string };
      requestId: string;
    };

    expect(response.status).toBe(200);
    expect(response.headers.get('x-request-id')).toBe('integration-live');
    expect(body).toMatchObject({
      data: { status: 'ok', service: 'backend' },
      requestId: 'integration-live',
    });
  });

  it('responde ready com dependencia de banco verificada', async () => {
    const response = await fetch(`${baseUrl}/api/v1/health/ready`, {
      headers: { 'x-request-id': 'integration-ready' },
    });
    const body = (await response.json()) as {
      data: { dependencies: { database: string; redis: string; mqtt: string } };
      requestId: string;
    };

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      data: { dependencies: { database: 'ok', redis: 'ok', mqtt: 'disabled' } },
      requestId: 'integration-ready',
    });
  });

  it('retorna ready HTTP 200 com MQTT indisponível sem expor broker ou credenciais', async () => {
    const mqtt = jest.spyOn(app.get(MqttService), 'status', 'get').mockReturnValue('unavailable');
    try {
      const response = await fetch(`${baseUrl}/api/v1/health/ready`);
      expect(response.status).toBe(200);
      const body = (await response.json()) as { data: { dependencies: object } };
      expect(body.data.dependencies).toEqual({ database: 'ok', redis: 'ok', mqtt: 'unavailable' });
    } finally { mqtt.mockRestore(); }
  });

  it.each([
    ['register', 'register', 202], ['login', 'login', 200], ['refresh', 'refresh', 204],
    ['logout', 'logout', 204], ['logout-all', 'logoutAll', 204],
  ] as const)('persiste resultado e correlação HTTP de /auth/%s sem segredos', async (route, method, successStatus) => {
    const csrf = await fetch(`${baseUrl}/api/v1/auth/csrf`);
    const { data } = (await csrf.json()) as { data: { csrfToken: string } };
    const headers = { Origin: 'http://localhost:3001', Cookie: (csrf.headers.get('set-cookie') ?? '').split(';')[0], 'X-CSRF-Token': data.csrfToken, 'Content-Type': 'application/json', 'X-Request-Id': `audit-${route}` };
    const input = JSON.stringify({ email: 'synthetic@example.com', password: 'Senha@123456' });
    const service = jest.spyOn(app.get(AuthService), method);
    const result = method === 'login' ? { accessToken: 'synthetic-access', refreshToken: 'synthetic-refresh', user: {} } : method === 'refresh' ? { accessToken: 'synthetic-access', refreshToken: 'synthetic-refresh' } : undefined;
    try {
      createAudit.mockClear();
      service.mockResolvedValue(result as never);
      const success = await fetch(`${baseUrl}/api/v1/auth/${route}`, { method: 'POST', headers, body: input });
      expect(success.status).toBe(successStatus);
      // O controller pode finalizar 202/204 antes de o interceptor completar a gravação.
      await new Promise<void>((resolve) => setImmediate(resolve));
      expect(createAudit).toHaveBeenLastCalledWith({ data: { action: `auth.${route}`, resourceType: route === 'register' ? 'user' : 'session', result: 'SUCCESS', requestId: `audit-${route}`, actorId: null, resourceId: null } });

      service.mockRejectedValue(new UnauthorizedException('synthetic-secret-error'));
      const failure = await fetch(`${baseUrl}/api/v1/auth/${route}`, { method: 'POST', headers, body: input });
      expect(failure.status).toBe(401);
      expect(createAudit).toHaveBeenLastCalledWith({ data: { action: `auth.${route}`, resourceType: route === 'register' ? 'user' : 'session', result: 'FAILURE', requestId: `audit-${route}`, actorId: null, resourceId: null } });
      expect(JSON.stringify(createAudit.mock.calls)).not.toMatch(/synthetic|Senha/);

      service.mockResolvedValue(result as never);
      createAudit.mockRejectedValueOnce(new Error('synthetic-secret-storage'));
      const logger = jest.spyOn(Logger.prototype, 'error').mockImplementation();
      try {
        const unavailable = await fetch(`${baseUrl}/api/v1/auth/${route}`, { method: 'POST', headers, body: input });
        expect(unavailable.status).toBe(successStatus);
        await new Promise<void>((resolve) => setImmediate(resolve));
        expect(logger).toHaveBeenCalledWith({ event: 'audit_persistence_failed', action: `auth.${route}`, requestId: `audit-${route}` });
      } finally { logger.mockRestore(); }
    } finally { service.mockRestore(); }
  });

  it.each(['register', 'login', 'refresh', 'logout', 'logout-all'])('recusa CSRF multibyte em /auth/%s com envelope 403', async (route) => {
    createAudit.mockClear();
    const response = await fetch(`${baseUrl}/api/v1/auth/${route}`, {
      method: 'POST',
      headers: { Origin: 'http://localhost:3001', Cookie: `vers_csrf=${'a'.repeat(64)}`, 'X-CSRF-Token': 'é'.repeat(64) },
    });
    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ error: { code: 'AUTH_UNAUTHORIZED' } });
    expect(response.headers.get('set-cookie')).toBeNull();
    expect(createAudit).not.toHaveBeenCalled();
  });

  it('emite CSRF e exige cookie, header e origem permitida nas mutações', async () => {
    const csrf = await fetch(`${baseUrl}/api/v1/auth/csrf`);
    expect(csrf.status).toBe(200);
    const body = (await csrf.json()) as { data: { csrfToken: string } };
    const cookie = csrf.headers.get('set-cookie') ?? '';
    expect(body.data.csrfToken).toMatch(/^[a-f0-9]{64}$/);
    expect(cookie).toContain('vers_csrf=');
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Lax');

    const url = `${baseUrl}/api/v1/foundation-fixture/mutation`;
    const headers = {
      Origin: 'http://localhost:3001',
      Cookie: cookie.split(';')[0],
      'X-CSRF-Token': body.data.csrfToken,
    };
    expect((await fetch(url, { method: 'POST', headers })).status).toBe(201);
    expect((await fetch(url, { method: 'POST', headers: { ...headers, 'X-CSRF-Token': 'wrong' } })).status).toBe(403);
    expect((await fetch(url, { method: 'POST', headers: { ...headers, Origin: 'https://denied.example' } })).status).toBe(403);
    expect((await fetch(url, { method: 'POST', headers: { ...headers, Cookie: '' } })).status).toBe(403);
    expect((await fetch(url, { method: 'POST', headers: { ...headers, Origin: '' } })).status).toBe(403);
  });

  it('vincula o CSRF ao cookie de sessão após login', async () => {
    const csrf = await fetch(`${baseUrl}/api/v1/auth/csrf`, {
      headers: { Cookie: 'vers_access=synthetic-access' },
    });
    const token = ((await csrf.json()) as { data: { csrfToken: string } }).data.csrfToken;
    const csrfCookie = (csrf.headers.get('set-cookie') ?? '').split(';')[0];
    const nonce = csrfCookie.split('=')[1];
    expect(token).not.toBe(nonce);
    const url = `${baseUrl}/api/v1/foundation-fixture/mutation`;
    const headers = {
      Origin: 'http://localhost:3001',
      Cookie: `vers_access=synthetic-access; ${csrfCookie}`,
      'X-CSRF-Token': token,
    };
    expect((await fetch(url, { method: 'POST', headers })).status).toBe(201);
    expect((await fetch(url, { method: 'POST', headers: { ...headers, 'X-CSRF-Token': nonce } })).status).toBe(403);
    expect((await fetch(url, { method: 'POST', headers: { ...headers, Cookie: `vers_access=another-access; ${csrfCookie}` } })).status).toBe(403);
    expect((await fetch(url, { method: 'POST', headers: {
      ...headers,
      Cookie: `vers_access=synthetic-access; vers_access=another-access; ${csrfCookie}`,
      'X-CSRF-Token': nonce,
    } })).status).toBe(403);
  });

  it('cadastra sem sessão e responde igual para email novo ou existente', async () => {
    const csrf = await fetch(`${baseUrl}/api/v1/auth/csrf`);
    const { data } = (await csrf.json()) as { data: { csrfToken: string } };
    const headers = {
      Origin: 'http://localhost:3001',
      Cookie: (csrf.headers.get('set-cookie') ?? '').split(';')[0],
      'X-CSRF-Token': data.csrfToken,
      'Content-Type': 'application/json',
    };
    const url = `${baseUrl}/api/v1/auth/register`;
    const body = JSON.stringify({ email: 'Ana@Example.com', password: 'Senha@123' });
    const first = await fetch(url, { method: 'POST', headers, body });
    expect(first.status).toBe(202);
    expect(await first.text()).toBe('');
    expect(first.headers.get('set-cookie')).toBeNull();

    createUser.mockRejectedValueOnce({ code: 'P2002', meta: { target: ['email'] } });
    const duplicate = await fetch(url, { method: 'POST', headers, body });
    expect(duplicate.status).toBe(202);
    expect(await duplicate.text()).toBe('');
    expect(duplicate.headers.get('set-cookie')).toBeNull();
  });

  it('rejeita cadastro com senha inválida ou campo extra', async () => {
    const csrf = await fetch(`${baseUrl}/api/v1/auth/csrf`);
    const { data } = (await csrf.json()) as { data: { csrfToken: string } };
    const headers = {
      Origin: 'http://localhost:3001',
      Cookie: (csrf.headers.get('set-cookie') ?? '').split(';')[0],
      'X-CSRF-Token': data.csrfToken,
      'Content-Type': 'application/json',
    };
    for (const payload of [
      { email: 'ana@example.com', password: 'fraca' },
      { email: 'ana@example.com', password: 'Senha@123', admin: true },
      { email: 'invalido', password: 'Senha@123' },
    ]) {
      expect((await fetch(`${baseUrl}/api/v1/auth/register`, {
        method: 'POST', headers, body: JSON.stringify(payload),
      })).status).toBe(400);
    }
  });

  it('faz login de conta ativa com perfil público e JWTs só em cookies', async () => {
    const csrf = await fetch(`${baseUrl}/api/v1/auth/csrf`);
    const { data } = (await csrf.json()) as { data: { csrfToken: string } };
    findUser.mockResolvedValueOnce({
      id: '0a168912-d4e4-4f79-b50f-c129038c725e', email: 'ana@example.com',
      passwordHash: await bcrypt.hash('Senha@123', 4), status: 'ACTIVE',
      displayName: 'Ana', avatarUrl: null, emailVerifiedAt: new Date(),
      createdAt: new Date(), updatedAt: new Date(), roles: [{ role: 'USER' }],
    });
    const response = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: {
        Origin: 'http://localhost:3001',
        Cookie: (csrf.headers.get('set-cookie') ?? '').split(';')[0],
        'X-CSRF-Token': data.csrfToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: 'ANA@EXAMPLE.COM', password: 'Senha@123' }),
    });
    const body = (await response.json()) as { data: { user: { email: string } } };
    expect(response.status).toBe(200);
    expect(body.data.user.email).toBe('ana@example.com');
    expect(JSON.stringify(body)).not.toMatch(/passwordHash|accessToken|refreshToken/);
    expect(response.headers.get('set-cookie')).toContain('vers_access=');
    expect(response.headers.get('set-cookie')).toContain('vers_refresh=');
    expect(createSession).toHaveBeenCalledTimes(1);
  });

  it('renova a sessão com CSRF vinculado e responde 204 sem corpo', async () => {
    const refresh = jest.spyOn(app.get(AuthService), 'refresh').mockResolvedValueOnce({ accessToken: 'new-access', refreshToken: 'new-refresh' });
    const csrf = await fetch(`${baseUrl}/api/v1/auth/csrf`, { headers: { Cookie: 'vers_refresh=old-refresh' } });
    const { data } = (await csrf.json()) as { data: { csrfToken: string } };
    const csrfCookie = (csrf.headers.get('set-cookie') ?? '').split(';')[0];
    const response = await fetch(`${baseUrl}/api/v1/auth/refresh`, { method: 'POST', headers: {
      Origin: 'http://localhost:3001', Cookie: `${csrfCookie}; vers_refresh=old-refresh`, 'X-CSRF-Token': data.csrfToken,
    } });
    expect(response.status).toBe(204);
    expect(await response.text()).toBe('');
    expect(response.headers.get('set-cookie')).toContain('vers_refresh=new-refresh');
    expect(refresh).toHaveBeenCalledWith('old-refresh');
    refresh.mockRestore();
  });

  it('revoga por HTTP e limpa cookies em logout e logout-all, com 204 vazio', async () => {
    const prisma = app.get(PrismaService);
    const findSession = jest.spyOn(prisma.refreshSession, 'findUnique');
    const listSessions = jest.spyOn(prisma.refreshSession, 'findMany').mockResolvedValue([{ id: 'session-id' }] as never);
    const updateSessions = jest.spyOn(prisma.refreshSession, 'updateMany').mockResolvedValue({ count: 1 });
    const transaction = jest.spyOn(prisma, '$transaction').mockImplementation(async (run: unknown) =>
      (run as (tx: PrismaService) => Promise<void>)(prisma));
    try {
      for (const [route, typ, cookieName, secret] of [
        ['logout', 'refresh', 'vers_refresh', process.env.JWT_REFRESH_SECRET],
        ['logout-all', 'access', 'vers_access', process.env.JWT_ACCESS_SECRET],
      ]) {
        const token = await app.get(JwtService).signAsync({ sub: 'user-id', sid: 'session-id', typ }, { secret, expiresIn: '15m' });
        findSession.mockResolvedValue({
          id: 'session-id', userId: 'user-id', tokenHash: createHash('sha256').update(token).digest('hex'),
          expiresAt: new Date(Date.now() + 60_000), revokedAt: null, replacedBySessionId: null,
        } as never);
        findUser.mockResolvedValueOnce({ id: 'user-id', status: 'ACTIVE' });
        const authCookie = `${cookieName}=${token}`;
        const csrf = await fetch(`${baseUrl}/api/v1/auth/csrf`, { headers: { Cookie: authCookie } });
        const { data } = (await csrf.json()) as { data: { csrfToken: string } };
        const headers = {
          Origin: 'http://localhost:3001', 'X-CSRF-Token': data.csrfToken,
          Cookie: `${authCookie}; ${(csrf.headers.get('set-cookie') ?? '').split(';')[0]}`,
        };
        const denied = await fetch(`${baseUrl}/api/v1/auth/${route}`, { method: 'POST', headers: { ...headers, 'X-CSRF-Token': 'wrong' } });
        expect(denied.status).toBe(403);
        const response = await fetch(`${baseUrl}/api/v1/auth/${route}`, { method: 'POST', headers });
        expect(response.status).toBe(204);
        expect(await response.text()).toBe('');
        const cookies = response.headers.getSetCookie();
        expect(cookies).toHaveLength(2);
        expect(cookies[0]).toMatch(/vers_access=; Path=\/;/);
        expect(cookies[1]).toMatch(/vers_refresh=; Path=\/api\/v1\/auth;/);
        for (const cookie of cookies) {
          expect(cookie).toContain('Expires=Thu, 01 Jan 1970');
          expect(cookie).toContain('HttpOnly');
          expect(cookie).toContain('SameSite=Lax');
          expect(cookie).not.toContain(token);
        }
      }
      expect(listSessions).toHaveBeenCalledWith({ where: { userId: 'user-id' }, select: { id: true } });
    } finally {
      findSession.mockRestore();
      listSessions.mockRestore();
      updateSessions.mockRestore();
      transaction.mockRestore();
      findUser.mockReset().mockResolvedValue(null);
    }
  });

  it('nega logout sem autenticação apesar do CSRF válido, sem expirar cookies', async () => {
    const csrf = await fetch(`${baseUrl}/api/v1/auth/csrf`);
    const { data } = (await csrf.json()) as { data: { csrfToken: string } };
    for (const route of ['logout', 'logout-all']) {
      const response = await fetch(`${baseUrl}/api/v1/auth/${route}`, { method: 'POST', headers: {
        Origin: 'http://localhost:3001', 'X-CSRF-Token': data.csrfToken,
        Cookie: (csrf.headers.get('set-cookie') ?? '').split(';')[0],
      } });
      expect(response.status).toBe(401);
      expect(response.headers.get('set-cookie')).toBeNull();
      expect((await response.json()) as object).toMatchObject({ error: { code: 'AUTH_UNAUTHORIZED' } });
    }
  });

  it('não confirma nem limpa cookies se a persistência do logout falhar', async () => {
    const logout = jest.spyOn(app.get(AuthService), 'logout').mockRejectedValueOnce(new Error('postgresql://segredo-sintetico'));
    try {
      const csrf = await fetch(`${baseUrl}/api/v1/auth/csrf`, { headers: { Cookie: 'vers_refresh=synthetic-refresh' } });
      const { data } = (await csrf.json()) as { data: { csrfToken: string } };
      const response = await fetch(`${baseUrl}/api/v1/auth/logout`, { method: 'POST', headers: {
        Origin: 'http://localhost:3001', 'X-CSRF-Token': data.csrfToken,
        Cookie: `vers_refresh=synthetic-refresh; ${(csrf.headers.get('set-cookie') ?? '').split(';')[0]}`,
      } });
      expect(response.status).toBe(500);
      expect(response.headers.get('set-cookie')).toBeNull();
      const body = await response.json();
      expect(body).toMatchObject({ error: { code: 'INTERNAL_SERVER_ERROR' } });
      expect(JSON.stringify(body)).not.toContain('segredo-sintetico');
    } finally {
      logout.mockRestore();
    }
  });

  it('responde sem sessão para credencial inválida e conta pendente', async () => {
    const csrf = await fetch(`${baseUrl}/api/v1/auth/csrf`);
    const { data } = (await csrf.json()) as { data: { csrfToken: string } };
    const headers = {
      Origin: 'http://localhost:3001',
      Cookie: (csrf.headers.get('set-cookie') ?? '').split(';')[0],
      'X-CSRF-Token': data.csrfToken,
      'Content-Type': 'application/json',
    };
    const url = `${baseUrl}/api/v1/auth/login`;
    const payload = JSON.stringify({ email: 'ana@example.com', password: 'Senha@123' });
    const absent = await fetch(url, { method: 'POST', headers, body: payload });
    findUser.mockResolvedValueOnce({
      id: 'user-id', email: 'ana@example.com', passwordHash: await bcrypt.hash('Senha@123', 4),
      status: 'PENDING_VERIFICATION', roles: [],
    });
    const pending = await fetch(url, { method: 'POST', headers, body: payload });
    expect(absent.status).toBe(401);
    expect(pending.status).toBe(401);
    expect(((await absent.json()) as { error: object }).error).toEqual(((await pending.json()) as { error: object }).error);
    expect(absent.headers.get('set-cookie')).toBeNull();
    expect(pending.headers.get('set-cookie')).toBeNull();
  });

  it('nega login com 429 durante espera e 503 sem Redis, sem emitir cookies', async () => {
    const csrf = await fetch(`${baseUrl}/api/v1/auth/csrf`);
    const { data } = (await csrf.json()) as { data: { csrfToken: string } };
    const options = {
      method: 'POST',
      headers: {
        Origin: 'http://localhost:3001',
        Cookie: (csrf.headers.get('set-cookie') ?? '').split(';')[0],
        'X-CSRF-Token': data.csrfToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: 'ana@example.com', password: 'Senha@123' }),
    };
    loginAttempts.recordFailure.mockResolvedValueOnce(900_000);
    const limited = await fetch(`${baseUrl}/api/v1/auth/login`, options);
    loginAttempts.assertAllowed.mockRejectedValueOnce(new ServiceUnavailableException());
    const unavailable = await fetch(`${baseUrl}/api/v1/auth/login`, options);
    expect(limited.status).toBe(429);
    expect(unavailable.status).toBe(503);
    expect(limited.headers.get('set-cookie')).toBeNull();
    expect(unavailable.headers.get('set-cookie')).toBeNull();
  });

  it('mantém live disponível e recupera ready após falha do banco', async () => {
    prismaQuery.mockRejectedValueOnce(new Error('postgresql://secret'));

    const failed = await fetch(`${baseUrl}/api/v1/health/ready`);
    const failedBody = (await failed.json()) as { error: { code: string } };
    expect(failed.status).toBe(503);
    expect(failedBody.error.code).toBe('SERVICE_UNAVAILABLE');
    expect(JSON.stringify(failedBody)).not.toContain('postgresql://secret');

    const live = await fetch(`${baseUrl}/api/v1/health/live`);
    expect(live.status).toBe(200);
    expect(prismaConnect).not.toHaveBeenCalled();

    const recovered = await fetch(`${baseUrl}/api/v1/health/ready`);
    expect(recovered.status).toBe(200);
  });

  it('degrada ready quando Redis falha sem derrubar live', async () => {
    redisPing.mockRejectedValueOnce(new Error('redis://secret'));
    const failed = await fetch(`${baseUrl}/api/v1/health/ready`);
    expect(failed.status).toBe(503);
    expect(JSON.stringify(await failed.json())).not.toContain('redis://secret');
    expect((await fetch(`${baseUrl}/api/v1/health/live`)).status).toBe(200);
    expect((await fetch(`${baseUrl}/api/v1/health/ready`)).status).toBe(200);
  });

  it('rejeita campos extras, datas inexistentes e intervalo invertido por HTTP', async () => {
    for (const [route, query] of [
      ['pagination', 'extra=1'],
      ['dates', 'startedFrom=2026-02-31T12%3A00%3A00Z'],
      ['dates', 'startedFrom=2026-09-24T12%3A00%3A00-03%3A00'],
      ['dates', 'startedFrom=2026-09-24T12%3A00%3A00Z&startedTo=2026-09-24T11%3A00%3A00Z'],
      ['pagination', 'page=0'],
      ['pagination', 'page=-1'],
      ['pagination', 'pageSize=101'],
    ]) {
      const response = await fetch(`${baseUrl}/api/v1/foundation-fixture/${route}?${query}`);
      expect(response.status).toBe(400);
    }
  });

  it('transforma paginação e rejeita UUID inválido por HTTP', async () => {
    const valid = await fetch(
      `${baseUrl}/api/v1/foundation-fixture/pagination?page=2&pageSize=30`,
    );
    const body = (await valid.json()) as { data: { pagination: PaginationQueryDto } };
    expect(valid.status).toBe(200);
    expect(body.data.pagination).toMatchObject({ page: 2, pageSize: 30 });

    const invalid = await fetch(`${baseUrl}/api/v1/foundation-fixture/not-a-uuid`);
    expect(invalid.status).toBe(400);
  });

  it('aplica padrões e aceita os limites de paginação e datas UTC por HTTP', async () => {
    const defaults = await fetch(`${baseUrl}/api/v1/foundation-fixture/pagination`);
    expect(defaults.status).toBe(200);
    expect((await defaults.json()) as object).toMatchObject({
      data: { pagination: { page: 1, pageSize: 20 } },
    });

    const maximum = await fetch(
      `${baseUrl}/api/v1/foundation-fixture/pagination?page=1&pageSize=100`,
    );
    expect(maximum.status).toBe(200);

    const dates = await fetch(
      `${baseUrl}/api/v1/foundation-fixture/dates?startedFrom=2024-02-29T12%3A00%3A00Z&startedTo=2024-03-01T12%3A00%3A00Z`,
    );
    expect(dates.status).toBe(200);
  });

  it('preserva lista paginada sem envelope duplo por HTTP', async () => {
    const response = await fetch(`${baseUrl}/api/v1/foundation-fixture/list`, {
      headers: { 'x-request-id': 'list-request' },
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      data: [],
      meta: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 },
      requestId: 'list-request',
    });
  });

  it('padroniza erros HTTP sem expor detalhes internos', async () => {
    for (const [path, status, code] of [
      ['pagination?page=0', 400, 'VALIDATION_ERROR'],
      ['missing/path', 404, 'RESOURCE_NOT_FOUND'],
      ['conflict', 409, 'CONFLICT'],
      ['rate-limit', 429, 'RATE_LIMIT_EXCEEDED'],
      ['failure', 500, 'INTERNAL_SERVER_ERROR'],
    ] as const) {
      const response = await fetch(`${baseUrl}/api/v1/foundation-fixture/${path}`, {
        headers: { 'x-request-id': `error-${status}` },
      });
      const body = (await response.json()) as {
        error: { code: string; message: string; details: unknown[] };
        requestId: string;
        timestamp: string;
      };

      expect(response.status).toBe(status);
      expect(response.headers.get('x-request-id')).toBe(`error-${status}`);
      expect(body.error.code).toBe(code);
      expect(body.error.message).toEqual(expect.any(String));
      expect(Array.isArray(body.error.details)).toBe(true);
      expect(body.requestId).toBe(`error-${status}`);
      expect(new Date(body.timestamp).toISOString()).toBe(body.timestamp);
      expect(JSON.stringify(body)).not.toMatch(/senha-sintetica|sql-interno|detalhe interno|stack/);
    }
  });

  it('correlaciona resposta e log de erros 400 e 500', async () => {
    const errorLog = jest.spyOn(Logger.prototype, 'error').mockImplementation();

    try {
      for (const [path, status] of [
        ['pagination?page=0', 400],
        ['failure', 500],
      ] as const) {
        const requestId = `logged-${status}`;
        const response = await fetch(`${baseUrl}/api/v1/foundation-fixture/${path}`, {
          headers: { 'x-request-id': requestId },
        });
        const body = (await response.json()) as { requestId: string };
        const event = errorLog.mock.calls.map(([value]) => value).find(
          (value) => typeof value === 'object' && value !== null &&
            'requestId' in value && value.requestId === requestId,
        );

        expect(response.status).toBe(status);
        expect(body.requestId).toBe(requestId);
        expect(event).toMatchObject({
          event: 'http_request_failed',
          statusCode: status,
          requestId,
        });
        expect(JSON.stringify(event)).not.toMatch(/senha-sintetica|sql-interno/);
      }
    } finally {
      errorLog.mockRestore();
    }
  });

  it('isola requestIds de requisições concorrentes', async () => {
    const requestIds = ['parallel-a', 'parallel-b', 'parallel-c'];
    const successLog = jest.spyOn(Logger.prototype, 'log').mockImplementation();

    try {
      const responses = await Promise.all(requestIds.map((requestId) =>
        fetch(`${baseUrl}/api/v1/health/live`, {
          headers: { 'x-request-id': requestId },
        }),
      ));

      for (const [index, response] of responses.entries()) {
        const requestId = requestIds[index];
        const body = (await response.json()) as { requestId: string };
        const events = successLog.mock.calls.map(([value]) => value).filter(
          (value) => typeof value === 'object' && value !== null &&
            'requestId' in value && value.requestId === requestId,
        );

        expect(response.headers.get('x-request-id')).toBe(requestId);
        expect(body.requestId).toBe(requestId);
        expect(events).toHaveLength(1);
        expect(events[0]).toMatchObject({ statusCode: 200, requestId });
      }
    } finally {
      successLog.mockRestore();
    }
  });

  it('permite origem configurada com credenciais e bloqueia CORS de outra origem', async () => {
    const allowed = await fetch(`${baseUrl}/api/v1/health/live`, {
      headers: { Origin: 'http://localhost:3001' },
    });
    expect(allowed.headers.get('access-control-allow-origin')).toBe('http://localhost:3001');
    expect(allowed.headers.get('access-control-allow-credentials')).toBe('true');
    expect(allowed.headers.get('access-control-expose-headers')).toContain('x-request-id');
    expect(allowed.headers.get('x-content-type-options')).toBe('nosniff');

    const denied = await fetch(`${baseUrl}/api/v1/health/live`, {
      headers: { Origin: 'https://origem-negada.example' },
    });
    expect(denied.headers.get('access-control-allow-origin')).toBeNull();
    expect(denied.headers.get('access-control-allow-credentials')).toBe('true');
  });

  it('responde preflight somente para origem permitida', async () => {
    for (const [origin, expected] of [
      ['http://localhost:3001', 'http://localhost:3001'],
      ['https://origem-negada.example', null],
    ] as const) {
      const response = await fetch(`${baseUrl}/api/v1/health/live`, {
        method: 'OPTIONS',
        headers: {
          Origin: origin,
          'Access-Control-Request-Method': 'GET',
          'Access-Control-Request-Headers': 'x-request-id',
        },
      });
      expect(response.headers.get('access-control-allow-origin')).toBe(expected);
      if (expected) {
        expect(response.headers.get('access-control-allow-credentials')).toBe('true');
        expect(response.headers.get('access-control-allow-headers')).toContain('x-request-id');
      }
    }
  });

  it('aplica throttling real com envelope público de 429', async () => {
    let limited: Response | undefined;

    for (let attempt = 0; attempt <= 100; attempt += 1) {
      const response = await fetch(`${baseUrl}/api/v1/foundation-fixture/throttle`);
      if (response.status === 429) {
        limited = response;
        break;
      }
      expect(response.status).toBe(200);
    }

    expect(limited?.status).toBe(429);
    const body = (await limited?.json()) as {
      error: { code: string };
      requestId: string;
    };
    expect(body.error.code).toBe('RATE_LIMIT_EXCEEDED');
    expect(body.requestId).toBe(limited?.headers.get('x-request-id'));
  });
});

describe('configuração de inicialização', () => {
  /** Confirma que a configuração inválida impede a compilação do módulo raiz. */
  it('recusa prefixo inválido antes de iniciar a aplicação', async () => {
    const originalPrefix = process.env.API_PREFIX;
    process.env.API_PREFIX = '/api/';

    try {
      await jest.isolateModulesAsync(async () => {
        const { Test: IsolatedTest } = await import('@nestjs/testing');
        const { AppModule } = await import('./app.module');
        await expect(
          IsolatedTest.createTestingModule({ imports: [AppModule] }).compile(),
        ).rejects.toThrow(/API_PREFIX/);
      });
    } finally {
      if (originalPrefix === undefined) delete process.env.API_PREFIX;
      else process.env.API_PREFIX = originalPrefix;
    }
  });
});
