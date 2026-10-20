/**
 * Testes do bloco de carregamento (skeleton).
 */

import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { Skeleton } from './Skeleton';

describe('Skeleton', () => {
  /** É só visual: fica fora da árvore de acessibilidade. */
  it('é decorativo e aceita classes de tamanho', () => {
    const { container } = render(<Skeleton className="h-8 w-24" />);
    const bloco = container.firstElementChild;

    expect(bloco).toHaveAttribute('aria-hidden', 'true');
    expect(bloco).toHaveAttribute('data-slot', 'skeleton');
    expect(bloco).toHaveClass('h-8', 'w-24');
  });
});
