// Ponto de entrada que aplica a configuração global e inicia o backend VERS.

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { createCorsConfig } from './config/cors.config';
import { helmetConfig } from './config/security.config';

/**
 * Aplica os comportamentos globais e devolve a porta já validada.
 * A separação mantém o bootstrap testável sem abrir conexões HTTP nos testes.
 */
export function configureApplication(
  app: INestApplication,
  configService: ConfigService,
): number {
  app.use(helmet(helmetConfig));
  const corsOrigins = configService.getOrThrow<string>('CORS_ORIGINS');

  app.enableCors(createCorsConfig(corsOrigins));
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.setGlobalPrefix(configService.getOrThrow<string>('API_PREFIX'));
  app.enableShutdownHooks();

  return configService.getOrThrow<number>('PORT');
}

/**
 * Cria a aplicação NestJS e inicia o servidor com a configuração validada.
 */
export async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const port = configureApplication(app, configService);

  await app.listen(port);
}

if (require.main === module) {
  void bootstrap();
}
