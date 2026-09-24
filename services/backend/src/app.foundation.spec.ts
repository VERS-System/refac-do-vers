// Testes HTTP da fundacao REST versionada do backend.

import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { Server } from 'http';
import { AddressInfo } from 'net';
import { configureApplication } from './main';
import { PrismaService } from './prisma/prisma.service';

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
});
