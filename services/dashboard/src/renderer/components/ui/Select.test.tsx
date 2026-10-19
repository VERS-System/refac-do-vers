/**
 * Testes do campo de seleção (formulários de testes, veículo e configurações).
 */

import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Select } from './Select';

const TERRENOS = [
  { valor: 'rodovia', rotulo: 'Rodovia' },
  { valor: 'cidade', rotulo: 'Cidade' },
];

describe('Select', () => {
  /** Rótulo ligado ao campo e as opções informadas. */
  it('mostra rótulo e opções', () => {
    render(<Select label="Terreno" opcoes={TERRENOS} value="cidade" onChange={() => {}} />);

    const campo = screen.getByLabelText('Terreno');
    expect(campo).toHaveValue('cidade');
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual(['Rodovia', 'Cidade']);
  });

  /** Escolher uma opção avisa o valor novo. */
  it('avisa a troca', async () => {
    const trocar = vi.fn();
    render(
      <Select
        label="Terreno"
        opcoes={TERRENOS}
        value="cidade"
        onChange={(e) => trocar(e.target.value)}
      />,
    );

    await userEvent.selectOptions(screen.getByLabelText('Terreno'), 'rodovia');

    expect(trocar).toHaveBeenCalledWith('rodovia');
  });

  /** Com erro, o campo é inválido e a mensagem o descreve. */
  it('mostra o erro', () => {
    render(
      <Select
        label="Terreno"
        opcoes={TERRENOS}
        value=""
        onChange={() => {}}
        error="Escolha o terreno."
      />,
    );

    const campo = screen.getByLabelText('Terreno');
    expect(campo).toHaveAttribute('aria-invalid', 'true');
    expect(campo).toHaveAccessibleDescription('Escolha o terreno.');
  });
});
