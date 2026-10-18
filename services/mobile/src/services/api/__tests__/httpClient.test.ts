/**
 * Garante o httpClient da integração: envelopes, Origin fixo, cookies,
 * CSRF nas mutações e refresh automático em 401 com uma única nova tentativa.
 */

import { createCookieJar } from '../cookieJar';
import { ApiError, createHttpClient } from '../httpClient';

/** Data fixa para o jar nos testes. */
const NOW = Date.parse('2026-10-17T12:00:00.000Z');

type FetchCall = {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
};

/** Cria uma resposta fake no formato do fetch, com envelope da API. */
function makeResponse(
  status: number,
  payload: unknown,
  setCookies: string[] = [],
): Response {
  const headers = new Headers();
  headers.set('content-type', 'application/json');
  for (const cookie of setCookies) {
    headers.append('set-cookie', cookie);
  }
  return {
    ok: status >= 200 && status < 300,
    status,
    headers,
    json: async () => payload,
    text: async () => JSON.stringify(payload),
  } as unknown as Response;
}

/** Monta um fetch mockado que responde na ordem das chamadas. */
function makeFetch(responses: Array<Response | ((call: FetchCall) => Response)>) {
  const calls: FetchCall[] = [];
  const impl = jest.fn(async (url: string, init: RequestInit) => {
    const call: FetchCall = {
      url: String(url),
      method: String(init.method ?? 'GET'),
      headers: { ...(init.headers as Record<string, string>) },
      body: typeof init.body === 'string' ? init.body : undefined,
    };
    calls.push(call);
    const next = responses.shift();
    if (!next) throw new Error(`chamada inesperada: ${call.method} ${call.url}`);
    return typeof next === 'function' ? next(call) : next;
  });
  return { impl: impl as unknown as typeof fetch, calls };
}

/** Jar semeado com a tripla de cookies de sessão para mutações. */
function seededJar() {
  const jar = createCookieJar(undefined, () => NOW);
  jar.absorbSetCookie([
    'vers_access=access-1; Path=/',
    'vers_refresh=refresh-1; Path=/api/v1/auth',
    'vers_csrf=nonce-1; Path=/',
  ]);
  return jar;
}

