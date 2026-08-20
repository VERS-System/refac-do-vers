// AppModule — módulo raiz da aplicação
//
// Importa apenas módulos de infraestrutura global: ConfigModule
// (variáveis de ambiente) e PrismaModule (banco de dados).
// Módulos de negócio devem ser registrados conforme forem criados.

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { authConfig } from './config/auth.config';
import { envValidationSchema } from './config/env.config';
import { createRateLimitConfig } from './config/rate-limit.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: '.env',
      load: [authConfig],
      validationSchema: envValidationSchema,
      validationOptions: {
        abortEarly: false,
      },
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        createRateLimitConfig(
          configService.getOrThrow<number>('RATE_LIMIT_TTL_SECONDS'),
          configService.getOrThrow<number>('RATE_LIMIT_MAX_REQUESTS'),
        ),
    }),
    PrismaModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
