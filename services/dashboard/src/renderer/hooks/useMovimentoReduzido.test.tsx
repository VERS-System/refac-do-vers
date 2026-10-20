/**
 * Testes do `useMovimentoReduzido`: a animação feita em JavaScript (CountUp,
 * ondas do Login) para quando a preferência do app ou a do sistema pedem
 * menos movimento, e também onde não há `matchMedia`.
 *
 * Plano: `.AIs/docs/plans/desktop-frontend-fase-5.md` (seção 3, lote 1).
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { usePreferencias } from '@/stores/preferencias';
import { useMovimentoReduzido } from './useMovimentoReduzido';

/** Simula o `matchMedia` do sistema e devolve como trocar a preferência dele. */
function simularSistema(reduzir: boolean) {
  const ouvintes = new Set<(evento: { matches: boolean }) => void>();
  const consulta = {
    matches: reduzir,
    media: '(prefers-reduced-motion: reduce)',
    addEventListener: (_tipo: string, ouvinte: (evento: { matches: boolean }) => void) =>
      ouvintes.add(ouvinte),
    removeEventListener: (_tipo: string, ouvinte: (evento: { matches: boolean }) => void) =>
      ouvintes.delete(ouvinte),
  };
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => consulta),
  );
  return (novo: boolean) => {
    consulta.matches = novo;
    for (const ouvinte of ouvintes) ouvinte({ matches: novo });
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useMovimentoReduzido', () => {
  /** Sem `matchMedia` não dá para saber a preferência do sistema: não anima. */
  it('reduz sem matchMedia', () => {
    vi.stubGlobal('matchMedia', undefined);

    const { result } = renderHook(() => useMovimentoReduzido());

    expect(result.current).toBe(true);
  });

  /** Sistema e app sem pedido de menos movimento: anima. */
  it('anima quando ninguém pede menos movimento', () => {
    simularSistema(false);

    const { result } = renderHook(() => useMovimentoReduzido());

    expect(result.current).toBe(false);
  });

  /** A preferência "Reduzir movimento" das Configurações para a animação. */
  it('segue a preferência do app', () => {
    simularSistema(false);
    const { result } = renderHook(() => useMovimentoReduzido());

    act(() => usePreferencias.getState().salvar({ reduzirMovimento: true }));

    expect(result.current).toBe(true);
  });

  /** A preferência do sistema vale e é acompanhada se mudar com o app aberto. */
  it('segue a preferência do sistema', () => {
    const mudarSistema = simularSistema(false);
    const { result } = renderHook(() => useMovimentoReduzido());

    act(() => mudarSistema(true));

    expect(result.current).toBe(true);
  });
});
