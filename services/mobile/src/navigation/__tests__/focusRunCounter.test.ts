/**
 * Testes unitários do contador de focos usado para reanimar a logo VERS.
 */

import { nextFocusRun } from '../focusRunCounter';

describe('nextFocusRun', () => {
  /**
   * Quando a tela deve saltar a primeira exibição (Login após a splash), o
   * primeiro foco apenas marca a tela como vista e mantém a contagem em zero.
   */
  it('não anima no primeiro foco quando o salto inicial está ativo', () => {
    const state = { focused: false, run: 0 };

    const first = nextFocusRun(state, true);
    expect(first).toEqual({ focused: true, run: 0 });

    const second = nextFocusRun(first, true);
    expect(second.run).toBe(1);
  });

  /** Cadastro sempre anima, inclusive na sua primeira exibição. */
  it('anima já no primeiro foco quando o salto inicial está desativado', () => {
    const state = { focused: true, run: 0 };

    const first = nextFocusRun(state, false);
    expect(first.run).toBe(1);
  });

  /** Os focos seguintes continuam incrementando para reanimar a logo. */
  it('incrementa a cada foco seguinte', () => {
    const state = { focused: true, run: 1 };

    const after = nextFocusRun(state, false);
    expect(after.run).toBe(2);
  });
});