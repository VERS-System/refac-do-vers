// Valida access JWT HS256 extraído exclusivamente de um cookie único.

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { Strategy } from 'passport-jwt';
import { AuthService } from '../../modules/auth/auth.service';
import { AuthPrincipal } from '../../modules/auth/auth-principal';
import { readCookie } from '../../modules/auth/auth.cookies';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  /** Configura algoritmo, segredo e extração de cookie sem aceitar bearer/query. */
  constructor(config: ConfigService, private readonly auth: AuthService) {
    super({
      jwtFromRequest: (request: Request): string | null => readCookie(request.headers.cookie, 'vers_access') ?? null,
      secretOrKey: config.getOrThrow<string>('auth.accessSecret'),
      algorithms: ['HS256'],
      ignoreExpiration: false,
    });
  }

  /** Confere sessão e conta no banco após o Passport validar assinatura e prazo. */
  async validate(claims: unknown): Promise<AuthPrincipal> {
    return this.auth.validateAccessClaims(claims);
  }
}
