// Valida origem e vínculo do token CSRF em toda mutação HTTP do backend VERS.

import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'crypto';
import { Request } from 'express';

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
    const cookies = (request.header('cookie') ?? '').split(';').map((item) => item.trim());
    const matches = cookies.filter((item) => item.startsWith('vers_csrf='));
    const cookieToken = matches.length === 1 ? matches[0].slice('vers_csrf='.length) : '';

    if (!origin || !origins.includes(origin) || !token || !cookieToken ||
      token.length !== cookieToken.length ||
      !timingSafeEqual(Buffer.from(token), Buffer.from(cookieToken))) {
      throw new ForbiddenException('Solicitação não autorizada.');
    }
    return true;
  }
}
