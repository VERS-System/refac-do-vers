// AppModule — módulo raiz da aplicação
//
// Importa apenas módulos de infraestrutura global: ConfigModule
// (variáveis de ambiente) e PrismaModule (banco de dados).
// Módulos de negócio devem ser registrados conforme forem criados.

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { envValidationSchema } from './config/env.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validationSchema: envValidationSchema,
    }),
    PrismaModule,
  ],
})
export class AppModule {}
