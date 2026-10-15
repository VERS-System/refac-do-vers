/**
 * Testes do desenho da topologia dos piezos.
 */

import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { descreverTopologia, TopologiaPiezos } from './TopologiaPiezos';

describe('TopologiaPiezos', () => {
  /** O resumo diz quantas posições, quantos captam e quais estão inativos. */
  it('descreve a topologia', () => {
    expect(descreverTopologia(8, [6, 8])).toBe(
      'Topologia dos piezos: 8 posições, 6 captando; inativos: 6 e 8.',
    );
    expect(descreverTopologia(8, [2, 5, 7])).toBe(
      'Topologia dos piezos: 8 posições, 5 captando; inativos: 2, 5 e 7.',
    );
    expect(descreverTopologia(8, [])).toBe(
      'Topologia dos piezos: 8 posições, 8 captando; todos captando.',
    );
  });

  /** Uma marca numerada por posição; os inativos ficam apagados. */
  it('desenha os piezos', () => {
    const { container } = render(<TopologiaPiezos total={8} inativos={[6, 8]} />);

    expect(screen.getByRole('img', { name: descreverTopologia(8, [6, 8]) })).toBeInTheDocument();
    const circulos = container.querySelectorAll('circle');
    expect(circulos).toHaveLength(8);
    expect(circulos[5]).not.toHaveClass('fill-accent');
    expect(circulos[0]).toHaveClass('fill-accent');
  });
});
