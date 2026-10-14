// Disponibiliza a identidade mínima validada pelo guard para os controllers.

import { createParamDecorator, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthPrincipal } from '../../modules/auth/auth-principal';

/** Obtém o principal da requisição e impede uso acidental sem autenticação. */
export const CurrentUser = createParamDecorator((_data: unknown, context: ExecutionContext): AuthPrincipal => {
  const request = context.switchToHttp().getRequest<{ user?: AuthPrincipal }>();
  if (!request.user) throw new UnauthorizedException();
  return request.user;
});
