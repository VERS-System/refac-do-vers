// PrismaModule
//
// Módulo global que disponibiliza PrismaService para todos os
// módulos da aplicação sem necessidade de importação manual.

import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