describe('httpClient (Integração Frente 1 - Lote 1)', () => {
  it('monta URL com base + caminho e envia Origin fixo', async () => {
    const { impl, calls } = makeFetch([
      makeResponse(200, { data: { id: 'u1' }, requestId: 'r1' }),
    ]);
    const client = createHttpClient({
      baseUrl: 'http://localhost:3000/api/v1',
      jar: createCookieJar(undefined, () => NOW),
      fetchImpl: impl,
    });

    const data = await client.request<{ id: string }>('GET', '/users/me');

    expect(data).toEqual({ id: 'u1' });
    expect(calls[0].url).toBe('http://localhost:3000/api/v1/users/me');
    expect(calls[0].headers.Origin).toBe('http://localhost:8081');
  });

  it('envia Cookie do jar nas requisições', async () => {
    const jar = seededJar();
    const { impl, calls } = makeFetch([
      makeResponse(200, { data: { ok: true }, requestId: 'r1' }),
    ]);
    const client = createHttpClient({
      baseUrl: 'http://x/api/v1',
      jar,
      fetchImpl: impl,
    });

    await client.request('GET', '/users/me');

    expect(calls[0].headers.Cookie).toBe(
      'vers_access=access-1; vers_refresh=refresh-1; vers_csrf=nonce-1',
    );
  });

  it('envia X-CSRF-Token e Content-Type nas mutações com token', async () => {
    const { impl, calls } = makeFetch([
      makeResponse(200, { data: { ok: true }, requestId: 'r1' }),
    ]);
    const client = createHttpClient({
      baseUrl: 'http://x/api/v1',
      jar: seededJar(),
      fetchImpl: impl,
    });
    client.setCsrfToken('token-abc');

    await client.request('POST', '/vehicles', {
      body: { licensePlate: 'ABC1D23' },
    });

    expect(calls[0].headers['X-CSRF-Token']).toBe('token-abc');
    expect(calls[0].headers['Content-Type']).toBe('application/json');
    expect(calls[0].body).toBe('{"licensePlate":"ABC1D23"}');
  });

  it('absorve Set-Cookie das respostas para o jar', async () => {
    const jar = createCookieJar(undefined, () => NOW);
    const { impl } = makeFetch([
      makeResponse(200, { data: {}, requestId: 'r1' }, [
        'vers_access=novo; Path=/',
      ]),
    ]);
    const client = createHttpClient({ baseUrl: 'http://x/api/v1', jar, fetchImpl: impl });

    await client.request('GET', '/auth/csrf');

    expect(jar.getHeader()).toBe('vers_access=novo');
  });

  it('lança ApiError com código e status no envelope de erro', async () => {
    const { impl } = makeFetch([
      makeResponse(422, {
        error: { code: 'VALIDATION_ERROR', message: 'Inválido.', details: [] },
        requestId: 'r9',
        timestamp: '2026-10-17T12:00:00.000Z',
      }),
    ]);
    const client = createHttpClient({
      baseUrl: 'http://x/api/v1',
      jar: createCookieJar(),
      fetchImpl: impl,
    });

    const rejection = await client
      .request('POST', '/auth/login', { body: {} })
      .catch((e) => e as ApiError);
    expect(rejection).toBeInstanceOf(ApiError);
    expect(rejection).toMatchObject({ code: 'VALIDATION_ERROR', status: 422, message: 'Inválido.' });
  });

  it('retorna undefined em 204 sem corpo', async () => {
    const { impl } = makeFetch([
      { ok: true, status: 204, headers: new Headers(), json: async () => {
        throw new Error('sem corpo');
      }, text: async () => '' } as unknown as Response,
    ]);
    const client = createHttpClient({
      baseUrl: 'http://x/api/v1',
      jar: createCookieJar(),
      fetchImpl: impl,
    });

    await expect(client.request('POST', '/auth/logout')).resolves.toBeUndefined();
  });

  it('em 401 renova via refresh, reemite csrf e repete a chamada uma vez', async () => {
    const jar = seededJar();
    const unauthorized = () =>
      makeResponse(401, {
        error: { code: 'AUTH_UNAUTHORIZED', message: 'Não autorizado.', details: [] },
        requestId: 'r1',
        timestamp: '2026-10-17T12:00:00.000Z',
      });
    const { impl, calls } = makeFetch([
      unauthorized(),
      makeResponse(204, null, [
        'vers_access=access-2; Path=/',
        'vers_refresh=refresh-2; Path=/api/v1/auth',
      ]),
      makeResponse(200, { data: { csrfToken: 'nonce-2' }, requestId: 'r2' }, [
        'vers_csrf=nonce-2; Path=/',
      ]),
      makeResponse(200, { data: { id: 'u1' }, requestId: 'r3' }),
    ]);
    const client = createHttpClient({ baseUrl: 'http://x/api/v1', jar, fetchImpl: impl });

    const data = await client.request<{ id: string }>('GET', '/users/me');

    expect(data).toEqual({ id: 'u1' });
    expect(calls.map((call) => `${call.method} ${call.url}`)).toEqual([
      'GET http://x/api/v1/users/me',
      'POST http://x/api/v1/auth/refresh',
      'GET http://x/api/v1/auth/csrf',
      'GET http://x/api/v1/users/me',
    ]);
    expect(jar.has('vers_access')).toBe(true);
  });

  it('limpa a sessão e propaga AUTH_UNAUTHORIZED quando o refresh falha', async () => {
    const jar = seededJar();
    const unauthorized = () =>
      makeResponse(401, {
        error: { code: 'AUTH_UNAUTHORIZED', message: 'Não autorizado.', details: [] },
        requestId: 'r1',
        timestamp: '2026-10-17T12:00:00.000Z',
      });
    const { impl, calls } = makeFetch([unauthorized(), unauthorized()]);
    const client = createHttpClient({ baseUrl: 'http://x/api/v1', jar, fetchImpl: impl });

    await expect(client.request('GET', '/users/me')).rejects.toMatchObject({
      code: 'AUTH_UNAUTHORIZED',
      status: 401,
    });
    expect(calls).toHaveLength(2);
    expect(jar.getHeader()).toBeNull();
    expect(client.getCsrfToken()).toBeNull();
  });

  it('nao tenta refresh em 401 sem cookie de refresh (login inválido)', async () => {
    const { impl, calls } = makeFetch([
      makeResponse(401, {
        error: { code: 'AUTH_INVALID_CREDENTIALS', message: 'Genérico.', details: [] },
        requestId: 'r1',
        timestamp: '2026-10-17T12:00:00.000Z',
      }),
    ]);
    const client = createHttpClient({
      baseUrl: 'http://x/api/v1',
      jar: createCookieJar(undefined, () => NOW),
      fetchImpl: impl,
    });

    await expect(
      client.request('POST', '/auth/login', { body: {} }),
    ).rejects.toMatchObject({ code: 'AUTH_INVALID_CREDENTIALS' });
    expect(calls).toHaveLength(1);
  });

  it('limpa csrfToken via setCsrfToken(null)', async () => {
    const { impl, calls } = makeFetch([
      makeResponse(200, { data: {}, requestId: 'r1' }),
    ]);
    const client = createHttpClient({
      baseUrl: 'http://x/api/v1',
      jar: createCookieJar(),
      fetchImpl: impl,
    });
    client.setCsrfToken('token-abc');
    client.setCsrfToken(null);

    await client.request('POST', '/vehicles', { body: {} });

    expect(calls[0].headers['X-CSRF-Token']).toBeUndefined();
  });
});
