// Verifica papéis globais atuais após a autenticação, sem conceder acesso a objetos.

import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { AuthPrincipal } from '../../modules/auth/auth-principal';
import { PUBLIC_ROUTE } from '../decorators/public.decorator';
import { REQUIRED_ROLES } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  /** Injeta os metadados que definem os papéis aceitos pela rota. */
  constructor(private readonly reflector: Reflector) {}

  /** Aceita ao menos um papel declarado e recusa identidade ausente ou insuficiente. */
  canActivate(context: ExecutionContext): boolean {
    const targets = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(PUBLIC_ROUTE, targets)) return true;
    const user = context.switchToHttp().getRequest<{ user?: AuthPrincipal }>().user;
    if (!user) throw new UnauthorizedException();
    const roles = this.reflector.getAllAndOverride<UserRole[]>(REQUIRED_ROLES, targets);
    if (roles?.length && !roles.some((role) => user.roles.includes(role))) {
      throw new ForbiddenException({ code: 'AUTH_UNAUTHORIZED' });
    }
    return true;
  }
}
