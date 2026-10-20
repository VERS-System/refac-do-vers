/**
 * Testes da área de texto (observações dos testes, mensagens).
 */

import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Textarea } from './Textarea';

describe('Textarea', () => {
  /** Rótulo ligado ao campo e ajuda como descrição. */
  it('mostra rótulo e ajuda', () => {
    render(<Textarea label="Observações" helper="Opcional." />);

    expect(screen.getByLabelText('Observações')).toHaveAccessibleDescription('Opcional.');
  });

  /** Aceita texto de várias linhas. */
  it('recebe texto', async () => {
    render(<Textarea label="Observações" />);

    await userEvent.type(screen.getByLabelText('Observações'), 'linha 1{enter}linha 2');

    expect(screen.getByLabelText('Observações')).toHaveValue('linha 1\nlinha 2');
  });

  /** Com erro, o campo é inválido e a mensagem o descreve. */
  it('mostra o erro', () => {
    render(<Textarea label="Observações" error="Texto longo demais." />);

    expect(screen.getByLabelText('Observações')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('Observações')).toHaveAccessibleDescription('Texto longo demais.');
  });
});
