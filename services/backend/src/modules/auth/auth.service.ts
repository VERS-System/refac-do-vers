// Cria contas, inicia, renova e encerra sessões com revogação persistente.

import { HttpException, HttpStatus, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { createHash, randomUUID, timingSafeEqual } from 'crypto';
import * as bcrypt from 'bcrypt';
import { Prisma, RefreshSession } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthResponse } from '../../../../../packages/shared-types/src/auth';
import { durationMs } from './auth.cookies';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { LoginAttemptsService } from './login-attempts.service';
import { isUUID } from 'class-validator';
import { AuthPrincipal } from './auth-principal';

const DUMMY_HASH = '$2b$12$JgDN2CSA0FYYGIxtI3dQOusmGIJZ/T8LFZeNUWCAqrEEzUPZm3H5S';

export type LoginResult = AuthResponse & { accessToken: string; refreshToken: string };
type SessionClaims = { sub?: string; sid?: string; typ?: string };

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly attempts: LoginAttemptsService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  /** Valida claims já assinadas e consulta sessão/conta para revogar acesso imediatamente. */
  async validateAccessClaims(payload: unknown): Promise<AuthPrincipal> {
    if (!payload || typeof payload !== 'object') throw new UnauthorizedException();
    const claims = payload as { sub?: unknown; sid?: unknown; typ?: unknown; exp?: unknown };
    if (claims.typ !== 'access' || typeof claims.sub !== 'string' || !isUUID(claims.sub) ||
      typeof claims.sid !== 'string' || !isUUID(claims.sid) ||
      typeof claims.exp !== 'number' || !Number.isFinite(claims.exp) || claims.exp <= Date.now() / 1000) {
      throw new UnauthorizedException();
    }
    const session = await this.prisma.refreshSession.findUnique({ where: { id: claims.sid } });
    if (!session || session.userId !== claims.sub || session.revokedAt || session.replacedBySessionId ||
      session.expiresAt <= new Date()) throw new UnauthorizedException();
    const user = await this.prisma.user.findUnique({
      where: { id: claims.sub }, select: { id: true, status: true, roles: { select: { role: true } } },
    });
    if (!user || user.status !== 'ACTIVE') throw new UnauthorizedException();
    return { id: user.id, sessionId: session.id, roles: user.roles.map(({ role }) => role) };
  }

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
    const session = await this.validateSession(token, 'refresh');
    const hash = session.tokenHash;
    if (session.revokedAt || session.replacedBySessionId) {
      await this.revokeChain(session.replacedBySessionId);
      throw new UnauthorizedException();
    }
    const user = await this.prisma.user.findUnique({ where: { id: session.userId } });
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

  /** Valida JWT e vínculo persistido para impedir revogação de uma sessão alheia. */
  private async validateSession(token: string | undefined, type: 'access' | 'refresh'): Promise<RefreshSession> {
    if (!token) throw new UnauthorizedException();
    let claims: SessionClaims;
    try {
      claims = await this.jwt.verifyAsync<SessionClaims>(token, {
        secret: this.config.getOrThrow<string>(`auth.${type}Secret`), algorithms: ['HS256'],
      });
    } catch {
      throw new UnauthorizedException();
    }
    if (!claims || claims.typ !== type || typeof claims.sub !== 'string' || !claims.sub ||
      typeof claims.sid !== 'string' || !claims.sid) throw new UnauthorizedException();
    const session = await this.prisma.refreshSession.findUnique({ where: { id: claims.sid } });
    if (!session || session.userId !== claims.sub || session.expiresAt <= new Date()) throw new UnauthorizedException();
    if (type === 'refresh') {
      const hash = createHash('sha256').update(token).digest('hex');
      if (!/^[a-f0-9]{64}$/.test(session.tokenHash) ||
        !timingSafeEqual(Buffer.from(hash), Buffer.from(session.tokenHash))) throw new UnauthorizedException();
    }
    return session;
  }

  /** Revoga a sessão e seus sucessores na transação; repetir um logout válido é seguro. */
  async logout(token: string | undefined): Promise<void> {
    const session = await this.validateSession(token, 'refresh');
    await this.prisma.$transaction(async (tx) => {
      await tx.refreshSession.updateMany({
        where: { id: session.id, userId: session.userId, tokenHash: session.tokenHash },
        data: { revokedAt: new Date() },
      });
      const current = await tx.refreshSession.findUnique({ where: { id: session.id } });
      await this.revokeChain(current?.replacedBySessionId, tx);
    });
  }

  /** Encerra todas as sessões da conta ativa identificada pelo access cookie validado. */
  async logoutAll(token: string | undefined): Promise<void> {
    const session = await this.validateSession(token, 'access');
    if (session.revokedAt || session.replacedBySessionId) throw new UnauthorizedException();
    const user = await this.prisma.user.findUnique({ where: { id: session.userId } });
    if (user?.status !== 'ACTIVE') throw new UnauthorizedException();
    await this.prisma.$transaction(async (tx) => {
      const sessions = await tx.refreshSession.findMany({ where: { userId: session.userId }, select: { id: true } });
      for (const current of sessions) await this.revokeChain(current.id, tx);
    });
  }

  /** Percorre somente a cadeia da sessão comprometida e invalida seus sucessores. */
  private async revokeChain(nextId: string | null | undefined, db: Prisma.TransactionClient = this.prisma): Promise<void> {
    const seen = new Set<string>();
    while (nextId && !seen.has(nextId)) {
      seen.add(nextId);
      const updated = await db.refreshSession.updateMany({ where: { id: nextId }, data: { revokedAt: new Date() } });
      if (updated.count !== 1) break;
      const current = await db.refreshSession.findUnique({ where: { id: nextId } });
      nextId = current?.replacedBySessionId;
    }
  }
}
