// AppModule — módulo raiz da aplicação
//
// Importa apenas módulos de infraestrutura global: ConfigModule
// (variáveis de ambiente) e PrismaModule (banco de dados).
// Módulos de negócio devem ser registrados conforme forem criados.

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { authConfig } from './config/auth.config';
import { envValidationSchema } from './config/env.config';

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
    PrismaModule,
  ],
})
export class AppModule {}
