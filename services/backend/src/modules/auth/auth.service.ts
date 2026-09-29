// Cria contas, inicia sessões e rotaciona refresh tokens com detecção de replay.

import { HttpException, HttpStatus, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { createHash, randomUUID, timingSafeEqual } from 'crypto';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthResponse } from '../../../../../packages/shared-types/src/auth';
import { durationMs } from './auth.cookies';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { LoginAttemptsService } from './login-attempts.service';

const DUMMY_HASH = '$2b$12$JgDN2CSA0FYYGIxtI3dQOusmGIJZ/T8LFZeNUWCAqrEEzUPZm3H5S';

export type LoginResult = AuthResponse & { accessToken: string; refreshToken: string };
type RefreshClaims = { sub?: string; sid?: string; typ?: string };

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

  /** Rotaciona uma sessão válida uma única vez e revoga seus sucessores após replay. */
  async refresh(token: string | undefined): Promise<{ accessToken: string; refreshToken: string }> {
    if (!token) throw new UnauthorizedException();
    let claims: RefreshClaims;
    try {
      claims = await this.jwt.verifyAsync<RefreshClaims>(token, {
        secret: this.config.getOrThrow<string>('auth.refreshSecret'),
      });
    } catch {
      throw new UnauthorizedException();
    }
    if (claims.typ !== 'refresh' || !claims.sub || !claims.sid) throw new UnauthorizedException();
    const hash = createHash('sha256').update(token).digest('hex');
    const session = await this.prisma.refreshSession.findUnique({ where: { id: claims.sid } });
    if (!session || session.userId !== claims.sub ||
      !timingSafeEqual(Buffer.from(hash), Buffer.from(session.tokenHash)) ||
      session.expiresAt <= new Date()) throw new UnauthorizedException();
    if (session.revokedAt || session.replacedBySessionId) {
      await this.revokeChain(session.replacedBySessionId);
      throw new UnauthorizedException();
    }
    const user = await this.prisma.user.findUnique({ where: { id: claims.sub } });
    if (user?.status !== 'ACTIVE') throw new UnauthorizedException();

    const nextId = randomUUID();
    const refreshExpiration = this.config.getOrThrow<string>('auth.refreshExpiration');
    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync({ sub: user.id, sid: nextId, typ: 'access' }, {
        secret: this.config.getOrThrow<string>('auth.accessSecret'),
        expiresIn: this.config.getOrThrow<string>('auth.accessExpiration') as JwtSignOptions['expiresIn'],
      }),
      this.jwt.signAsync({ sub: user.id, sid: nextId, typ: 'refresh' }, {
        secret: this.config.getOrThrow<string>('auth.refreshSecret'),
        expiresIn: refreshExpiration as JwtSignOptions['expiresIn'],
      }),
    ]);
    const now = new Date();
    let lostRace = false;
    await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.refreshSession.updateMany({
        where: { id: session.id, tokenHash: hash, revokedAt: null, replacedBySessionId: null, expiresAt: { gt: now } },
        data: { revokedAt: now },
      });
      if (claimed.count !== 1) { lostRace = true; return; }
      await tx.refreshSession.create({ data: {
        id: nextId, userId: user.id,
        tokenHash: createHash('sha256').update(refreshToken).digest('hex'),
        expiresAt: new Date(now.getTime() + durationMs(refreshExpiration)),
      } });
      await tx.refreshSession.update({ where: { id: session.id }, data: { replacedBySessionId: nextId } });
    });
    if (lostRace) {
      const current = await this.prisma.refreshSession.findUnique({ where: { id: session.id } });
      await this.revokeChain(current?.replacedBySessionId);
      throw new UnauthorizedException();
    }
    return { accessToken, refreshToken };
  }

  /** Percorre somente a cadeia da sessão comprometida e invalida seus sucessores. */
  private async revokeChain(nextId: string | null | undefined): Promise<void> {
    const seen = new Set<string>();
    while (nextId && !seen.has(nextId)) {
      seen.add(nextId);
      const session = await this.prisma.refreshSession.findUnique({ where: { id: nextId } });
      if (!session) break;
      await this.prisma.refreshSession.updateMany({ where: { id: nextId, revokedAt: null }, data: { revokedAt: new Date() } });
      nextId = session.replacedBySessionId;
    }
  }
}
