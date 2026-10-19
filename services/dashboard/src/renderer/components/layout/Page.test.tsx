/**
 * Testes da estrutura comum das telas internas (barra superior + conteúdo rolável).
 */

import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Page } from './Page';

describe('Page', () => {
  /**
   * Elementos absolutos sem ancestral posicionado (como os `sr-only` dos
   * valores) escapavam da área rolável e esticavam o documento: ao rolar até o
   * fim, a janela inteira deslizava e deixava uma faixa vazia embaixo. A área
   * rolável precisa ser o bloco de contenção deles.
   */
  it('faz da área rolável o bloco de contenção dos elementos absolutos', () => {
    render(
      <Page title="Visão geral">
        <span className="sr-only">4,82 V</span>
      </Page>,
    );

    const areaRolavel = screen.getByText('4,82 V').parentElement;

    expect(areaRolavel).toHaveClass('overflow-auto');
    expect(areaRolavel).toHaveClass('relative');
  });
});
