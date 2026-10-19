/**
 * Testes da paginação das tabelas (amostras da Telemetria, histórico de testes).
 */

import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Paginacao } from './Paginacao';

describe('Paginacao', () => {
  /** Mostra o intervalo exibido, a página atual e o total de páginas. */
  it('mostra o intervalo e as páginas', () => {
    render(<Paginacao pagina={2} tamanho={10} total={17} unidade="testes" onTrocar={() => {}} />);

    expect(screen.getByText('Mostrando 11 a 17 de 17 testes')).toBeInTheDocument();
    expect(screen.getByText('2 de 2')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Próxima' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeEnabled();
  });

  /** Os botões pedem a página vizinha. */
  it('troca de página', async () => {
    const trocar = vi.fn();
    render(<Paginacao pagina={1} tamanho={20} total={265} unidade="amostras" onTrocar={trocar} />);

    expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Próxima' }));

    expect(trocar).toHaveBeenCalledWith(2);
  });

  /** Sem itens: "Mostrando 0 a 0" e uma página só. */
  it('trata a lista vazia', () => {
    render(<Paginacao pagina={1} tamanho={10} total={0} unidade="testes" onTrocar={() => {}} />);

    expect(screen.getByText('Mostrando 0 a 0 de 0 testes')).toBeInTheDocument();
    expect(screen.getByText('1 de 1')).toBeInTheDocument();
  });
});
