/**
 * Testes do botão base (variantes Primary, Secondary, Ghost e Danger).
 */

import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Plus } from 'lucide-react';
import { Button } from './Button';

describe('Button', () => {
  /** Por padrão é um botão primário do tipo "button", para não enviar formulários. */
  it('renderiza como botão primário do tipo button', () => {
    render(<Button>Salvar</Button>);

    const botao = screen.getByRole('button', { name: 'Salvar' });
    expect(botao).toHaveAttribute('type', 'button');
    expect(botao).toHaveAttribute('data-variant', 'primary');
  });

  /** A variante escolhida é refletida no elemento. */
  it('aplica a variante informada', () => {
    render(<Button variant="danger">Excluir</Button>);

    expect(screen.getByRole('button', { name: 'Excluir' })).toHaveAttribute('data-variant', 'danger');
  });

  /** O clique chama o callback. */
  it('chama onClick ao clicar', async () => {
    const aoClicar = vi.fn();
    render(<Button onClick={aoClicar}>Salvar</Button>);

    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(aoClicar).toHaveBeenCalledTimes(1);
  });

  /** Desabilitado, o botão não dispara o callback. */
  it('não chama onClick quando desabilitado', async () => {
    const aoClicar = vi.fn();
    render(
      <Button onClick={aoClicar} disabled>
        Salvar
      </Button>,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(aoClicar).not.toHaveBeenCalled();
  });

  /** O ícone é decorativo: não altera o nome acessível do botão. */
  it('mostra ícone decorativo sem mudar o nome acessível', () => {
    render(<Button icon={Plus}>Novo teste</Button>);

    const botao = screen.getByRole('button', { name: 'Novo teste' });
    const svg = botao.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg).toHaveAttribute('aria-hidden', 'true');
  });

  /** Permite enviar formulário quando pedido explicitamente. */
  it('aceita type submit', () => {
    render(<Button type="submit">Entrar</Button>);

    expect(screen.getByRole('button', { name: 'Entrar' })).toHaveAttribute('type', 'submit');
  });
});
