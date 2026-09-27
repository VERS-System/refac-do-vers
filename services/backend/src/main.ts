// Ponto de entrada que aplica a configuracao global e inicia o backend VERS.

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { createRequestIdMiddleware } from './common/http/request-id.middleware';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { ResponseEnvelopeInterceptor } from './common/interceptors/response-envelope.interceptor';
import { createCorsConfig } from './config/cors.config';
import { createHelmetConfig } from './config/security.config';

/**
 * Aplica os comportamentos globais e devolve a porta ja validada.
 * A separacao mantem o bootstrap testavel sem abrir conexoes HTTP nos testes.
 */
export function configureApplication(
  app: INestApplication,
  configService: ConfigService,
): number {
  const nodeEnvironment = configService.getOrThrow<string>('NODE_ENV');
  const corsOrigins = configService.getOrThrow<string>('CORS_ORIGINS');

  app.use(createRequestIdMiddleware());
  app.use(helmet(createHelmetConfig(nodeEnvironment)));
  app.enableCors(createCorsConfig(corsOrigins));
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new ResponseEnvelopeInterceptor(),
  );
  app.setGlobalPrefix(configService.getOrThrow<string>('API_PREFIX'));
  app.enableShutdownHooks();

  return configService.getOrThrow<number>('PORT');
}

/**
 * Cria a aplicacao NestJS e inicia o servidor com a configuracao validada.
 */
export async function bootstrap(): Promise<void> {
  const { AppModule } = await import('./app.module');
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const port = configureApplication(app, configService);

  await app.listen(port);
}

if (require.main === module) {
  void bootstrap();
}
