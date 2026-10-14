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

  /** Cada ciclo tem uma crista e um vale (duas meias-ondas). */
  it('desenha duas meias-ondas por ciclo', () => {
    const { container } = render(<OndaVibracao ciclos={4} />);

    expect(contarCurvas(container)).toBe(8);
  });
});
