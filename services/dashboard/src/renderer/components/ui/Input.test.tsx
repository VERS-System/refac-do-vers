/**
 * Testes do campo de texto em pílula (rótulo acima, ícone à esquerda, ajuda abaixo).
 */

import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Mail } from 'lucide-react';
import { Input } from './Input';

describe('Input', () => {
  /** O rótulo nomeia o campo. */
  it('é nomeado pelo rótulo', () => {
    render(<Input label="E-mail" />);

    expect(screen.getByRole('textbox', { name: 'E-mail' })).toBeInTheDocument();
  });

  /** O texto de ajuda descreve o campo. */
  it('associa o texto de ajuda ao campo', () => {
    render(<Input label="E-mail" helper="Use o e-mail institucional" />);

    expect(screen.getByRole('textbox', { name: 'E-mail' })).toHaveAccessibleDescription(
      'Use o e-mail institucional',
    );
  });

  /** O erro substitui a ajuda e marca o campo como inválido. */
  it('mostra o erro e marca o campo como inválido', () => {
    render(<Input label="E-mail" helper="Use o e-mail institucional" error="E-mail inválido" />);

    const campo = screen.getByRole('textbox', { name: 'E-mail' });
    expect(campo).toHaveAttribute('aria-invalid', 'true');
    expect(campo).toHaveAccessibleDescription('E-mail inválido');
    expect(screen.queryByText('Use o e-mail institucional')).not.toBeInTheDocument();
  });

  /** Repassa props nativas, como onChange e type. */
  it('repassa props nativas', async () => {
    const aoMudar = vi.fn();
    render(<Input label="E-mail" type="email" icon={Mail} onChange={aoMudar} />);

    const campo = screen.getByRole('textbox', { name: 'E-mail' });
    await userEvent.type(campo, 'a');

    expect(campo).toHaveAttribute('type', 'email');
    expect(aoMudar).toHaveBeenCalled();
  });

  /** O ícone à esquerda é decorativo. */
  it('mostra o ícone como decorativo', () => {
    const { container } = render(<Input label="E-mail" icon={Mail} />);

    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });
});
