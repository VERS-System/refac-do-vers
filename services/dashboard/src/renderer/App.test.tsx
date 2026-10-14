/**
 * Testes do componente raiz do app desktop.
 *
 * Garantem a infraestrutura de rotas e o shell: o app abre na Visão geral,
 * cada rota mostra a tela certa, a sidebar navega entre as telas internas e
 * as telas de autenticação ficam fora do shell.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';

/** Abre o app numa rota do HashRouter. */
function abrirEm(rota: string) {
  window.location.hash = rota;
  render(<App />);
}

describe('App', () => {
  beforeEach(() => {
    window.location.hash = '';
  });

  /** Ao abrir sem rota, o app deve redirecionar para a Visão geral. */
  it('abre na tela Visão geral', () => {
    render(<App />);

    expect(screen.getByRole('heading', { level: 1, name: 'Visão geral' })).toBeInTheDocument();
    expect(window.location.hash).toBe('#/visao-geral');
  });

  /** Cada rota interna mostra o título da sua tela, dentro do shell. */
  it.each([
    ['/visao-geral', 'Visão geral'],
    ['/telemetria', 'Telemetria'],
    ['/energia', 'Energia'],
    ['/testes', 'Testes de campo'],
    ['/veiculo-instalacao', 'Veículo e instalação'],
    ['/viber-ia', 'Viber'],
    ['/configuracoes', 'Configurações'],
  ])('a rota %s mostra a tela %s no shell', (rota, titulo) => {
    abrirEm(rota);

    expect(screen.getByRole('heading', { level: 1, name: titulo })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Navegação principal' })).toBeInTheDocument();
  });

  /** As telas de autenticação não mostram a sidebar. */
  it.each([
    ['/login', 'Bem-vindo de volta'],
    ['/criar-conta', 'Que bom ter você aqui'],
  ])('a rota %s mostra %s fora do shell', (rota, titulo) => {
    abrirEm(rota);

    expect(screen.getByRole('heading', { level: 1, name: titulo })).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Navegação principal' })).not.toBeInTheDocument();
  });

  /** Rotas desconhecidas voltam para a Visão geral. */
  it('redireciona rotas desconhecidas para a Visão geral', () => {
    abrirEm('/nao-existe');

    expect(screen.getByRole('heading', { level: 1, name: 'Visão geral' })).toBeInTheDocument();
  });

  /** Clicar num item da sidebar troca a tela e o item ativo. */
  it('navega pela sidebar e destaca o item ativo', async () => {
    render(<App />);

    await userEvent.click(screen.getByRole('link', { name: 'Telemetria' }));

    expect(screen.getByRole('heading', { level: 1, name: 'Telemetria' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Telemetria' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Visão geral' })).not.toHaveAttribute('aria-current');
    expect(window.location.hash).toBe('#/telemetria');
  });

  /** Sair leva ao Login; Entrar volta para a Visão geral. */
  it('sai para o Login e entra de volta', async () => {
    render(<App />);

    await userEvent.click(screen.getByRole('button', { name: 'Sair' }));
    expect(screen.getByRole('heading', { level: 1, name: 'Bem-vindo de volta' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));
    expect(screen.getByRole('heading', { level: 1, name: 'Visão geral' })).toBeInTheDocument();
  });

  /** Do Login dá para ir ao Criar conta e voltar. */
  it('alterna entre Login e Criar conta', async () => {
    abrirEm('/login');

    await userEvent.click(screen.getByRole('link', { name: 'Criar conta' }));
    expect(screen.getByRole('heading', { level: 1, name: 'Que bom ter você aqui' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('link', { name: 'Entrar' }));
    expect(screen.getByRole('heading', { level: 1, name: 'Bem-vindo de volta' })).toBeInTheDocument();
  });

  /** O shell e a Visão geral leem usuário, ESP32 e veículo do repositório de exemplo. */
  it('mostra os dados de exemplo do repositório no shell', async () => {
    render(<App />);

    expect(await screen.findByText('Ana Silva')).toBeInTheDocument();
    expect(await screen.findByText('Honda Civic 2026 · ABC1D23')).toBeInTheDocument();
    expect(await screen.findByRole('region', { name: 'ESP32 · VERS-01' })).toBeInTheDocument();
  });
});
