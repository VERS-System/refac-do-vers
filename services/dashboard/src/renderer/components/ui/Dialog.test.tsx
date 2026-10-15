/**
 * Testes do diálogo modal (planejar, iniciar, finalizar e cancelar testes).
 */

import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Dialog } from './Dialog';

/** Botão que abre o diálogo, para conferir o retorno do foco. */
function ComAbertura() {
  const [aberto, setAberto] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setAberto(true)}>
        Abrir
      </button>
      <Dialog aberto={aberto} titulo="Cancelar teste" onFechar={() => setAberto(false)}>
        <input aria-label="Motivo" />
        <button type="button" onClick={() => setAberto(false)}>
          Voltar
        </button>
      </Dialog>
    </>
  );
}

describe('Dialog', () => {
  /** Fechado, não existe na página. */
  it('não aparece fechado', () => {
    render(
      <Dialog aberto={false} titulo="Cancelar teste" onFechar={() => {}}>
        conteúdo
      </Dialog>,
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  /** Aberto: diálogo modal nomeado pelo título e descrito pela descrição. */
  it('é um diálogo modal nomeado', () => {
    render(
      <Dialog
        aberto
        titulo="Cancelar teste"
        descricao="O teste #023 será encerrado."
        onFechar={() => {}}
      >
        conteúdo
      </Dialog>,
    );

    const dialogo = screen.getByRole('dialog', { name: 'Cancelar teste' });
    expect(dialogo).toHaveAttribute('aria-modal', 'true');
    expect(dialogo).toHaveAccessibleDescription('O teste #023 será encerrado.');
  });

  /** O foco entra no primeiro campo ao abrir. */
  it('leva o foco para dentro', () => {
    render(
      <Dialog aberto titulo="Cancelar teste" onFechar={() => {}}>
        <input aria-label="Motivo" />
      </Dialog>,
    );

    expect(screen.getByLabelText('Motivo')).toHaveFocus();
  });

  /** Esc e clique no fundo fecham; clique dentro não. */
  it('fecha com Esc e com o fundo', async () => {
    const fechar = vi.fn();
    render(
      <Dialog aberto titulo="Cancelar teste" onFechar={fechar}>
        <input aria-label="Motivo" />
      </Dialog>,
    );

    await userEvent.click(screen.getByLabelText('Motivo'));
    expect(fechar).not.toHaveBeenCalled();
    await userEvent.keyboard('{Escape}');
    expect(fechar).toHaveBeenCalledTimes(1);
    await userEvent.click(document.querySelector('[data-slot="fundo"]')!);
    expect(fechar).toHaveBeenCalledTimes(2);
  });

  /** Tab no último elemento volta ao primeiro (o foco não sai do diálogo). */
  it('prende o foco dentro', async () => {
    render(
      <Dialog aberto titulo="Cancelar teste" onFechar={() => {}}>
        <input aria-label="Motivo" />
        <button type="button">Voltar</button>
      </Dialog>,
    );

    await userEvent.tab();
    expect(screen.getByRole('button', { name: 'Voltar' })).toHaveFocus();
    await userEvent.tab();
    expect(screen.getByLabelText('Motivo')).toHaveFocus();
    await userEvent.tab({ shift: true });
    expect(screen.getByRole('button', { name: 'Voltar' })).toHaveFocus();
  });

  /** Ao fechar, o foco volta para quem abriu. */
  it('devolve o foco ao fechar', async () => {
    render(<ComAbertura />);
    const abrir = screen.getByRole('button', { name: 'Abrir' });

    await userEvent.click(abrir);
    expect(screen.getByLabelText('Motivo')).toHaveFocus();
    await userEvent.click(screen.getByRole('button', { name: 'Voltar' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(abrir).toHaveFocus();
  });
});
