/**
 * Testes do seletor de período ligado ao estado global.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PERIODO_PADRAO, usePeriodoStore } from '@/stores/periodo';
import { PeriodSelector } from './PeriodSelector';

describe('PeriodSelector', () => {
  beforeEach(() => {
    usePeriodoStore.getState().setPeriodo(PERIODO_PADRAO);
  });

  /** Mostra as quatro opções na ordem das referências, com o Dia marcado. */
  it('mostra Hora, Dia, Semana e Mês com o período atual marcado', () => {
    render(<PeriodSelector />);

    const opcoes = screen.getAllByRole('radio');
    expect(opcoes.map((o) => o.textContent)).toEqual(['Hora', 'Dia', 'Semana', 'Mês']);
    expect(screen.getByRole('radio', { name: 'Dia' })).toHaveAttribute('aria-checked', 'true');
  });

  /** Escolher um período atualiza o estado global, compartilhado entre telas. */
  it('grava o período escolhido no estado global', async () => {
    render(<PeriodSelector />);

    await userEvent.click(screen.getByRole('radio', { name: 'Mês' }));

    expect(usePeriodoStore.getState().periodo).toBe('mes');
    expect(screen.getByRole('radio', { name: 'Mês' })).toHaveAttribute('aria-checked', 'true');
  });
});
