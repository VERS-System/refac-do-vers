/**
 * Testes da tela Login.
 *
 * Seguem o plano `.AIs/docs/plans/desktop-frontend-autenticacao.md`:
 * validação no envio, mostrar senha, estado de envio e as recusas do backend
 * (simuladas trocando o `entrar` do repositório de exemplo). Depois de
 * entrar, o veículo guardado pelo Criar conta leva ao Primeiro veículo
 * (`desktop-frontend-veiculo-no-cadastro.md`).
 */

import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '@/App';
import { ErroRepositorio, type CodigoErro } from '@/data/erros';
import type { RepositorioVers } from '@/data/repositorio';
import { criarRepositorioMock } from '@/data/repositorioMock';
import { guardarVeiculoDoCadastro } from '@/data/veiculoDoCadastro';

/** Abre o app no Login, com o repositório de exemplo ou um alterado. */
function abrirLogin(repositorio?: RepositorioVers) {
  window.location.hash = '#/login';
  render(<App repositorio={repositorio} />);
}

/** Repositório de exemplo cujo `entrar` é recusado com o código dado. */
function recusandoCom(codigo: CodigoErro): RepositorioVers {
  return {
    ...criarRepositorioMock(),
    entrar: vi.fn().mockRejectedValue(new ErroRepositorio(codigo, 'recusado')),
  };
}

/** Preenche e-mail e senha e envia. */
async function entrar(email = 'ana.silva@vers.com', senha = 'Segredo!1') {
  await userEvent.type(screen.getByLabelText('E-mail'), email);
  await userEvent.type(screen.getByLabelText('Senha'), senha);
  await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));
}

describe('LoginPage — formulário', () => {
  /** Campos com autofill do sistema e sem login social (D02). */
  it('mostra o formulário', () => {
    abrirLogin();

    expect(screen.getByRole('heading', { level: 2, name: 'Entrar' })).toBeInTheDocument();
    expect(screen.getByLabelText('E-mail')).toHaveAttribute('autocomplete', 'email');
    expect(screen.getByLabelText('Senha')).toHaveAttribute('autocomplete', 'current-password');
    expect(screen.queryByRole('button', { name: /Google/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Apple/ })).not.toBeInTheDocument();
  });

  /** Envio vazio mostra os erros e foca o primeiro campo inválido. */
  it('valida antes de enviar', async () => {
    abrirLogin();

    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(screen.getByText('Informe um e-mail válido.')).toBeInTheDocument();
    expect(screen.getByText('Informe a senha.')).toBeInTheDocument();
    expect(screen.getByLabelText('E-mail')).toHaveFocus();
    expect(screen.getByLabelText('E-mail')).toHaveAttribute('aria-invalid', 'true');
  });

  /** "Mostrar senha" alterna o tipo do campo. */
  it('mostra e oculta a senha', async () => {
    abrirLogin();
    const senha = screen.getByLabelText('Senha');
    expect(senha).toHaveAttribute('type', 'password');

    await userEvent.click(screen.getByRole('button', { name: 'Mostrar senha' }));

    expect(senha).toHaveAttribute('type', 'text');
    expect(screen.getByRole('button', { name: 'Mostrar senha' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  /** Recuperação de senha ainda sem fluxo: avisa em vez de navegar. */
  it('avisa sobre a recuperação de senha', async () => {
    abrirLogin();

    await userEvent.click(screen.getByRole('button', { name: 'Esqueci a senha' }));

    expect(screen.getByText('Recuperação de senha disponível com a API.')).toBeInTheDocument();
  });
});

describe('LoginPage — envio', () => {
  /** Credenciais válidas levam à Visão geral. */
  it('entra no app', async () => {
    abrirLogin();

    await entrar();

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Visão geral' }),
    ).toBeInTheDocument();
  });

  /** Com veículo guardado pelo Criar conta para o e-mail, o primeiro acesso pede o carro. */
  it('leva ao cadastro do veículo guardado', async () => {
    guardarVeiculoDoCadastro('Ana.Silva@vers.com', {
      placa: 'GHI2J34',
      fabricante: '',
      modelo: '',
      ano: '',
    });
    abrirLogin();

    await entrar('ana.silva@vers.com');

    expect(
      await screen.findByRole('heading', { level: 2, name: 'Cadastre seu veículo' }),
    ).toBeInTheDocument();
  });

  /** Veículo guardado para outro e-mail não muda o caminho. */
  it('ignora o veículo guardado de outra conta', async () => {
    guardarVeiculoDoCadastro('outro@vers.com', {
      placa: 'GHI2J34',
      fabricante: '',
      modelo: '',
      ano: '',
    });
    abrirLogin();

    await entrar('ana.silva@vers.com');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Visão geral' }),
    ).toBeInTheDocument();
  });

  /** Enquanto o backend responde, o botão fica "Entrando…" e desativado. */
  it('mostra o envio em andamento', async () => {
    abrirLogin({ ...criarRepositorioMock(), entrar: () => new Promise(() => {}) });

    await entrar();

    expect(screen.getByRole('button', { name: 'Entrando…' })).toBeDisabled();
  });

  /** Cada recusa do backend tem a sua mensagem, sem dizer se a conta existe. */
  it.each([
    ['credenciais-invalidas', 'E-mail ou senha incorretos.'],
    ['limite-tentativas', 'Muitas tentativas. Aguarde alguns minutos e tente de novo.'],
    ['indisponivel', 'Não foi possível entrar agora. Tente de novo em instantes.'],
  ] as const)('trata a recusa %s', async (codigo, mensagem) => {
    abrirLogin(recusandoCom(codigo));

    await entrar();

    expect(await screen.findByRole('alert')).toHaveTextContent(mensagem);
    expect(
      screen.getByRole('heading', { level: 1, name: 'Bem-vindo de volta' }),
    ).toBeInTheDocument();
  });

  /** Depois de encerrar as sessões nas Configurações, o Login avisa. */
  it('avisa que as sessões foram encerradas', async () => {
    window.location.hash = '#/configuracoes';
    render(<App />);

    const sessoes = await screen.findByRole('region', { name: 'Sessões e segurança' });
    await userEvent.click(
      within(sessoes).getByRole('button', { name: 'Encerrar todas as sessões' }),
    );
    await userEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Encerrar sessões' }),
    );

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Todas as sessões foram encerradas. Entre de novo.',
    );
  });
});
