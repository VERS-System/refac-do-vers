/**
 * Garante o jar manual de cookies do cliente nativo: absorção de Set-Cookie,
 * header Cookie, expiração e snapshot/restore para a persistência segura.
 */

import { createCookieJar, parseSetCookie } from '../cookieJar';

/** Data fixa para controlar expiração nos testes. */
const NOW = Date.parse('2026-10-17T12:00:00.000Z');

describe('cookieJar (Integração Frente 1 - Lote 1)', () => {
  it('absorve Set-Cookie e monta o header Cookie', () => {
    const jar = createCookieJar(undefined, () => NOW);
    jar.absorbSetCookie(['vers_access=abc123; Path=/; HttpOnly; SameSite=Lax']);
    expect(jar.getHeader()).toBe('vers_access=abc123');
  });

  it('acumula vários cookies no mesmo header', () => {
    const jar = createCookieJar(undefined, () => NOW);
    jar.absorbSetCookie([
      'vers_access=aaa; Path=/; HttpOnly',
      'vers_refresh=bbb; Path=/api/v1/auth; HttpOnly',
      'vers_csrf=ccc; Path=/; HttpOnly',
    ]);
    expect(jar.getHeader()).toBe(
      'vers_access=aaa; vers_refresh=bbb; vers_csrf=ccc',
    );
  });

  it('substitui o valor de cookie com o mesmo nome', () => {
    const jar = createCookieJar(undefined, () => NOW);
    jar.absorbSetCookie(['vers_access=antigo; Path=/']);
    jar.absorbSetCookie(['vers_access=novo; Path=/']);
    expect(jar.getHeader()).toBe('vers_access=novo');
  });

  it('remove cookie com valor vazio (expiração de logout)', () => {
    const jar = createCookieJar(undefined, () => NOW);
    jar.absorbSetCookie(['vers_access=aaa; Path=/']);
    jar.absorbSetCookie(
      ['vers_access=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT'],
    );
    expect(jar.getHeader()).toBeNull();
  });

  it('nao expõe cookie com Expires no passado', () => {
    const jar = createCookieJar(undefined, () => NOW);
    jar.absorbSetCookie(['vers_access=aaa; Expires=Thu, 01 Jan 1970 00:00:00 GMT']);
    expect(jar.getHeader()).toBeNull();
  });

  it('remove cookie que venceu entre chamadas', () => {
    let current = NOW;
    const jar = createCookieJar(undefined, () => current);
    jar.absorbSetCookie(['vers_access=aaa; Max-Age=60']);
    current = NOW + 30_000;
    expect(jar.getHeader()).toBe('vers_access=aaa');
    current = NOW + 61_000;
    expect(jar.getHeader()).toBeNull();
  });

  it('expoe has para consultar cookie presente', () => {
    const jar = createCookieJar(undefined, () => NOW);
    jar.absorbSetCookie(['vers_refresh=bbb; Path=/api/v1/auth']);
    expect(jar.has('vers_refresh')).toBe(true);
    expect(jar.has('vers_access')).toBe(false);
  });

  it('snapshot e restore preservam o estado do jar', () => {
    const jar = createCookieJar(undefined, () => NOW);
    jar.absorbSetCookie(['vers_access=aaa; Max-Age=3600']);
    const restored = createCookieJar(jar.snapshot(), () => NOW);
    expect(restored.getHeader()).toBe('vers_access=aaa');
    expect(restored.has('vers_access')).toBe(true);
  });

  it('clear zera todos os cookies', () => {
    const jar = createCookieJar(undefined, () => NOW);
    jar.absorbSetCookie(['vers_access=aaa', 'vers_csrf=ccc']);
    jar.clear();
    expect(jar.getHeader()).toBeNull();
  });

  it('parseia name, value e atributos relevantes', () => {
    const parsed = parseSetCookie(
      'vers_csrf=nonce123; Path=/; HttpOnly; SameSite=Lax; Max-Age=600',
    );
    expect(parsed).toMatchObject({ name: 'vers_csrf', value: 'nonce123' });
    expect(parsed?.maxAgeSeconds).toBe(600);
  });

  it('retorna null para string sem par nome=valor', () => {
    expect(parseSetCookie('sem-par')).toBeNull();
  });
});
