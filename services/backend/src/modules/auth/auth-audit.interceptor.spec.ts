// Verifica eventos mínimos e preservação do resultado de auth quando auditoria falha.
import { ExecutionContext, Logger, UnauthorizedException } from '@nestjs/common';
import { lastValueFrom, of, throwError } from 'rxjs';
import { AuditWriterService } from '../../common/audit/audit-writer.service';
import { AuthAuditInterceptor } from './auth-audit.interceptor';

/** Cria contexto HTTP sintético com dados sensíveis que não podem ser auditados. */
function context(handler: string): ExecutionContext {
  const method = Object.defineProperty(() => undefined, 'name', { value: handler });
  return {
    getHandler: () => method,
    switchToHttp: () => ({ getRequest: (): object => ({ requestId: 'request-auth', body: { email: 'secret@example.com', password: 'secret-password' }, headers: { cookie: 'vers_refresh=secret-token' } }) }),
  } as unknown as ExecutionContext;
}

describe('AuthAuditInterceptor', () => {
  const persist = jest.fn();
  const writer = { persist } as unknown as AuditWriterService;

  beforeEach(() => persist.mockReset().mockResolvedValue(undefined));
  afterEach(() => jest.restoreAllMocks());

  it.each([
    ['register', 'auth.register', 'user'],
    ['login', 'auth.login', 'session'],
    ['refresh', 'auth.refresh', 'session'],
    ['logout', 'auth.logout', 'session'],
    ['logoutAll', 'auth.logout-all', 'session'],
  ])('audita sucesso em %s sem copiar entrada ou saída', async (handler, action, resourceType) => {
    const result = { token: 'secret-output' };
    await expect(lastValueFrom(new AuthAuditInterceptor(writer).intercept(context(handler), { handle: () => of(result) }))).resolves.toBe(result);
    expect(persist).toHaveBeenCalledTimes(1);
    expect(persist).toHaveBeenCalledWith({ action, resourceType, result: 'SUCCESS', requestId: 'request-auth' });
    expect(JSON.stringify(persist.mock.calls)).not.toContain('secret');
  });

  it('preserva a exceção original e registra FAILURE', async () => {
    const original = new UnauthorizedException({ code: 'AUTH_INVALID_CREDENTIALS' });
    await expect(lastValueFrom(new AuthAuditInterceptor(writer).intercept(context('login'), { handle: () => throwError(() => original) }))).rejects.toBe(original);
    expect(persist).toHaveBeenCalledWith({ action: 'auth.login', resourceType: 'session', result: 'FAILURE', requestId: 'request-auth' });
  });

  it.each(['login', 'logout', 'logoutAll'])('mantém sucesso de %s quando o banco de auditoria falha', async (handler) => {
    persist.mockRejectedValue(new Error('postgresql://secret-password'));
    const log = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    await expect(lastValueFrom(new AuthAuditInterceptor(writer).intercept(context(handler), { handle: () => of(undefined) }))).resolves.toBeUndefined();
    expect(log).toHaveBeenCalledWith({ event: 'audit_persistence_failed', action: handler === 'logoutAll' ? 'auth.logout-all' : `auth.${handler}`, requestId: 'request-auth' });
    expect(JSON.stringify(log.mock.calls)).not.toContain('secret');
  });

  it('mantém a falha original quando auditoria também falha', async () => {
    persist.mockRejectedValue(new Error('secret-storage-error'));
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    const original = new Error('secret-domain-error');
    await expect(lastValueFrom(new AuthAuditInterceptor(writer).intercept(context('refresh'), { handle: () => throwError(() => original) }))).rejects.toBe(original);
    expect(persist).toHaveBeenCalledTimes(1);
  });

  it('não audita emissão CSRF', async () => {
    await lastValueFrom(new AuthAuditInterceptor(writer).intercept(context('csrf'), { handle: () => of({ csrfToken: 'secret-csrf' }) }));
    expect(persist).not.toHaveBeenCalled();
  });
});
