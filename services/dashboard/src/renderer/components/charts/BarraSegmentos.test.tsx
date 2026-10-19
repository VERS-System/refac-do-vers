/**
 * Testes da barra de segmentos do KPI "Potência instantânea".
 */

import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BarraSegmentos } from './BarraSegmentos';

/** Lista o estado de cada segmento, na ordem. */
function estados(container: HTMLElement) {
  return Array.from(container.querySelectorAll('[data-slot="segmento"]')).map((s) =>
    s.getAttribute('data-estado'),
  );
}

describe('BarraSegmentos', () => {
  /** É um medidor acessível com valor, mínimo e máximo. */
  it('expõe o valor como medidor', () => {
    render(<BarraSegmentos valor={212} maximo={400} rotulo="Nível de potência" />);

    const medidor = screen.getByRole('meter', { name: 'Nível de potência' });
    expect(medidor).toHaveAttribute('aria-valuenow', '212');
    expect(medidor).toHaveAttribute('aria-valuemin', '0');
    expect(medidor).toHaveAttribute('aria-valuemax', '400');
  });

  /** 212 de 400 em 8 segmentos = 4,24: quatro cheios, um parcial e três vazios. */
  it('preenche os segmentos proporcionalmente', () => {
    const { container } = render(
      <BarraSegmentos valor={212} maximo={400} rotulo="Nível de potência" />,
    );

    expect(estados(container)).toEqual([
      'cheio',
      'cheio',
      'cheio',
      'cheio',
      'parcial',
      'vazio',
      'vazio',
      'vazio',
    ]);
  });

  /** Valores fora da escala ficam presos entre vazio e cheio. */
  it('limita valores fora da escala', () => {
    const { container, rerender } = render(
      <BarraSegmentos valor={900} maximo={400} segmentos={4} rotulo="Nível" />,
    );
    expect(estados(container)).toEqual(['cheio', 'cheio', 'cheio', 'cheio']);

    rerender(<BarraSegmentos valor={-5} maximo={400} segmentos={4} rotulo="Nível" />);
    expect(estados(container)).toEqual(['vazio', 'vazio', 'vazio', 'vazio']);
  });

  /** O tom muda a cor dos segmentos acesos (dourado padrão ou verde). */
  it('aceita o tom de sucesso', () => {
    const { container, rerender } = render(
      <BarraSegmentos valor={50} maximo={100} segmentos={2} rotulo="Carga" />,
    );
    expect(container.querySelector('[data-estado="cheio"]')).toHaveClass('bg-accent');

    rerender(<BarraSegmentos valor={50} maximo={100} segmentos={2} rotulo="Carga" tom="success" />);
    expect(container.querySelector('[data-estado="cheio"]')).toHaveClass('bg-success');
  });
});
