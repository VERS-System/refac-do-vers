// Guarda no Redis a progressão de tentativas de login sem registrar emails em claro.

import { HttpException, HttpStatus, Injectable, OnModuleDestroy, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';
import Redis from 'ioredis';

@Injectable()
export class LoginAttemptsService implements OnModuleDestroy {
  private readonly redis: Redis;

  constructor(private readonly config: ConfigService) {
    this.redis = new Redis({
      host: config.getOrThrow<string>('REDIS_HOST'),
      port: config.getOrThrow<number>('REDIS_PORT'),
      lazyConnect: true,
      connectTimeout: 1_000,
      retryStrategy: (): null => null,
    });
  }

  /** Deriva uma chave opaca estável por email e tipo de registro. */
  private key(email: string, kind: 'count' | 'lock'): string {
    const digest = createHmac('sha256', this.config.getOrThrow<string>('JWT_ACCESS_SECRET'))
      .update(email).digest('hex');
    return `auth:login:${digest}:${kind}`;
  }

  /** Recusa novas tentativas durante o prazo de espera; falha fechada sem Redis. */
  async assertAllowed(email: string): Promise<void> {
    let remaining: number;
    try {
      remaining = await this.redis.pttl(this.key(email, 'lock'));
    } catch {
      throw new ServiceUnavailableException();
    }
    if (remaining > 0) throw new HttpException('Limite de tentativas.', HttpStatus.TOO_MANY_REQUESTS);
  }

  /** Conta erro atomicamente e inicia as três esperas aprovadas. */
  async recordFailure(email: string): Promise<number> {
    try {
      const countKey = this.key(email, 'count');
      const count = await this.redis.incr(countKey);
      await this.redis.expire(countKey, count >= 14 ? 86_400 : 172_800);
      const lockMs = count >= 14 ? 86_400_000 : count === 12 ? 3_600_000 : count === 8 ? 900_000 : 0;
      if (lockMs) await this.redis.set(this.key(email, 'lock'), '1', 'PX', lockMs);
      return lockMs;
    } catch {
      throw new ServiceUnavailableException();
    }
  }

  /** Zera tentativas quando o login ativo foi concluído com sucesso. */
  async clear(email: string): Promise<void> {
    try {
      await this.redis.del(this.key(email, 'count'), this.key(email, 'lock'));
    } catch {
      throw new ServiceUnavailableException();
    }
  }

  /** Fecha a conexão local quando o módulo é desligado. */
  async onModuleDestroy(): Promise<void> {
    this.redis.disconnect();
  }
}
