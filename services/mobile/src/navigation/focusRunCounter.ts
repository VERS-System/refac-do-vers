/**
 * Controla a contagem de focos de uma tela para definir quando a animação das
 * barras da logo deve ser reproduzida.
 *
 * A tela de Login não deve animar em sua primeira exibição (logo após a splash),
 * mas deve reanimar nas próximas vezes em que voltar a ser focada vinda do
 * Cadastro. A tela de Cadastro sempre anima, pois só é alcançada navegando.
 */

import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';

/** Estado atual da contagem de focos de uma tela. */
export type FocusRunState = {
  /** Indica se a tela já foi exibida pelo menos uma vez. */
  focused: boolean;
  /** Número de vezes que a animação deve ser disparada. */
  run: number;
};

/**
 * Calcula o próximo estado da contagem. Quando `skipInitial` está ativo, o
 * primeiro foco apenas marca a tela como vista e não incrementa, impedindo a
 * animação na primeira aparição.
 */
export function nextFocusRun(state: FocusRunState, skipInitial: boolean): FocusRunState {
  if (!state.focused) {
    return { ...state, focused: true };
  }

  return { ...state, run: state.run + 1 };
}

/**
 * Hook de foco que retorna a contagem de animações. Com `skipInitial`, o
 * primeiro foco da tela não dispara a animação.
 */
export function useFocusLogoAnimationRun(skipInitial = false): number {
  const [state, setState] = useState<FocusRunState>(() => ({
    focused: !skipInitial,
    run: 0,
  }));

  useFocusEffect(
    useCallback(() => {
      setState((previous) => nextFocusRun(previous, skipInitial));
    }, [skipInitial]),
  );

  return state.run;
}