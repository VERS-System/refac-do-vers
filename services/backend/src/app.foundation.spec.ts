// Testes HTTP da fundacao REST versionada do backend.

import { Controller, Get, INestApplication, Param, Query } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { Server } from 'http';
import { AddressInfo } from 'net';
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

  beforeAll(async () => {
    process.env.DATABASE_URL =
      'postgresql://user:password@localhost:5432/vers_test';
    process.env.JWT_SECRET = 'segredo-sintetico-com-mais-de-16-caracteres';
    process.env.CORS_ORIGINS = 'http://localhost:3001';
    process.env.NODE_ENV = 'test';
    process.env.API_PREFIX = 'api/v1';

    const { AppModule } = await import('./app.module');
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [FoundationFixtureController],
    })
      .overrideProvider(PrismaService)
      .useValue({
        onModuleInit: jest.fn(),
        onModuleDestroy: jest.fn(),
        $queryRawUnsafe: jest.fn().mockResolvedValue([{ ok: 1 }]),
      })
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
      data: { dependencies: { database: string } };
      requestId: string;
    };

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      data: { dependencies: { database: 'ok' } },
      requestId: 'integration-ready',
    });
  });

  it('rejeita campos extras, datas inexistentes e intervalo invertido por HTTP', async () => {
    for (const [route, query] of [
      ['pagination', 'extra=1'],
      ['dates', 'startedFrom=2026-02-31T12%3A00%3A00Z'],
      ['dates', 'startedFrom=2026-09-24T12%3A00%3A00Z&startedTo=2026-09-24T11%3A00%3A00Z'],
      ['pagination', 'page=0'],
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
});
