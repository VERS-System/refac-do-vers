// Servico de health checks com probe de dependencia testavel.

import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface HealthStatus {
  status: 'ok';
  service: 'backend';
  checkedAt: string;
  dependencies?: {
    database: 'ok';
  };
}

const READY_TIMEOUT_MS = 1_000;

/**
 * Aplica timeout em probes de dependencia para evitar travar readiness.
 * A mensagem interna nunca e propagada para a resposta publica.
 */
function withTimeout<TValue>(
  promise: Promise<TValue>,
  timeoutMs: number,
): Promise<TValue> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('health probe timeout'));
    }, timeoutMs);

    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error: unknown) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Retorna vida do processo sem consultar dependencias externas.
   */
  async live(): Promise<HealthStatus> {
    return {
      status: 'ok',
      service: 'backend',
      checkedAt: new Date().toISOString(),
    };
  }

  /**
   * Executa um probe curto no banco para sinalizar prontidao.
   * Redis nao e dependencia obrigatoria do REST nesta fase.
   */
  async ready(): Promise<HealthStatus> {
    try {
      await withTimeout(this.prisma.$queryRawUnsafe('SELECT 1'), READY_TIMEOUT_MS);

      return {
        status: 'ok',
        service: 'backend',
        checkedAt: new Date().toISOString(),
        dependencies: {
          database: 'ok',
        },
      };
    } catch {
      throw new ServiceUnavailableException({
        code: 'SERVICE_UNAVAILABLE',
        message: 'Servico temporariamente indisponivel.',
        details: [],
      });
    }
  }
}
