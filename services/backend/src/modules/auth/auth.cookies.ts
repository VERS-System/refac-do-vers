// Emite e remove cookies de sessão com atributos consistentes no backend VERS.

import { CookieOptions, Response } from 'express';

const access = { httpOnly: true, sameSite: 'lax' as const, path: '/' };

/** Escopa o refresh ao prefixo efetivo da API. */
function refreshOptions(apiPrefix: string): CookieOptions {
  return { httpOnly: true, sameSite: 'lax' as const, path: `/${apiPrefix}/auth` };
}

/** Converte a duração JWT validada em milissegundos para o cookie. */
function durationMs(value: string): number {
  const match = /^(\d+)([smhd])$/.exec(value);
  if (!match) throw new Error('Duração JWT inválida');
  const duration = Number(match[1]) * { s: 1_000, m: 60_000, h: 3_600_000, d: 86_400_000 }[match[2] as 's' | 'm' | 'h' | 'd'];
  if (!Number.isSafeInteger(duration) || duration <= 0) throw new Error('Duração JWT inválida');
  return duration;
}

/** Emite os JWTs apenas em cookies, com escopo e duração próprios. */
export function setSessionCookies(response: Response, accessToken: string, refreshToken: string, secure: boolean, accessExpiration: string, refreshExpiration: string, apiPrefix: string): void {
  response.cookie('vers_access', accessToken, { ...access, secure, maxAge: durationMs(accessExpiration) });
  response.cookie('vers_refresh', refreshToken, { ...refreshOptions(apiPrefix), secure, maxAge: durationMs(refreshExpiration) });
}

/** Expira os mesmos cookies e paths usados na emissão. */
export function clearSessionCookies(response: Response, secure: boolean, apiPrefix: string): void {
  response.clearCookie('vers_access', { ...access, secure });
  response.clearCookie('vers_refresh', { ...refreshOptions(apiPrefix), secure });
}
