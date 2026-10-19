/**
 * Props de animação das séries dos gráficos (Recharts), Fase 5.
 *
 * Com movimento permitido, áreas, linhas e barras se desenham em 600 ms,
 * desacelerando, ao abrir a tela e ao trocar o período; com "Reduzir
 * movimento" (ou sem `matchMedia`, como nos testes), aparecem prontas.
 * Plano em `.AIs/docs/plans/desktop-frontend-fase-5.md`.
 */

import { useMovimentoReduzido } from './useMovimentoReduzido';

export type AnimacaoGrafico =
  | { isAnimationActive: false }
  | { isAnimationActive: true; animationDuration: number; animationEasing: 'ease-out' };

/** Props para espalhar nas séries (`<Area {...animacao} />`). */
export function useAnimacaoGrafico(): AnimacaoGrafico {
  const reduzido = useMovimentoReduzido();
  return reduzido
    ? { isAnimationActive: false }
    : { isAnimationActive: true, animationDuration: 600, animationEasing: 'ease-out' };
}
