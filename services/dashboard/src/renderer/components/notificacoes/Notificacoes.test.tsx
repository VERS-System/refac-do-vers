/**
 * Testes do sino de notificações da barra superior (Fase 5, lote 10).
 *
 * O sino fica em todas as telas internas, com o número de não lidas no nome;
 * o painel mostra os alertas disparados (ou "Nenhum alerta disparado") e os
 * eventos recentes; "Marcar como lidas" apaga o ponto em todas as telas.
 * Plano: `.AIs/docs/plans/desktop-frontend-fase-5.md`.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '@/App';
import { VIBRACAO_EXEMPLO } from '@/data/fixtures/sistema';
import type { RepositorioVers } from '@/data/repositorio';
import { criarRepositorioMock } from '@/data/repositorioMock';
import { useNotificacoesLidas } from './Notificacoes';

/** Abre o app numa rota, com o repositório de exemplo ou um alterado. */
function abrirEm(rota: string, repositorio?: RepositorioVers) {
  window.location.hash = rota;
  render(<App repositorio={repositorio} />);
}

const sino = () => screen.findByRole('button', { name: /^Notificações/ });

beforeEach(() => {
  useNotificacoesLidas.setState({ lidas: [] });
});

describe('Notificacoes', () => {
  /** Com os dados de exemplo: sem alertas disparados, com eventos não lidos. */
  it('mostra os eventos e nenhum alerta', async () => {
    abrirEm('/telemetria');
    const botao = await sino();
    await screen.findByRole('button', { name: /não lidas$/ });

    await userEvent.click(botao);

    const painel = screen.getByRole('dialog', { name: 'Notificações' });
    expect(painel).not.toHaveAttribute('aria-modal');
    expect(within(painel).getByText('Nenhum alerta disparado.')).toBeInTheDocument();
    const recentes = within(painel).getByRole('list', { name: 'Recentes' });
    expect(within(recentes).getByText('ESP32 · VERS-01 online')).toBeInTheDocument();
    expect(within(recentes).getAllByRole('listitem').length).toBeGreaterThan(1);
    // Cada evento mostra dia e hora ("04/10 18:05").
    for (const item of within(recentes).getAllByRole('listitem')) {
      expect(item).toHaveTextContent(/\d{2}\/\d{2} \d{2}:\d{2}/);
    }
  });

  /** Esc fecha o painel e devolve o foco ao sino. */
  it('fecha com Esc', async () => {
    abrirEm('/visao-geral');
    await userEvent.click(await sino());

    await userEvent.keyboard('{Escape}');

    expect(screen.queryByRole('dialog', { name: 'Notificações' })).not.toBeInTheDocument();
    expect(await sino()).toHaveFocus();
  });

  /** "Marcar como lidas" apaga o aviso de não lidas, também nas outras telas. */
  it('marca como lidas', async () => {
    abrirEm('/visao-geral');
    await screen.findByRole('button', { name: /não lidas$/ });
    await userEvent.click(await sino());

    await userEvent.click(screen.getByRole('button', { name: 'Marcar como lidas' }));
    expect(await screen.findByRole('button', { name: 'Notificações' })).toBeInTheDocument();

    await userEvent.keyboard('{Escape}');
    await userEvent.click(screen.getByRole('link', { name: 'Energia' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Energia' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Notificações' })).toBeInTheDocument();
  });

  /** Um alerta ativo dispara quando o dado passa do limite. */
  it('mostra o alerta disparado', async () => {
    const repositorio: RepositorioVers = {
      ...criarRepositorioMock(),
      obterVibracao: async () => ({ ...VIBRACAO_EXEMPLO, temperaturaBlocoC: 63 }),
    };
    abrirEm('/visao-geral', repositorio);
    await userEvent.click(await sino());

    const painel = screen.getByRole('dialog', { name: 'Notificações' });
    const alertas = await within(painel).findByRole('list', { name: 'Alertas disparados' });
    expect(within(alertas).getByText('Temperatura acima de 60 °C')).toBeInTheDocument();
    expect(within(alertas).getByText('Bloco dos piezos a 63,0 °C.')).toBeInTheDocument();
  });

  /** No Login não há sino. */
  it('não aparece no Login', () => {
    abrirEm('/login');
    expect(screen.queryByRole('button', { name: /^Notificações/ })).not.toBeInTheDocument();
  });
});
