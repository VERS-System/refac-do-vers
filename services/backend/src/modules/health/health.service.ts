// Servico de health checks com probe de dependencia testavel.

import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { PrismaService } from '../../prisma/prisma.service';
import { MqttService } from '../mqtt/mqtt.service';

export interface HealthStatus {
  status: 'ok';
  service: 'backend';
  checkedAt: string;
  dependencies?: {
    database: 'ok';
    redis: 'ok';
    mqtt: 'disabled' | 'unavailable' | 'ok';
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
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly mqtt: MqttService,
  ) {}

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
   * Consulta Redis sem manter conexão entre probes.
   * ponytail: uma conexão por readiness; reutilizar se a frequência de probes exigir.
   */
  private async probeRedis(): Promise<void> {
    const redis = new Redis({
      host: this.configService.getOrThrow<string>('REDIS_HOST'),
      port: this.configService.getOrThrow<number>('REDIS_PORT'),
      lazyConnect: true,
      connectTimeout: READY_TIMEOUT_MS,
      retryStrategy: (): null => null,
    });

    try {
      await withTimeout(redis.ping(), READY_TIMEOUT_MS);
    } finally {
      redis.disconnect();
    }
  }

  /**
   * Executa probes curtos no banco e Redis para sinalizar prontidao.
   * Falha de qualquer dependencia devolve 503 sem detalhe interno.
   */
  async ready(): Promise<HealthStatus> {
    try {
      await Promise.all([
        withTimeout(this.prisma.$queryRawUnsafe('SELECT 1'), READY_TIMEOUT_MS),
        this.probeRedis(),
      ]);

      return {
        status: 'ok',
        service: 'backend',
        checkedAt: new Date().toISOString(),
        dependencies: {
          database: 'ok',
          redis: 'ok',
          mqtt: this.mqtt.status,
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
