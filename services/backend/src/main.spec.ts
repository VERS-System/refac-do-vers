// Testes unitários da configuração global aplicada no bootstrap do backend.

import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { configureApplication } from './main';

describe('configureApplication', () => {
  it('aplica infraestrutura global e devolve a porta validada', () => {
    const app = {
      use: jest.fn(),
      enableCors: jest.fn(),
      useGlobalPipes: jest.fn(),
      setGlobalPrefix: jest.fn(),
      enableShutdownHooks: jest.fn(),
    } as unknown as INestApplication;
    const configService = {
      getOrThrow: jest.fn((key: string) => {
        const values: Record<string, string | number> = {
          API_PREFIX: 'api',
          PORT: 4100,
        };

        return values[key];
      }),
    } as unknown as ConfigService;

    const port = configureApplication(app, configService);

    expect(port).toBe(4100);
    expect(app.use).toHaveBeenCalledTimes(1);
    expect(app.enableCors).toHaveBeenCalledTimes(1);
    expect(app.useGlobalPipes).toHaveBeenCalledTimes(1);
    expect(app.setGlobalPrefix).toHaveBeenCalledWith('api');
    expect(app.enableShutdownHooks).toHaveBeenCalledTimes(1);
    expect(configService.getOrThrow).toHaveBeenCalledWith('API_PREFIX');
    expect(configService.getOrThrow).toHaveBeenCalledWith('PORT');
  });
});
