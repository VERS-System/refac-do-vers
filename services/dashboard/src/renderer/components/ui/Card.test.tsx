/**
 * Testes do card base (superfície com borda sutil e raio de 20 px).
 */

import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Card } from './Card';

describe('Card', () => {
  /** Renderiza o conteúdo recebido. */
  it('renderiza os filhos', () => {
    render(<Card>Conteúdo</Card>);

    expect(screen.getByText('Conteúdo')).toBeInTheDocument();
  });

  /** Classes extras são somadas às classes base, sem substituí-las. */
  it('soma classes extras às classes base', () => {
    render(<Card className="col-span-4">Conteúdo</Card>);

    const card = screen.getByText('Conteúdo');
    expect(card).toHaveClass('col-span-4');
    expect(card).toHaveClass('bg-surface');
  });

  /** Pode ser renderizado como outro elemento semântico. */
  it('aceita outro elemento via as', () => {
    render(
      <Card as="section" aria-label="Resumo">
        Conteúdo
      </Card>,
    );

    expect(screen.getByRole('region', { name: 'Resumo' })).toBeInTheDocument();
  });
});
