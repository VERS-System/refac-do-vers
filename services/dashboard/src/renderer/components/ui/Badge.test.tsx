/**
 * Testes do badge de status (pílula com ponto colorido).
 */

import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge } from './Badge';

describe('Badge', () => {
  /** Mostra o texto com o tom neutro por padrão. */
  it('renderiza o texto com tom neutro por padrão', () => {
    render(<Badge>Dados de exemplo</Badge>);

    expect(screen.getByText('Dados de exemplo').closest('[data-tone]')).toHaveAttribute(
      'data-tone',
      'neutral',
    );
  });

  /** O tom escolhido é refletido no elemento. */
  it('aplica o tom informado', () => {
    render(<Badge tone="success">Online</Badge>);

    expect(screen.getByText('Online').closest('[data-tone]')).toHaveAttribute('data-tone', 'success');
  });

  /** O ponto é decorativo e aparece por padrão. */
  it('mostra ponto decorativo por padrão', () => {
    const { container } = render(<Badge tone="warning">Manutenção</Badge>);

    const ponto = container.querySelector('[data-slot="dot"]');
    expect(ponto).not.toBeNull();
    expect(ponto).toHaveAttribute('aria-hidden', 'true');
  });

  /** O ponto pode ser omitido. */
  it('omite o ponto quando dot é falso', () => {
    const { container } = render(<Badge dot={false}>Entrada AC/DC</Badge>);

    expect(container.querySelector('[data-slot="dot"]')).toBeNull();
  });
});
