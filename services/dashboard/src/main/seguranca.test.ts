/**
 * Testes das regras de segurança do app empacotado (Fase 5, lote 13): a
 * política de conteúdo (CSP) do `index.html` e a trava de navegação da
 * janela. Plano: `.AIs/docs/plans/desktop-frontend-fase-5.md`.
 */

import { describe, expect, it } from 'vitest';
import { navegacaoPermitida, POLITICA_CSP } from './seguranca';

/** Diretivas da política como mapa ("script-src" → ["'self'"]). */
function diretivas(): Map<string, string[]> {
  return new Map(
    POLITICA_CSP.split(';')
      .map((parte) => parte.trim().split(/\s+/))
      .filter((partes) => partes[0])
      .map(([nome, ...valores]) => [nome, valores]),
  );
}

describe('POLITICA_CSP', () => {
  /** Só código do próprio app; nada de eval nem script inline. */
  it('restringe os scripts ao app', () => {
    const csp = diretivas();
    expect(csp.get('default-src')).toEqual(["'self'"]);
    expect(csp.get('script-src')).toEqual(["'self'"]);
    expect(csp.get('object-src')).toEqual(["'none'"]);
    expect(csp.get('base-uri')).toEqual(["'none'"]);
    expect(csp.get('frame-src')).toEqual(["'none'"]);
  });

  /** O que o app usa: estilos inline (React e Recharts), imagens blob/data e a API local. */
  it('libera o que o app usa', () => {
    const csp = diretivas();
    expect(csp.get('style-src')).toEqual(["'self'", "'unsafe-inline'"]);
    expect(csp.get('img-src')).toEqual(["'self'", 'data:', 'blob:']);
    expect(csp.get('font-src')).toEqual(["'self'", 'data:']);
    expect(csp.get('connect-src')).toEqual([
      "'self'",
      'http://localhost:3000',
      'ws://localhost:3000',
    ]);
  });
});

describe('navegacaoPermitida', () => {
  const APP = 'file:///C:/VERS/out/renderer/index.html#/visao-geral';

  /** Trocar de tela (só o hash muda) continua no app. */
  it('permite trocar de tela', () => {
    expect(navegacaoPermitida('file:///C:/VERS/out/renderer/index.html#/energia', APP)).toBe(true);
    expect(
      navegacaoPermitida('http://localhost:5173/#/energia', 'http://localhost:5173/#/login'),
    ).toBe(true);
  });

  /** Sair do app (outro arquivo, site externo) é bloqueado. */
  it('bloqueia sair do app', () => {
    expect(navegacaoPermitida('https://exemplo.com/', APP)).toBe(false);
    expect(navegacaoPermitida('file:///C:/Windows/system.ini', APP)).toBe(false);
    expect(navegacaoPermitida('não é url', APP)).toBe(false);
  });
});
