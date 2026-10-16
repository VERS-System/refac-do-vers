/**
 * Testes da tela Criar conta.
 *
 * Seguem o plano `.AIs/docs/plans/desktop-frontend-autenticacao.md`: três
 * etapas (Conta, Veículo, Instalação), requisitos da senha ao vivo, dados
 * preservados ao voltar, envio só da conta, veículo guardado para o primeiro
 * acesso e a tela final sem enumeração.
 */

import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '@/App';
import { ErroRepositorio } from '@/data/erros';
import type { RepositorioVers } from '@/data/repositorio';
import { criarRepositorioMock } from '@/data/repositorioMock';
import { lerVeiculoDoCadastro } from '@/data/veiculoDoCadastro';

/** Abre o app no Criar conta. */
function abrirCriarConta(repositorio?: RepositorioVers) {
  window.location.hash = '#/criar-conta';
  render(<App repositorio={repositorio} />);
}

const continuar = () => userEvent.click(screen.getByRole('button', { name: 'Continuar' }));

/** Preenche a etapa Conta com dados válidos (ou os informados). */
async function preencherConta({
  email = 'novo@vers.com',
  senha = 'Segredo!1',
  confirmacao,
}: { email?: string; senha?: string; confirmacao?: string } = {}) {
  await userEvent.type(screen.getByLabelText('Nome completo'), 'Novo Pesquisador');
  await userEvent.type(screen.getByLabelText('E-mail'), email);
  await userEvent.type(screen.getByLabelText('Senha'), senha);
  await userEvent.type(screen.getByLabelText('Confirmar senha'), confirmacao ?? senha);
}

/** Etapa marcada como atual na lista de etapas. */
function etapaAtual() {
  const etapas = screen.getByRole('list', { name: 'Etapas do cadastro' });
  return within(etapas)
    .getAllByRole('listitem')
    .find((item) => item.getAttribute('aria-current') === 'step');
}

describe('CriarContaPage — etapa Conta', () => {
  /** Começa na etapa Conta, com as três etapas listadas. */
  it('mostra as etapas', () => {
    abrirCriarConta();

    const etapas = screen.getByRole('list', { name: 'Etapas do cadastro' });
    expect(within(etapas).getAllByRole('listitem')).toHaveLength(3);
    expect(etapaAtual()).toHaveTextContent('Conta');
    expect(screen.getByRole('heading', { level: 2, name: 'Sua conta' })).toBeInTheDocument();
    expect(screen.getByLabelText('Senha')).toHaveAttribute('autocomplete', 'new-password');
  });

  /** Os requisitos da senha mudam enquanto se digita. */
  it('mostra os requisitos da senha ao vivo', async () => {
    abrirCriarConta();
    const requisitos = screen.getByRole('list', { name: 'Requisitos da senha' });
    const item = (texto: string) => within(requisitos).getByText(texto).closest('li');
    expect(item('8 caracteres')).toHaveTextContent('pendente');

    await userEvent.type(screen.getByLabelText('Senha'), 'Segredo');

    expect(item('8 caracteres')).toHaveTextContent('pendente');
    expect(item('1 letra maiúscula')).toHaveTextContent('atendido');
    expect(item('1 caractere especial')).toHaveTextContent('pendente');
    expect(item('Sem espaços')).toHaveTextContent('atendido');
  });

  /** Continuar valida e-mail, requisitos e confirmação. */
  it('valida a conta', async () => {
    abrirCriarConta();

    await preencherConta({ email: 'novo@vers', senha: 'fraca', confirmacao: 'outra' });
    await continuar();

    expect(screen.getByText('Informe um e-mail válido.')).toBeInTheDocument();
    expect(screen.getByText('A senha não atende a todos os requisitos.')).toBeInTheDocument();
    expect(screen.getByText('As senhas não coincidem.')).toBeInTheDocument();
    expect(etapaAtual()).toHaveTextContent('Conta');
  });
});

describe('CriarContaPage — fluxo completo', () => {
  /** Conta → Veículo → Instalação → confirmação, voltando sem perder dados. */
  it('cria a conta em três etapas', async () => {
    const registrar = vi.fn().mockResolvedValue(undefined);
    abrirCriarConta({ ...criarRepositorioMock(), registrar });

    await preencherConta();
    await continuar();

    expect(screen.getByRole('heading', { level: 2, name: 'Seu veículo' })).toBeInTheDocument();
    expect(etapaAtual()).toHaveTextContent('Veículo');
    await userEvent.type(screen.getByLabelText('Placa'), 'abc');
    await continuar();
    expect(screen.getByText('Informe uma placa válida, como ABC1D23.')).toBeInTheDocument();

    await userEvent.clear(screen.getByLabelText('Placa'));
    await userEvent.type(screen.getByLabelText('Placa'), 'abc-1d23');
    await userEvent.type(screen.getByLabelText('Modelo'), 'CG 160');
    await continuar();

    expect(screen.getByRole('heading', { level: 2, name: 'Instalação' })).toBeInTheDocument();
    const resumo = screen.getByRole('list', { name: 'Resumo do cadastro' });
    expect(resumo).toHaveTextContent('novo@vers.com');
    expect(resumo).toHaveTextContent('ABC1D23');

    await userEvent.click(screen.getByRole('button', { name: 'Voltar' }));
    expect(screen.getByLabelText('Placa')).toHaveValue('abc-1d23');
    await continuar();

    await userEvent.click(screen.getByRole('button', { name: 'Criar conta' }));

    expect(
      await screen.findByRole('heading', { level: 2, name: 'Confirme seu e-mail' }),
    ).toBeInTheDocument();
    expect(registrar).toHaveBeenCalledWith({
      email: 'novo@vers.com',
      senha: 'Segredo!1',
      nome: 'Novo Pesquisador',
    });
    expect(screen.getByText(/Se o e-mail novo@vers.com puder ser usado/)).toBeInTheDocument();
    expect(screen.getByText(/ABC1D23/)).toHaveTextContent(
      'fica guardado neste computador e é cadastrado no seu primeiro acesso',
    );
    // O veículo fica guardado (sem a senha) até o primeiro login.
    expect(lerVeiculoDoCadastro('novo@vers.com')).toEqual({
      placa: 'ABC1D23',
      fabricante: '',
      modelo: 'CG 160',
      ano: '',
    });

    await userEvent.click(screen.getByRole('link', { name: 'Ir para o Login' }));
    expect(
      screen.getByRole('heading', { level: 1, name: 'Bem-vindo de volta' }),
    ).toBeInTheDocument();
  });

  /** Se o backend recusar, a etapa final mostra o erro e permite tentar de novo. */
  it('mostra a recusa do cadastro', async () => {
    abrirCriarConta({
      ...criarRepositorioMock(),
      registrar: vi.fn().mockRejectedValue(new ErroRepositorio('indisponivel', 'fora')),
    });

    await preencherConta();
    await continuar();
    await userEvent.type(screen.getByLabelText('Placa'), 'ABC1D23');
    await continuar();
    await userEvent.click(screen.getByRole('button', { name: 'Criar conta' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível criar a conta agora. Tente de novo em instantes.',
    );
    expect(screen.getByRole('button', { name: 'Criar conta' })).toBeEnabled();
    expect(lerVeiculoDoCadastro('novo@vers.com')).toBeNull();
  });
});
