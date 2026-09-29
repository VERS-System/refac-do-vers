// Cria contas pendentes e inicia sessões apenas para contas ativas.

import { HttpException, HttpStatus, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { createHash, randomUUID } from 'crypto';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthResponse } from '../../../../../packages/shared-types/src/auth';
import { durationMs } from './auth.cookies';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { LoginAttemptsService } from './login-attempts.service';

const DUMMY_HASH = '$2b$12$JgDN2CSA0FYYGIxtI3dQOusmGIJZ/T8LFZeNUWCAqrEEzUPZm3H5S';

export type LoginResult = AuthResponse & { accessToken: string; refreshToken: string };

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly attempts: LoginAttemptsService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  /** Persiste hash e papel padrão numa operação atômica; duplicidade é indistinguível. */
  async register(input: RegisterDto): Promise<void> {
    const passwordHash = await bcrypt.hash(input.password, 12);
    try {
      await this.prisma.user.create({
        data: {
          email: input.email.trim().toLowerCase(),
          passwordHash,
          displayName: input.displayName,
          status: 'PENDING_VERIFICATION',
          roles: { create: { role: 'USER' } },
        },
      });
    } catch (error) {
      const conflict = error as { code?: string; meta?: { target?: string[] } };
      if (conflict.code === 'P2002' && conflict.meta?.target?.includes('email')) return;
      throw error;
    }
  }

  /** Autentica conta ativa, grava somente hash do refresh e devolve tokens ao controller. */
  async login(input: LoginDto): Promise<LoginResult> {
    const email = input.email.trim().toLowerCase();
    await this.attempts.assertAllowed(email);
    const user = await this.prisma.user.findUnique({ where: { email }, include: { roles: true } });
    const passwordMatches = await bcrypt.compare(input.password, user?.passwordHash ?? DUMMY_HASH);
    if (!user || !passwordMatches) {
      const lockMs = await this.attempts.recordFailure(email);
      if (lockMs) throw new HttpException('Limite de tentativas.', HttpStatus.TOO_MANY_REQUESTS);
      throw new UnauthorizedException({ code: 'AUTH_INVALID_CREDENTIALS' });
    }
    if (user.status !== 'ACTIVE') throw new UnauthorizedException({ code: 'AUTH_INVALID_CREDENTIALS' });

    const sessionId = randomUUID();
    const refreshExpiration = this.config.getOrThrow<string>('auth.refreshExpiration');
    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync({ sub: user.id, sid: sessionId, typ: 'access' }, {
        secret: this.config.getOrThrow<string>('auth.accessSecret'),
        expiresIn: this.config.getOrThrow<string>('auth.accessExpiration') as JwtSignOptions['expiresIn'],
      }),
      this.jwt.signAsync({ sub: user.id, sid: sessionId, typ: 'refresh' }, {
        secret: this.config.getOrThrow<string>('auth.refreshSecret'),
        expiresIn: refreshExpiration as JwtSignOptions['expiresIn'],
      }),
    ]);
    await this.prisma.refreshSession.create({
      data: {
        id: sessionId,
        userId: user.id,
        tokenHash: createHash('sha256').update(refreshToken).digest('hex'),
        expiresAt: new Date(Date.now() + durationMs(refreshExpiration)),
      },
    });
    await this.attempts.clear(email);
    return {
      accessToken, refreshToken,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        roles: user.roles.map(({ role }) => role),
        status: user.status,
        emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      },
    };
  }
}
