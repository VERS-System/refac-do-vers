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
import { AuditPolicyService } from './common/audit/audit-policy.service';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { CsrfGuard } from './modules/auth/csrf.guard';
import { UsersModule } from './modules/users/users.module';
import { VehiclesModule } from './modules/vehicles/vehicles.module';
import { InstallationsModule } from './modules/installations/installations.module';
import { TestsModule } from './modules/tests/tests.module';
import { SupportModule } from './modules/support/support.module';
import { DataModule } from './modules/data/data.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      ignoreEnvFile: true,
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
    HealthModule,
    AuthModule,
    UsersModule,
    VehiclesModule,
    InstallationsModule,
    TestsModule,
    SupportModule,
    DataModule,
  ],
  providers: [
    AuditPolicyService,
    { provide: APP_GUARD, useClass: CsrfGuard },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
