/**
 * Testes da tela Configurações.
 *
 * Seguem o plano `.AIs/docs/plans/desktop-frontend-configuracoes.md`: as
 * mudanças ficam num rascunho até "Salvar alterações"; as preferências valem
 * no app todo (unidades, reduzir movimento, tarifa na Energia), por isso os
 * testes renderizam o app inteiro e navegam até as outras telas.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '@/App';
import { usePeriodoStore } from '@/stores/periodo';

/** Abre o app na tela Configurações. */
function abrirConfiguracoes() {
  window.location.hash = '#/configuracoes';
  render(<App />);
}

const secao = (nome: string) => screen.findByRole('region', { name: nome });
const salvar = () => screen.getByRole('button', { name: 'Salvar alterações' });

/** Vai para outra tela pelo menu lateral. */
async function irPara(tela: string) {
  const menu = screen.getByRole('navigation', { name: 'Navegação principal' });
  await userEvent.click(within(menu).getByRole('link', { name: tela }));
}

describe('ConfiguracoesPage — rascunho e perfil', () => {
  beforeEach(() => {
    usePeriodoStore.getState().setPeriodo('dia');
  });

  /** Sem mudanças, nada para salvar ou descartar. */
  it('começa sem mudanças', async () => {
    abrirConfiguracoes();

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Configurações' }),
    ).toBeInTheDocument();
    expect(salvar()).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Descartar' })).toBeDisabled();
  });

  /** Perfil do contrato: nome editável; e-mail e função só leitura. */
  it('mostra o perfil', async () => {
    abrirConfiguracoes();

    const perfil = await secao('Perfil');
    expect(await within(perfil).findByLabelText('Nome completo')).toHaveValue('Ana Silva');
    expect(within(perfil).getByLabelText('E-mail')).toHaveAttribute('readonly');
    expect(within(perfil).getByLabelText('E-mail')).toHaveValue('ana.silva@vers.com');
    expect(within(perfil).getByText('Verificado')).toBeInTheDocument();
    expect(within(perfil).getByLabelText('Função')).toHaveValue('Administradora');
    expect(perfil).toHaveTextContent('ID: USR-88192-BR');
  });

  /** Salvar o nome atualiza a sidebar; descartar volta ao salvo. */
  it('salva e descarta o nome', async () => {
    abrirConfiguracoes();
    const nome = await within(await secao('Perfil')).findByLabelText('Nome completo');

    await userEvent.clear(nome);
    await userEvent.type(nome, 'Ana S. Silva');
    expect(salvar()).toBeEnabled();
    await userEvent.click(screen.getByRole('button', { name: 'Descartar' }));
    expect(nome).toHaveValue('Ana Silva');

    await userEvent.clear(nome);
    await userEvent.type(nome, 'Ana S. Silva');
    await userEvent.click(salvar());

    expect(await screen.findByText('Alterações salvas.')).toBeInTheDocument();
    const sidebar = screen.getByRole('complementary');
    expect(await within(sidebar).findByText('Ana S. Silva')).toBeInTheDocument();
  });

  /** Foto PNG ou JPG de até 2 MB; outra coisa mostra o erro. */
  it('troca a foto', async () => {
    Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:foto'), revokeObjectURL: vi.fn() });
    abrirConfiguracoes();
    const perfil = await secao('Perfil');
    const campo = await within(perfil).findByLabelText('Trocar foto');

    // Sem filtrar pelo `accept`, para exercitar a validação da própria tela.
    const usuario = userEvent.setup({ applyAccept: false });
    await usuario.upload(campo, new File(['x'.repeat(10)], 'foto.gif', { type: 'image/gif' }));
    expect(within(perfil).getByText('Use PNG ou JPG de até 2 MB.')).toBeInTheDocument();

    await usuario.upload(campo, new File(['x'.repeat(10)], 'foto.png', { type: 'image/png' }));
    expect(within(perfil).getByRole('img', { name: 'Ana Silva' })).toHaveAttribute(
      'src',
      'blob:foto',
    );
    expect(salvar()).toBeEnabled();
  });
});

