/**
 * Testes da animação dos gráficos (Fase 5, lote 16): áreas, linhas e barras
 * se desenham em 600 ms só quando o movimento é permitido.
 * Plano: `.AIs/docs/plans/desktop-frontend-fase-5.md` (seção 7).
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useAnimacaoGrafico } from './useAnimacaoGrafico';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useAnimacaoGrafico', () => {
  /** Com menos movimento (ou sem matchMedia), os gráficos aparecem prontos. */
  it('desliga a animação sem movimento', () => {
    const { result } = renderHook(() => useAnimacaoGrafico());

    expect(result.current).toEqual({ isAnimationActive: false });
  });

  /** Com movimento, desenha em 600 ms, desacelerando. */
  it('desenha em 600 ms com movimento', () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({ matches: false, addEventListener() {}, removeEventListener() {} })),
    );

    const { result } = renderHook(() => useAnimacaoGrafico());

    expect(result.current).toEqual({
      isAnimationActive: true,
      animationDuration: 600,
      animationEasing: 'ease-out',
    });
  });
});
