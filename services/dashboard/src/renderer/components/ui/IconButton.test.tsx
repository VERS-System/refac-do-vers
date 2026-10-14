/**
 * Testes do botão circular só com ícone (busca, notificações, sincronizar).
 */

import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Bell, Search } from 'lucide-react';
import { IconButton } from './IconButton';

describe('IconButton', () => {
  /** Sem texto visível, o nome acessível vem do rótulo. */
  it('é nomeado pelo rótulo com ícone decorativo', () => {
    render(<IconButton icon={Search} label="Buscar registros" />);

    const botao = screen.getByRole('button', { name: 'Buscar registros' });
    expect(botao).toHaveAttribute('type', 'button');
    expect(botao.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  /** O rótulo também aparece como dica ao passar o mouse. */
  it('mostra o rótulo como dica', () => {
    render(<IconButton icon={Search} label="Buscar registros" />);

    expect(screen.getByRole('button', { name: 'Buscar registros' })).toHaveAttribute('title', 'Buscar registros');
  });

  /** O clique chama o callback. */
  it('chama onClick ao clicar', async () => {
    const aoClicar = vi.fn();
    render(<IconButton icon={Bell} label="Notificações" onClick={aoClicar} />);

    await userEvent.click(screen.getByRole('button', { name: 'Notificações' }));

    expect(aoClicar).toHaveBeenCalledTimes(1);
  });

  /** O indicador de novidade é um ponto decorativo, só exibido quando pedido. */
  it('mostra o indicador apenas quando pedido', () => {
    const { container, rerender } = render(<IconButton icon={Bell} label="Notificações" />);
    expect(container.querySelector('[data-slot="indicator"]')).toBeNull();

    rerender(<IconButton icon={Bell} label="Notificações, há novas" indicator />);
    expect(container.querySelector('[data-slot="indicator"]')).toHaveAttribute('aria-hidden', 'true');
  });
});
