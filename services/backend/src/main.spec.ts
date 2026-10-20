// Testes unitarios da configuracao global aplicada no bootstrap do backend.

import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { bootstrap, configureApplication } from './main';
import { RealtimeIngestionService } from './modules/realtime/realtime-ingestion.service';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

jest.mock('./app.module', () => ({ AppModule: class {} }));

describe('entrada do backend compilado', () => {
  /** Mantém script local alinhado ao Docker, cujo caminho corresponde ao layout compilado do monorepo. */
  it('usa o mesmo executável e artefato no start local e no container', () => {
    const manifest = JSON.parse(readFileSync(resolve(__dirname, '../package.json'), 'utf8')) as { scripts: { start: string } };
    const dockerfile = readFileSync(resolve(__dirname, '../../../docker/Dockerfile.backend'), 'utf8');
    const command = dockerfile.match(/^CMD (\[.*\])$/m);
    expect(command).not.toBeNull();
    const argv = JSON.parse(command![1]) as string[];
    expect(manifest.scripts.start).toBe(argv.join(' '));
  });
});

describe('configureApplication', () => {
  it('aplica infraestrutura global de API e devolve a porta validada', () => {
    const app = {
      use: jest.fn(),
      enableCors: jest.fn(),
      useWebSocketAdapter: jest.fn(),
      getHttpServer: jest.fn(),
      useGlobalPipes: jest.fn(),
      useGlobalFilters: jest.fn(),
      useGlobalInterceptors: jest.fn(),
      setGlobalPrefix: jest.fn(),
      enableShutdownHooks: jest.fn(),
    } as unknown as INestApplication;
    const configService = {
      getOrThrow: jest.fn((key: string) => {
        const values: Record<string, string | number> = {
          API_PREFIX: 'api/v1',
          CORS_ORIGINS: 'https://app.vers.dev',
          NODE_ENV: 'production',
          PORT: 4100,
        };

        return values[key];
      }),
    } as unknown as ConfigService;

    const port = configureApplication(app, configService);

    expect(port).toBe(4100);
    expect(app.use).toHaveBeenCalledTimes(2);
    expect(app.enableCors).toHaveBeenCalledWith(
      expect.objectContaining({
        origin: ['https://app.vers.dev'],
        credentials: true,
      }),
    );
    expect(app.useGlobalPipes).toHaveBeenCalledTimes(1);
    expect(app.useWebSocketAdapter).toHaveBeenCalledTimes(1);
    expect(app.useGlobalFilters).toHaveBeenCalledTimes(1);
    expect(app.useGlobalInterceptors).toHaveBeenCalledTimes(1);
    expect(app.setGlobalPrefix).toHaveBeenCalledWith('api/v1');
    expect(app.enableShutdownHooks).toHaveBeenCalledTimes(1);
    expect(configService.getOrThrow).toHaveBeenCalledWith('API_PREFIX');
    expect(configService.getOrThrow).toHaveBeenCalledWith('CORS_ORIGINS');
    expect(configService.getOrThrow).toHaveBeenCalledWith('NODE_ENV');
    expect(configService.getOrThrow).toHaveBeenCalledWith('PORT');
  });
});

describe('bootstrap com ingestão opt-in', () => {
  const coordinator = { start: jest.fn() };
  const config = { getOrThrow: jest.fn(), get: jest.fn() };
  const app = { get: jest.fn(), listen: jest.fn(), close: jest.fn(),
    use: jest.fn(), enableCors: jest.fn(), useWebSocketAdapter: jest.fn(), getHttpServer: jest.fn(),
    useGlobalPipes: jest.fn(), useGlobalFilters: jest.fn(), useGlobalInterceptors: jest.fn(),
    setGlobalPrefix: jest.fn(), enableShutdownHooks: jest.fn() };
  beforeEach(() => {
    jest.resetAllMocks();
    config.getOrThrow.mockImplementation((key: string) => {
      const values: Record<string, string | number> = { NODE_ENV: 'test', CORS_ORIGINS: 'http://localhost:3050',
        API_PREFIX: 'api/v1', PORT: 3000 };
      return values[key];
    });
    config.get.mockReturnValue(false);
    app.get.mockImplementation((token: unknown) => token === ConfigService ? config : coordinator);
    app.listen.mockResolvedValue(undefined); app.close.mockResolvedValue(undefined);
    jest.spyOn(NestFactory, 'create').mockResolvedValue(app as never);
  });
  afterEach(() => { jest.restoreAllMocks(); });
  it('mantém ingestão desabilitada por padrão, sem resolver coordenador', async () => {
    await bootstrap(); expect(coordinator.start).not.toHaveBeenCalled();
    expect(app.get).not.toHaveBeenCalledWith(RealtimeIngestionService);
    expect(config.get).toHaveBeenCalledWith('MQTT_ENABLED', false);
    expect(app.close).not.toHaveBeenCalled();
  });
  it('aguarda HTTP pronto antes de iniciar coordenador habilitado', async () => {
    config.get.mockReturnValue(true); let listening!: () => void;
    const ready = new Promise<void>((resolve) => { listening = resolve; });
    app.listen.mockReturnValueOnce(ready);
    const pending = bootstrap();
    await new Promise<void>((resolve) => { setImmediate(resolve); });
    expect(app.listen).toHaveBeenCalledWith(3000); expect(coordinator.start).not.toHaveBeenCalled();
    listening(); await pending; expect(coordinator.start).toHaveBeenCalledTimes(1);
    expect(app.get).toHaveBeenCalledWith(RealtimeIngestionService);
  });
  it.each(['listen', 'start', 'close'])('fecha aplicação e contém erro seguro na falha %s', async (failure) => {
    config.get.mockReturnValue(true);
    if (failure === 'listen') app.listen.mockRejectedValueOnce(new Error('CANARY_SECRET'));
    else coordinator.start.mockImplementationOnce(() => { throw new Error('CANARY_SECRET'); });
    if (failure === 'close') app.close.mockRejectedValueOnce(new Error('CANARY_CLOSE_SECRET'));
    await expect(bootstrap()).rejects.toThrow('BACKEND_START_FAILED');
    expect(app.close).toHaveBeenCalledTimes(1);
    if (failure === 'listen') expect(coordinator.start).not.toHaveBeenCalled();
  });
});
