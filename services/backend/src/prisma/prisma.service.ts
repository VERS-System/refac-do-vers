// PrismaService
//
// Serviço que expõe o PrismaClient para toda a aplicação.
// Conecta ao banco ao iniciar e desconecta ao encerrar.

import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private isConnected = false;

  /**
   * Abre uma única conexão quando o módulo inicia.
   * O estado só muda depois que o Prisma confirma a conexão.
   */
  async onModuleInit(): Promise<void> {
    if (this.isConnected) {
      return;
    }

    await this.$connect();
    this.isConnected = true;
  }

  /**
   * Encerra uma conexão ativa e permite nova tentativa se houver falha.
   * Chamadas sem conexão ou posteriores ao encerramento são ignoradas.
   */
  async onModuleDestroy(): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    await this.$disconnect();
    this.isConnected = false;
  }
}
