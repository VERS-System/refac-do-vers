// Testes dos logs estruturados sem dados sensiveis.

import { of } from 'rxjs';
import { lastValueFrom } from 'rxjs';
import { Observable } from 'rxjs';
import { LoggingInterceptor } from './logging.interceptor';

describe('LoggingInterceptor', () => {
  it('registra metodo, rota, status e requestId sem corpo nem headers sensiveis', async () => {
    const logger = { log: jest.fn(), error: jest.fn() };
    const interceptor = new LoggingInterceptor(logger);
    const context = {
      switchToHttp: (): {
        getRequest: () => {
          method: string;
          route: { path: string };
          originalUrl: string;
          requestId: string;
          body: { password: string };
          headers: { authorization: string };
        };
        getResponse: () => { statusCode: number };
      } => ({
        getRequest: (): {
          method: string;
          route: { path: string };
          originalUrl: string;
          requestId: string;
          body: { password: string };
          headers: { authorization: string };
        } => ({
          method: 'POST',
          route: { path: '/auth/login' },
          originalUrl: '/api/v1/auth/login?email=ana@example.com',
          requestId: 'request-log',
          body: { password: 'Senha@123' },
          headers: { authorization: 'Bearer segredo' },
        }),
        getResponse: (): { statusCode: number } => ({ statusCode: 201 }),
      }),
    };

    await lastValueFrom(
      interceptor.intercept(context as never, {
        handle: (): Observable<{ ok: boolean }> => of({ ok: true }),
      }),
    );

    const payload = JSON.stringify(logger.log.mock.calls[0][0]);
    expect(payload).toContain('request-log');
    expect(payload).toContain('/auth/login');
    expect(payload).not.toContain('Senha@123');
    expect(payload).not.toContain('ana@example.com');
    expect(payload).not.toContain('Bearer segredo');
  });
});
