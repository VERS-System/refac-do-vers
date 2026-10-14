// PrismaService
//
// Serviço que expõe o PrismaClient para toda a aplicação.
// Mantém a conexão sob demanda para permitir liveness sem banco.

import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  private isDisconnected = false;

  /**
   * Fecha o Prisma uma vez e permite repetir se o fechamento falhar.
   * A chamada cobre conexões abertas sob demanda por consultas.
   */
  async onModuleDestroy(): Promise<void> {
    if (this.isDisconnected) {
      return;
    }

    await this.$disconnect();
    this.isDisconnected = true;
  }
}
