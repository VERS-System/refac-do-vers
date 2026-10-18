/**
 * Cliente HTTP nativo do app VERS.
 *
 * Encapsula o fetch com a convenção da API REST: base + /api/v1, header
 * Origin fixo aprovado no CORS_ORIGINS, cookies do jar, envelope de
 * sucesso/erro e refresh automático de sessão em 401 (uma nova tentativa
 * após renovar access/refresh e reemitir o CSRF).
 */

import type { CookieJar } from './cookieJar';

/** Origem fixa enviada nas mutações; já consta no CORS_ORIGINS do backend. */
export const MOBILE_ORIGIN = 'http://localhost:8081';

/** Métodos HTTP aceitos pela camada. */
export type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE' | 'PUT';

/** Erro tipado do envelope { error: { code, message, details } }. */
export class ApiError extends Error {
  /** Código público do contrato (ex.: AUTH_UNAUTHORIZED). */
  readonly code: string;
  /** Status HTTP da resposta. */
  readonly status: number;
  /** Detalhes de validação, quando enviados. */
  readonly details: unknown[];
  /** Identificador de correlação retornado pela API. */
  readonly requestId: string | null;

  constructor(code: string, status: number, message: string, details: unknown[] = [], requestId: string | null = null) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;
    this.requestId = requestId;
  }
}

/** Opções de criação do cliente HTTP. */
export type HttpClientOptions = {
  /** Base completa da API, ex.: http://localhost:3000/api/v1. */
  baseUrl: string;
  /** Jar de cookies compartilhado com a sessão. */
  jar: CookieJar;
  /** Implementação de fetch injetável para testes. */
  fetchImpl?: typeof fetch;
  /** Origem enviada nas requisições (padrão: MOBILE_ORIGIN). */
  origin?: string;
};

/** Opções por requisição. */
export type RequestOptions = {
  /** Corpo JSON; ausente significa requisição sem corpo. */
  body?: unknown;
  /** Evita o refresh automático (rotas de auth, onde 401 é esperado). */
  skipAuthRetry?: boolean;
};

/** Contrato do cliente usado pelas camadas de API e sessão. */
export type HttpClient = {
  /** Executa a requisição e devolve o `data` do envelope ou undefined (204). */
  request: <T>(method: HttpMethod, path: string, options?: RequestOptions) => Promise<T>;
  /** Define ou limpa o token CSRF corrente (emitido por GET /auth/csrf). */
  setCsrfToken: (token: string | null) => void;
  /** Devolve o token CSRF corrente, ou null. */
  getCsrfToken: () => string | null;
};

/** Extrai os Set-Cookie de uma resposta (getSetCookie quando disponível). */
function collectSetCookies(response: Response): string[] {
  const headers = response.headers as Headers & { getSetCookie?: () => string[] };
  if (typeof headers.getSetCookie === 'function') {
    const values = headers.getSetCookie();
    if (values.length > 0) return values;
  }
  const combined = headers.get('set-cookie');
  if (!combined) return [];
  // Vírgulas dentro de Expires não separam cookies: só divide antes de "nome=".
  return combined.split(/,(?=\s*[^;,\s]+=)/);
}

/** Lê o corpo da resposta; 204 e corpos inválidos viram undefined. */
async function readBody(response: Response): Promise<unknown> {
  if (response.status === 204) return undefined;
  try {
    return await response.json();
  } catch {
    return undefined;
  }
}

/** Converte o envelope de erro (ou um fallback) em ApiError. */
function toApiError(status: number, payload: unknown): ApiError {
  if (payload && typeof payload === 'object' && 'error' in payload) {
    const envelope = payload as {
      error?: { code?: string; message?: string; details?: unknown[] };
      requestId?: string;
    };
    const code = envelope.error?.code ?? 'INTERNAL_SERVER_ERROR';
    const message = envelope.error?.message ?? 'Não foi possível processar a solicitação.';
    return new ApiError(code, status, message, envelope.error?.details ?? [], envelope.requestId ?? null);
  }
  return new ApiError('INTERNAL_SERVER_ERROR', status, 'Não foi possível processar a solicitação.');
}

/** Cria o cliente HTTP com jar, Origin fixo e refresh em 401. */
export function createHttpClient(options: HttpClientOptions): HttpClient {
  const { baseUrl, jar, fetchImpl = fetch, origin = MOBILE_ORIGIN } = options;
  let csrfToken: string | null = null;

  /** Monta e envia uma requisição, absorvendo Set-Cookie no jar. */
  async function send(method: HttpMethod, path: string, body: unknown, withCsrf: boolean): Promise<Response> {
    const headers: Record<string, string> = { Origin: origin };
    const cookie = jar.getHeader();
    if (cookie) headers.Cookie = cookie;
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (withCsrf && csrfToken) headers['X-CSRF-Token'] = csrfToken;
    const response = await fetchImpl(`${baseUrl}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    jar.absorbSetCookie(collectSetCookies(response));
    return response;
  }

  /** Tenta renovar a sessão (refresh + novo CSRF); false se falhar. */
  async function refreshSession(): Promise<boolean> {
    const response = await send('POST', '/auth/refresh', undefined, true);
    if (!response.ok) return false;
    const renew = await send('GET', '/auth/csrf', undefined, false);
    if (!renew.ok) return false;
    const payload = (await readBody(renew)) as { data?: { csrfToken?: string } } | undefined;
    const token = payload?.data?.csrfToken;
    if (!token) return false;
    csrfToken = token;
    return true;
  }

  return {
    async request<T>(method: HttpMethod, path: string, requestOptions: RequestOptions = {}): Promise<T> {
      const { body, skipAuthRetry = false } = requestOptions;
      let response = await send(method, path, body, method !== 'GET');

      if (response.status === 401 && !skipAuthRetry && jar.has('vers_refresh')) {
        const error = toApiError(401, await readBody(response));
        if (error.code !== 'AUTH_UNAUTHORIZED') throw error;
        const refreshed = await refreshSession();
        if (!refreshed) {
          jar.clear();
          csrfToken = null;
          throw error;
        }
        response = await send(method, path, body, method !== 'GET');
      }

      if (!response.ok) {
        throw toApiError(response.status, await readBody(response));
      }
      const payload = await readBody(response);
      if (payload && typeof payload === 'object' && 'data' in payload) {
        return (payload as { data: T }).data;
      }
      return payload as T;
    },
    setCsrfToken(token) {
      csrfToken = token;
    },
    getCsrfToken() {
      return csrfToken;
    },
  };
}
