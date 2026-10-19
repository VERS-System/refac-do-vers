/**
 * Testes do estado global do período exibido nas telas (Hora, Dia, Semana, Mês).
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { PERIODO_PADRAO, usePeriodoStore } from './periodo';

describe('usePeriodoStore', () => {
  beforeEach(() => {
    usePeriodoStore.getState().setPeriodo(PERIODO_PADRAO);
  });

  /** As telas abrem no dia, como nas referências do Stitch. */
  it('começa no período Dia', () => {
    expect(PERIODO_PADRAO).toBe('dia');
    expect(usePeriodoStore.getState().periodo).toBe('dia');
  });

  /** Trocar o período atualiza o estado compartilhado. */
  it('troca o período', () => {
    usePeriodoStore.getState().setPeriodo('semana');

    expect(usePeriodoStore.getState().periodo).toBe('semana');
  });
});
