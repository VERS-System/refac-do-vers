// Testes unitarios da configuracao global aplicada no bootstrap do backend.

import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { configureApplication } from './main';

describe('configureApplication', () => {
  it('aplica infraestrutura global de API e devolve a porta validada', () => {
    const app = {
      use: jest.fn(),
      enableCors: jest.fn(),
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
