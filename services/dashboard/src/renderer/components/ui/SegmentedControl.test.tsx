/**
 * Testes do controle segmentado (seletor de período Hora, Dia, Semana, Mês).
 */

import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SegmentedControl } from './SegmentedControl';

const PERIODOS = [
  { value: 'hora', label: 'Hora' },
  { value: 'dia', label: 'Dia' },
  { value: 'semana', label: 'Semana' },
  { value: 'mes', label: 'Mês' },
] as const;

/** Envolve o controle com estado real, como uma tela faria. */
function ComEstado({ aoMudar }: { aoMudar?: (valor: string) => void }) {
  const [valor, setValor] = useState('dia');
  return (
    <SegmentedControl
      aria-label="Período"
      options={PERIODOS}
      value={valor}
      onChange={(novo) => {
        setValor(novo);
        aoMudar?.(novo);
      }}
    />
  );
}

describe('SegmentedControl — destaque deslizante (Fase 5)', () => {
  /** Um só destaque, decorativo, que acompanha a opção escolhida. */
  it('leva o destaque até a opção escolhida', async () => {
    render(<ComEstado />);
    const destaque = () => document.querySelectorAll('[data-slot="indicador"]');
    expect(destaque()).toHaveLength(1);
    expect(destaque()[0]).toHaveAttribute('aria-hidden', 'true');
    expect(destaque()[0]).toHaveAttribute('data-valor', 'dia');

    await userEvent.click(screen.getByRole('radio', { name: 'Semana' }));

    expect(destaque()[0]).toHaveAttribute('data-valor', 'semana');
  });
});

describe('SegmentedControl', () => {
  /** É um grupo de rádios nomeado, com a opção atual marcada. */
  it('marca a opção selecionada', () => {
    render(<ComEstado />);

    expect(screen.getByRole('radiogroup', { name: 'Período' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Dia' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: 'Hora' })).toHaveAttribute('aria-checked', 'false');
  });

  /** Clicar numa opção chama onChange com o valor dela. */
  it('chama onChange ao clicar numa opção', async () => {
    const aoMudar = vi.fn();
    render(<ComEstado aoMudar={aoMudar} />);

    await userEvent.click(screen.getByRole('radio', { name: 'Semana' }));

    expect(aoMudar).toHaveBeenCalledWith('semana');
    expect(screen.getByRole('radio', { name: 'Semana' })).toHaveAttribute('aria-checked', 'true');
  });

  /** Só a opção marcada entra na ordem de tabulação (roving tabindex). */
  it('deixa só a opção marcada na ordem de tabulação', () => {
    render(<ComEstado />);

    expect(screen.getByRole('radio', { name: 'Dia' })).toHaveAttribute('tabindex', '0');
    expect(screen.getByRole('radio', { name: 'Mês' })).toHaveAttribute('tabindex', '-1');
  });

  /** Setas mudam a seleção e o foco, voltando ao início depois da última. */
  it('navega com as setas e dá a volta nas pontas', async () => {
    const aoMudar = vi.fn();
    render(<ComEstado aoMudar={aoMudar} />);

    screen.getByRole('radio', { name: 'Dia' }).focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(aoMudar).toHaveBeenLastCalledWith('semana');
    expect(screen.getByRole('radio', { name: 'Semana' })).toHaveFocus();

    await userEvent.keyboard('{ArrowRight}{ArrowRight}');
    expect(aoMudar).toHaveBeenLastCalledWith('hora');

    await userEvent.keyboard('{ArrowLeft}');
    expect(aoMudar).toHaveBeenLastCalledWith('mes');
    expect(screen.getByRole('radio', { name: 'Mês' })).toHaveFocus();
  });
});
