/**
 * Testes do logo oficial do VERS (símbolo de três faixas + "VERS" em Zen Dots).
 */

import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { VersLogo } from './VersLogo';

describe('VersLogo', () => {
  /** O logo inteiro é uma imagem nomeada "VERS". */
  it('é uma imagem nomeada VERS', () => {
    render(<VersLogo />);

    expect(screen.getByRole('img', { name: 'VERS' })).toBeInTheDocument();
  });

  /** O símbolo tem as três faixas, com a do meio em dourado. */
  it('desenha as três faixas com a do meio dourada', () => {
    const { container } = render(<VersLogo />);

    const faixas = container.querySelectorAll('polygon');
    expect(faixas).toHaveLength(3);
    expect(faixas[1]).toHaveAttribute('fill', '#D5C462');
  });

  /** A versão aparece só quando informada. */
  it('mostra a versão quando informada', () => {
    const { rerender } = render(<VersLogo />);
    expect(screen.queryByText('v0.4')).not.toBeInTheDocument();

    rerender(<VersLogo version="v0.4" />);
    expect(screen.getByText('v0.4')).toBeInTheDocument();
  });

  /** O tamanho da tela de autenticação usa o símbolo maior. */
  it('usa o símbolo maior no tamanho auth', () => {
    const { container } = render(<VersLogo size="auth" />);

    expect(container.querySelector('svg')).toHaveAttribute('width', '72');
  });
});
