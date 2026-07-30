// main.ts — Ponto de entrada da aplicação NestJS
//
// Inicializa o servidor HTTP com configurações globais:
// - CORS para os frontends
// - Helmet para segurança básica
// - ValidationPipe global para validação de DTOs
// - Config de ambiente

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { corsConfig } from './config/cors.config';
import { helmetConfig } from './config/security.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Segurança
  app.use(helmet(helmetConfig));

  // CORS
  app.enableCors(corsConfig);

  // Validação global de DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,          // remove campos não decorados
      forbidNonWhitelisted: true, // erro se campo extra for enviado
      transform: true,          // converte tipos automaticamente
    }),
  );

  const port = process.env.PORT || 3000;
  await app.listen(port);
}
bootstrap();
