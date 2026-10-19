/**
 * Testes da minicurva dos cards de KPI.
 */

import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { Sparkline } from './Sparkline';

/** Lê os pontos "x,y" da polilinha como números. */
function lerPontos(container: HTMLElement) {
  const linha = container.querySelector('polyline[data-slot="linha"]');
  return (linha?.getAttribute('points') ?? '')
    .trim()
    .split(/\s+/)
    .map((par) => par.split(',').map(Number));
}

describe('Sparkline', () => {
  /** Um ponto por valor, ocupando toda a largura; é decorativa. */
  it('desenha um ponto por valor de ponta a ponta', () => {
    const { container } = render(<Sparkline valores={[0, 10, 5]} />);
    const pontos = lerPontos(container);

    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    expect(pontos).toHaveLength(3);
    expect(pontos[0][0]).toBe(0);
    expect(pontos[2][0]).toBe(100);
  });

  /** O maior valor fica no alto e o menor embaixo (y cresce para baixo no SVG). */
  it('escala os valores na altura', () => {
    const { container } = render(<Sparkline valores={[0, 10, 5]} />);
    const [minimo, maximo, meio] = lerPontos(container).map(([, y]) => y);

    expect(maximo).toBeLessThan(meio);
    expect(meio).toBeLessThan(minimo);
  });

  /** Com menos de dois valores não há curva para desenhar. */
  it('não desenha nada com menos de dois valores', () => {
    const { container } = render(<Sparkline valores={[7]} />);

    expect(container).toBeEmptyDOMElement();
  });
});
