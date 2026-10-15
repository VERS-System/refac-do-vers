/**
 * Testes do anel de progresso do KPI "Eficiência ponta a ponta".
 */

import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { MedidorAnel } from './MedidorAnel';

/** Fração do anel preenchida, lida do `stroke-dasharray` do arco de progresso. */
function fracao(container: HTMLElement) {
  const arco = container.querySelector('[data-slot="progresso"]');
  const [preenchido, total] = (arco?.getAttribute('stroke-dasharray') ?? '0 1')
    .split(' ')
    .map(Number);
  return preenchido / total;
}

describe('MedidorAnel', () => {
  /** O arco cobre a fração do percentual; o anel é decorativo (o valor está no texto do card). */
  it('preenche o arco conforme o percentual', () => {
    const { container } = render(<MedidorAnel percentual={53.5} simbolo="η" />);

    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    expect(fracao(container)).toBeCloseTo(0.535);
    expect(container).toHaveTextContent('η');
  });

  /** Fora de 0 a 100 ou ausente, o arco fica preso nos limites. */
  it('limita o percentual', () => {
    const { container, rerender } = render(<MedidorAnel percentual={140} />);
    expect(fracao(container)).toBe(1);

    rerender(<MedidorAnel percentual={null} />);
    expect(fracao(container)).toBe(0);
  });
});
