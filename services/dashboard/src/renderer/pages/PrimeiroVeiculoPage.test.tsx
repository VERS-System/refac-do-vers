/**
 * Testes da tela Primeiro veículo (cadastro do carro no primeiro acesso).
 *
 * Seguem o plano `.AIs/docs/plans/desktop-frontend-veiculo-no-cadastro.md`:
 * campos preenchidos com o veículo guardado pelo Criar conta, cadastro pelo
 * repositório, recusa no aviso de erro, "Pular por agora" e, sem veículo
 * guardado, ida direta à Visão geral.
 */

import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '@/App';
import { criarRepositorioMock } from '@/data/repositorioMock';
import { guardarVeiculoDoCadastro, lerVeiculoDoCadastro } from '@/data/veiculoDoCadastro';

const POLO = { placa: 'GHI2J34', fabricante: 'Volkswagen', modelo: 'Polo', ano: '2023' };

/** Abre o app no Primeiro veículo e devolve o repositório usado. */
function abrirPrimeiroVeiculo() {
  const repositorio = criarRepositorioMock();
  window.location.hash = '#/primeiro-veiculo';
  render(<App repositorio={repositorio} />);
  return repositorio;
}

const visaoGeral = () => screen.findByRole('heading', { level: 1, name: 'Visão geral' });

describe('PrimeiroVeiculoPage', () => {
  /** Traz o que foi digitado no Criar conta e grava o carro ao confirmar. */
  it('cadastra o veículo guardado', async () => {
    guardarVeiculoDoCadastro('novo@vers.com', POLO);
    const repositorio = abrirPrimeiroVeiculo();

    expect(
      screen.getByRole('heading', { level: 2, name: 'Cadastre seu veículo' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Placa')).toHaveValue('GHI2J34');
    expect(screen.getByLabelText('Fabricante')).toHaveValue('Volkswagen');
    expect(screen.getByLabelText('Modelo')).toHaveValue('Polo');
    expect(screen.getByLabelText('Ano')).toHaveValue('2023');

    await userEvent.clear(screen.getByLabelText('Ano'));
    await userEvent.type(screen.getByLabelText('Ano'), '2024');
    await userEvent.click(screen.getByRole('button', { name: 'Cadastrar veículo' }));

    expect(await visaoGeral()).toBeInTheDocument();
    const polo = (await repositorio.obterVeiculos()).find((v) => v.placa === 'GHI2J34');
    expect(polo).toMatchObject({ fabricante: 'Volkswagen', modelo: 'Polo', ano: 2024 });
    expect(lerVeiculoDoCadastro()).toBeNull();
  });

  /** Valida como a etapa Veículo do Criar conta antes de enviar. */
  it('valida o veículo', async () => {
    guardarVeiculoDoCadastro('novo@vers.com', POLO);
    abrirPrimeiroVeiculo();

    await userEvent.clear(screen.getByLabelText('Placa'));
    await userEvent.type(screen.getByLabelText('Placa'), 'abc');
    await userEvent.click(screen.getByRole('button', { name: 'Cadastrar veículo' }));

    expect(screen.getByText('Informe uma placa válida, como ABC1D23.')).toBeInTheDocument();
  });

  /** Placa já cadastrada: mostra a recusa e mantém o veículo guardado. */
  it('mostra a recusa do cadastro', async () => {
    guardarVeiculoDoCadastro('novo@vers.com', { ...POLO, placa: 'ABC1D23' });
    abrirPrimeiroVeiculo();

    await userEvent.click(screen.getByRole('button', { name: 'Cadastrar veículo' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Já existe um veículo com a placa ABC1D23.',
    );
    expect(lerVeiculoDoCadastro()).not.toBeNull();
  });

  /** "Pular por agora" esquece o veículo guardado sem gravar nada. */
  it('pula o cadastro', async () => {
    guardarVeiculoDoCadastro('novo@vers.com', POLO);
    const repositorio = abrirPrimeiroVeiculo();

    await userEvent.click(screen.getByRole('button', { name: 'Pular por agora' }));

    expect(await visaoGeral()).toBeInTheDocument();
    expect(lerVeiculoDoCadastro()).toBeNull();
    expect(await repositorio.obterVeiculos()).toHaveLength(2);
  });

  /** Sem veículo guardado, não há o que confirmar: vai para a Visão geral. */
  it('sem veículo guardado, vai para a Visão geral', async () => {
    abrirPrimeiroVeiculo();

    expect(await visaoGeral()).toBeInTheDocument();
  });
});
