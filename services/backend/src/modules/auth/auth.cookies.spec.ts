// Verifica os atributos e a limpeza dos cookies de sessão do VERS.

import { Response } from 'express';
import { clearSessionCookies, setSessionCookies } from './auth.cookies';

describe('cookies de sessão', () => {
  it('restringe o refresh e limpa cookies com os mesmos paths', () => {
    const response = { cookie: jest.fn(), clearCookie: jest.fn() } as unknown as Response;
    setSessionCookies(response, 'access', 'refresh', true, '15m', '7d', 'api/v1');
    clearSessionCookies(response, true, 'api/v1');

    expect(response.cookie).toHaveBeenCalledWith('vers_access', 'access', expect.objectContaining({
      path: '/', httpOnly: true, secure: true, sameSite: 'lax', maxAge: 15 * 60_000,
    }));
    expect(response.cookie).toHaveBeenCalledWith('vers_refresh', 'refresh', expect.objectContaining({
      path: '/api/v1/auth', httpOnly: true, secure: true, sameSite: 'lax', maxAge: 7 * 24 * 60 * 60_000,
    }));
    expect(response.clearCookie).toHaveBeenCalledWith('vers_access', expect.objectContaining({ path: '/', secure: true }));
    expect(response.clearCookie).toHaveBeenCalledWith('vers_refresh', expect.objectContaining({ path: '/api/v1/auth', secure: true }));
  });

  it('alinha a duração dos cookies à configuração dos JWTs', () => {
    const response = { cookie: jest.fn(), clearCookie: jest.fn() } as unknown as Response;
    setSessionCookies(response, 'access', 'refresh', false, '20m', '8d', 'api/v2');
    expect(response.cookie).toHaveBeenCalledWith('vers_access', 'access', expect.objectContaining({ maxAge: 20 * 60_000 }));
    expect(response.cookie).toHaveBeenCalledWith('vers_refresh', 'refresh', expect.objectContaining({ maxAge: 8 * 24 * 60 * 60_000 }));
    expect(response.cookie).toHaveBeenCalledWith('vers_refresh', 'refresh', expect.objectContaining({ path: '/api/v2/auth' }));
  });
});
