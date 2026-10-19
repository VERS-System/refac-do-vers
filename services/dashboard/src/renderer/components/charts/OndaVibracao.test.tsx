/**
 * Testes da onda decorativa do card "Vibração RMS".
 */

import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { OndaVibracao } from './OndaVibracao';

/** Conta os segmentos de curva ("C" ou "Q") do caminho da onda. */
function contarCurvas(container: HTMLElement) {
  const d = container.querySelector('path[data-slot="onda"]')?.getAttribute('d') ?? '';
  return (d.match(/[CQ]/g) ?? []).length;
}

describe('OndaVibracao', () => {
  /** A onda é decorativa: o valor RMS está no texto do card. */
  it('é decorativa', () => {
    const { container } = render(<OndaVibracao />);

    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  /**
   * Cada ciclo tem uma crista e um vale (duas meias-ondas); um ciclo a mais
   * fica fora da área, para a onda correr sem emenda (Fase 5).
   */
  it('desenha duas meias-ondas por ciclo, mais um ciclo para correr', () => {
    const { container } = render(<OndaVibracao ciclos={4} />);

    expect(contarCurvas(container)).toBe(10);
  });

  /** A onda corre na horizontal, um ciclo por volta (60 de 240 com 4 ciclos). */
  it('corre na horizontal', () => {
    const { container } = render(<OndaVibracao ciclos={4} />);

    const onda = container.querySelector<SVGPathElement>('path[data-slot="onda"]');
    expect(onda).toHaveClass('onda-correndo');
    expect(onda?.style.getPropertyValue('--ciclo')).toBe('60px');
  });
});
