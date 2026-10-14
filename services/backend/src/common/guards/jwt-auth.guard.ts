// Protege somente rotas explicitamente anotadas, usando a estratégia de cookie.

import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';
import { PUBLIC_ROUTE } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  /** Injeta os metadados para permitir exceções públicas no controlador. */
  constructor(private readonly reflector: Reflector) { super(); }

  /** Dispensa rotas públicas e delega assinatura e identidade ao Passport. */
  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    if (this.reflector.getAllAndOverride<boolean>(PUBLIC_ROUTE, [context.getHandler(), context.getClass()])) return true;
    return super.canActivate(context);
  }
}
