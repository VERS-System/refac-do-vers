// Testes HTTP da fundacao REST versionada do backend.

import { ConflictException, Controller, Get, HttpException, HttpStatus, INestApplication, Logger, Param, Query } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { Server } from 'http';
import { AddressInfo } from 'net';
import Redis from 'ioredis';
import { configureApplication } from './main';
import { PrismaService } from './prisma/prisma.service';
import {
  PaginationQueryDto,
  UtcDateRangeQueryDto,
  UuidParamDto,
} from './common/dto/pagination.dto';

/** Expõe DTOs comuns apenas no harness HTTP para verificar a validação global. */
@Controller('foundation-fixture')
class FoundationFixtureController {
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

  beforeAll(async () => {
    process.env.DATABASE_URL =
      'postgresql://user:password@localhost:5432/vers_test';
    process.env.JWT_SECRET = 'segredo-sintetico-com-mais-de-16-caracteres';
    process.env.CORS_ORIGINS = 'http://localhost:3001';
    process.env.NODE_ENV = 'test';
    process.env.API_PREFIX = 'api/v1';

    redisPing = jest.spyOn(Redis.prototype, 'ping').mockResolvedValue('PONG');
    jest.spyOn(Redis.prototype, 'disconnect').mockImplementation();
    const prisma = new PrismaService();
    prismaConnect = jest.spyOn(prisma, '$connect').mockRejectedValue(new Error('database unavailable'));
    prismaQuery = jest.spyOn(prisma, '$queryRawUnsafe').mockResolvedValue([{ ok: 1 }]);
    jest.spyOn(prisma, '$disconnect').mockResolvedValue(undefined);

    const { AppModule } = await import('./app.module');
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [FoundationFixtureController],
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
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
      data: { dependencies: { database: string; redis: string } };
      requestId: string;
    };

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      data: { dependencies: { database: 'ok', redis: 'ok' } },
      requestId: 'integration-ready',
    });
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
