/**
 * Testes da contagem dos valores dos KPIs (CountUp do DESIGN.md).
 *
 * O número sobe do valor anterior (ou de zero) até o novo em ~600 ms; o
 * valor final fica disponível para leitor de tela desde o início; com menos
 * movimento, aparece direto. Plano: `.AIs/docs/plans/desktop-frontend-fase-5.md`.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { ContagemNumero } from './ContagemNumero';

const formatar = (n: number) => String(Math.round(n));

/** Sistema sem pedido de menos movimento, para a contagem acontecer. */
function permitirMovimento() {
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({ matches: false, addEventListener() {}, removeEventListener() {} })),
  );
  vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] });
}

/** O número que aparece na tela (a parte escondida do leitor de tela). */
const visivel = (container: HTMLElement) =>
  container.querySelector('[aria-hidden="true"]')?.textContent;

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('ContagemNumero', () => {
  /** Com menos movimento (ou sem matchMedia), o valor aparece direto e uma vez só. */
  it('mostra o valor direto sem movimento', () => {
    const { container } = render(<ContagemNumero numero={212} formatar={formatar} />);

    expect(container).toHaveTextContent(/^212$/);
  });

  /** Sobe de zero até o valor; o leitor de tela recebe o valor final desde o início. */
  it('conta até o valor', () => {
    permitirMovimento();
    const { container } = render(<ContagemNumero numero={212} formatar={formatar} />);

    expect(screen.getByText('212')).toHaveClass('sr-only');
    expect(visivel(container)).toBe('0');

    act(() => vi.advanceTimersByTime(300));
    const meio = Number(visivel(container));
    expect(meio).toBeGreaterThan(0);
    expect(meio).toBeLessThan(212);

    act(() => vi.advanceTimersByTime(400));
    expect(visivel(container)).toBe('212');
  });

  /** Um valor novo conta a partir do que estava na tela, não de zero. */
  it('conta a partir do valor anterior', () => {
    permitirMovimento();
    const { container, rerender } = render(<ContagemNumero numero={200} formatar={formatar} />);
    act(() => vi.advanceTimersByTime(700));

    rerender(<ContagemNumero numero={220} formatar={formatar} />);
    expect(visivel(container)).toBe('200');
    act(() => vi.advanceTimersByTime(100));
    expect(Number(visivel(container))).toBeGreaterThanOrEqual(200);

    act(() => vi.advanceTimersByTime(600));
    expect(visivel(container)).toBe('220');
    expect(container.querySelector('.sr-only')).toHaveTextContent('220');
  });
});
