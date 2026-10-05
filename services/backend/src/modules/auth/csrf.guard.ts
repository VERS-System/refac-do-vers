// Valida origem e vínculo do token CSRF em toda mutação HTTP do backend VERS.

import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';
import { Request } from 'express';
import { readCookie } from './auth.cookies';

/** Vincula o token CSRF à sessão quando há cookie de autenticação. */
export function csrfToken(nonce: string, sessionToken: string | null, secret: string): string {
  return sessionToken
    ? createHmac('sha256', secret).update('csrf:').update(nonce).update(':').update(sessionToken).digest('hex')
    : nonce;
}

@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  /** Permite leituras e exige origem aprovada e token vinculado nas mutações. */
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) return true;

    const origins = this.config.getOrThrow<string>('CORS_ORIGINS').split(',').map((origin) => origin.trim());
    const origin = request.header('origin');
    const token = request.header('x-csrf-token');
    const cookieToken = readCookie(request.header('cookie'), 'vers_csrf');
    const accessToken = readCookie(request.header('cookie'), 'vers_access');
    const refreshToken = readCookie(request.header('cookie'), 'vers_refresh');
    if (cookieToken === null || accessToken === null || refreshToken === null) {
      throw new ForbiddenException('Solicitação não autorizada.');
    }
    const sessionToken = accessToken ?? refreshToken ?? null;
    const expected = cookieToken && /^[a-f0-9]{64}$/.test(cookieToken)
      ? csrfToken(cookieToken, sessionToken, this.config.getOrThrow<string>('JWT_REFRESH_SECRET'))
      : null;

    if (!origin || !origins.includes(origin) || !token || !expected ||
      !/^[a-f0-9]{64}$/.test(token) ||
      !timingSafeEqual(Buffer.from(token), Buffer.from(expected))) {
      throw new ForbiddenException('Solicitação não autorizada.');
    }
    return true;
  }
}
