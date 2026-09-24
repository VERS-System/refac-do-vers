// Testes do envelope publico de respostas REST.

import { of } from 'rxjs';
import { lastValueFrom } from 'rxjs';
import { Observable } from 'rxjs';
import { ResponseEnvelopeInterceptor } from './response-envelope.interceptor';

describe('ResponseEnvelopeInterceptor', () => {
  it('embrulha sucesso com data e requestId', async () => {
    const interceptor = new ResponseEnvelopeInterceptor();
    const context = {
      switchToHttp: (): { getRequest: () => { requestId: string } } => ({
        getRequest: (): { requestId: string } => ({ requestId: 'request-123' }),
      }),
    };
    const handler = {
      handle: (): Observable<{ ok: boolean }> => of({ ok: true }),
    };

    await expect(
      lastValueFrom(interceptor.intercept(context as never, handler)),
    ).resolves.toEqual({
      data: { ok: true },
      requestId: 'request-123',
    });
  });

  it('nao embrulha novamente respostas ja publicas', async () => {
    const interceptor = new ResponseEnvelopeInterceptor();
    const response = { data: [], meta: { page: 1 }, requestId: 'request-123' };
    const context = {
      switchToHttp: (): { getRequest: () => { requestId: string } } => ({
        getRequest: (): { requestId: string } => ({ requestId: 'request-123' }),
      }),
    };

    await expect(
      lastValueFrom(
        interceptor.intercept(context as never, {
          handle: (): Observable<typeof response> => of(response),
        }),
      ),
    ).resolves.toBe(response);
  });
});
