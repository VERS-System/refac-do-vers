// Verifica rejeição previsível de tokens CSRF malformados sem falhas internas.
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CsrfGuard } from './csrf.guard';

describe('CsrfGuard', () => {
  it.each(['é'.repeat(64), 'g'.repeat(64), 'a'.repeat(63)])('rejeita token malformado com 403: %s', (token) => {
    const config = new ConfigService({ CORS_ORIGINS: 'http://localhost:3001', JWT_REFRESH_SECRET: 'segredo-sintetico' });
    const headers: Record<string, string> = { origin: 'http://localhost:3001', cookie: `vers_csrf=${'a'.repeat(64)}`, 'x-csrf-token': token };
    const context = { switchToHttp: () => ({ getRequest: (): object => ({ method: 'POST', header: (name: string): string => headers[name] }) }) } as unknown as ExecutionContext;
    expect(() => new CsrfGuard(config).canActivate(context)).toThrow(ForbiddenException);
  });
});
