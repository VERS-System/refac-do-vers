/**
 * Testes dos estados de uma consulta de dados: carregando, erro e sucesso.
 */

import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EstadoConsulta, EstadoErro, type ConsultaBasica } from './EstadoConsulta';

/** Monta uma consulta falsa no formato do TanStack Query. */
function consulta<T>(parcial: Partial<ConsultaBasica<T>>): ConsultaBasica<T> {
  return { data: undefined, isPending: false, isError: false, refetch: vi.fn(), ...parcial };
}

describe('EstadoErro', () => {
  /** A mensagem é anunciada e o botão tenta de novo. */
  it('anuncia o erro e oferece tentar de novo', async () => {
    const tentar = vi.fn();
    render(
      <EstadoErro mensagem="Não foi possível carregar a vibração." onTentarNovamente={tentar} />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível carregar a vibração.');
    await userEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(tentar).toHaveBeenCalledOnce();
  });
});

describe('EstadoConsulta', () => {
  /** Carregando: mostra o esqueleto e marca a área como ocupada. */
  it('mostra o esqueleto enquanto carrega', () => {
    const { container } = render(
      <EstadoConsulta consulta={consulta<string>({ isPending: true })} nome="a vibração">
        {(dados) => <p>{dados}</p>}
      </EstadoConsulta>,
    );

    expect(container.firstElementChild).toHaveAttribute('aria-busy', 'true');
    expect(container.querySelector('[data-slot="skeleton"]')).toBeInTheDocument();
  });

  /** Erro: mensagem com o nome do dado e botão que refaz a consulta. */
  it('mostra o erro com o nome do dado', async () => {
    const refetch = vi.fn();
    render(
      <EstadoConsulta consulta={consulta<string>({ isError: true, refetch })} nome="a vibração">
        {(dados) => <p>{dados}</p>}
      </EstadoConsulta>,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível carregar a vibração.');
    await userEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(refetch).toHaveBeenCalledOnce();
  });

  /** Sucesso: entrega os dados ao conteúdo. */
  it('renderiza o conteúdo com os dados', () => {
    render(
      <EstadoConsulta consulta={consulta({ data: '3,2 m/s²' })} nome="a vibração">
        {(dados) => <p>{dados}</p>}
      </EstadoConsulta>,
    );

    expect(screen.getByText('3,2 m/s²')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  /** Um esqueleto próprio substitui o padrão. */
  it('aceita um esqueleto personalizado', () => {
    render(
      <EstadoConsulta
        consulta={consulta<string>({ isPending: true })}
        nome="a vibração"
        carregando={<span>esqueleto próprio</span>}
      >
        {(dados) => <p>{dados}</p>}
      </EstadoConsulta>,
    );

    expect(screen.getByText('esqueleto próprio')).toBeInTheDocument();
  });
});