describe('ConfiguracoesPage — preferências no app todo', () => {
  beforeEach(() => {
    usePeriodoStore.getState().setPeriodo('dia');
  });

  afterEach(() => {
    delete document.documentElement.dataset.reduzirMovimento;
  });

  /** Potência em W vale na Visão geral depois de salvar. */
  it('aplica as unidades nas outras telas', async () => {
    abrirConfiguracoes();
    const unidades = await secao('Unidades e exibição');

    await userEvent.click(within(unidades).getByRole('radio', { name: 'W' }));
    await userEvent.click(salvar());
    await irPara('Visão geral');

    const potencia = await screen.findByRole('region', { name: 'Potência instantânea' });
    expect(await within(potencia).findByText('0,212')).toBeInTheDocument();
    expect(within(potencia).getByText('W')).toBeInTheDocument();
  });

  /** "Reduzir movimento" marca a página para desligar as animações. */
  it('reduz o movimento', async () => {
    abrirConfiguracoes();
    const unidades = await secao('Unidades e exibição');

    await userEvent.click(within(unidades).getByRole('switch', { name: 'Reduzir movimento' }));
    await userEvent.click(salvar());

    await waitFor(() => expect(document.documentElement.dataset.reduzirMovimento).toBe('true'));
  });

  /** A tarifa destrava a estimativa de economia da Energia. */
  it('cadastra a tarifa', async () => {
    usePeriodoStore.getState().setPeriodo('semana');
    abrirConfiguracoes();
    const tarifa = await secao('Tarifa de energia');

    await userEvent.type(within(tarifa).getByLabelText('Tarifa (R$/kWh)'), 'abc');
    await userEvent.click(salvar());
    expect(within(tarifa).getByText('Informe um valor positivo, como 0,95.')).toBeInTheDocument();

    await userEvent.clear(within(tarifa).getByLabelText('Tarifa (R$/kWh)'));
    await userEvent.type(within(tarifa).getByLabelText('Tarifa (R$/kWh)'), '0,95');
    await userEvent.click(salvar());
    await irPara('Energia');

    const economia = await screen.findByRole('region', { name: 'Estimativa de economia' });
    expect(await within(economia).findByText(/R\$ 0,0018/)).toBeInTheDocument();
  });

  /** Alertas: ligar o resumo diário atualiza a contagem. */
  it('liga e desliga alertas', async () => {
    abrirConfiguracoes();
    const alertas = await secao('Alertas');
    expect(alertas).toHaveTextContent('3 ativos · 1 inativo');

    await userEvent.click(
      within(alertas).getByRole('switch', { name: 'Resumo diário por e-mail' }),
    );

    expect(alertas).toHaveTextContent('4 ativos · 0 inativos');
    expect(salvar()).toBeEnabled();
  });
});

describe('ConfiguracoesPage — sessões e sobre', () => {
  /** Encerrar todas as sessões pede confirmação e leva ao Login. */
  it('encerra as sessões', async () => {
    abrirConfiguracoes();

    await userEvent.click(
      within(await secao('Sessões e segurança')).getByRole('button', {
        name: 'Encerrar todas as sessões',
      }),
    );
    const dialogo = screen.getByRole('dialog', { name: 'Encerrar todas as sessões?' });
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Encerrar sessões' }));

    expect(await screen.findByRole('heading', { name: 'Bem-vindo de volta' })).toBeInTheDocument();
  });

  /** Sobre: versão do app e firmware do ESP32. */
  it('mostra a versão', async () => {
    abrirConfiguracoes();

    const sobre = await secao('Sobre o VERS');
    expect(sobre).toHaveTextContent('v0.4');
    expect(await within(sobre).findByText('0.4.2')).toBeInTheDocument();
  });

  /** O painel de ajustes marca a seção escolhida. */
  it('navega pelas seções', async () => {
    abrirConfiguracoes();
    const painel = screen.getByRole('navigation', { name: 'Painel de ajustes' });

    await userEvent.click(within(painel).getByRole('button', { name: 'Alertas' }));

    expect(within(painel).getByRole('button', { name: 'Alertas' })).toHaveAttribute(
      'aria-current',
      'true',
    );
  });
});
