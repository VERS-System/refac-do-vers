/**
 * Testes da busca geral da barra superior (Fase 5, lote 9).
 *
 * Abre pelo botão ou por Ctrl+K em todas as telas internas; procura telas,
 * seções das Configurações, testes e veículos; setas percorrem a lista e
 * Enter ou clique abrem o item na tela certa.
 * Plano: `.AIs/docs/plans/desktop-frontend-fase-5.md`.
 */

import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '@/App';

/** Abre o app numa rota do HashRouter. */
function abrirEm(rota: string) {
  window.location.hash = rota;
  render(<App />);
}

/** Abre a busca por Ctrl+K e digita o termo. */
async function buscarPor(termo: string) {
  await userEvent.keyboard('{Control>}k{/Control}');
  const dialogo = await screen.findByRole('dialog', { name: 'Buscar no VERS' });
  const campo = within(dialogo).getByRole('combobox', { name: 'Buscar' });
  expect(campo).toHaveFocus();
  await userEvent.type(campo, termo);
  return dialogo;
}

describe('BuscaGlobal', () => {
  /** O botão fica na barra de todas as telas internas, uma vez só; no Login, não. */
  it('aparece nas telas internas', async () => {
    abrirEm('/testes');
    expect(await screen.findAllByRole('button', { name: 'Buscar (Ctrl+K)' })).toHaveLength(1);
  });

  /** Fora do shell (Login) não há busca. */
  it('não aparece no Login', () => {
    abrirEm('/login');
    expect(screen.queryByRole('button', { name: 'Buscar (Ctrl+K)' })).not.toBeInTheDocument();
  });

  /** Ctrl+K abre; Enter vai para a primeira tela encontrada. */
  it('vai para uma tela', async () => {
    abrirEm('/visao-geral');

    const dialogo = await buscarPor('energ');
    expect(within(dialogo).getAllByRole('option')[0]).toHaveTextContent('Energia');
    await userEvent.keyboard('{Enter}');

    expect(await screen.findByRole('heading', { level: 1, name: 'Energia' })).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  /** Um teste abre no histórico, na página dele, com a linha destacada. */
  it('abre um teste no histórico', async () => {
    abrirEm('/visao-geral');

    const dialogo = await buscarPor('#010');
    const opcao = await within(dialogo).findByRole('option', { name: /Teste #010/ });
    // O detalhe traz o terreno e a data do teste ("Cidade · 26/09").
    expect(opcao).toHaveTextContent(/· \d{2}\/\d{2}/);
    await userEvent.click(opcao);

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Testes de campo' }),
    ).toBeInTheDocument();
    const tabela = await screen.findByRole('table', { name: 'Histórico de testes' });
    const linha = (await within(tabela).findByText('#010')).closest('tr');
    expect(linha).toHaveAttribute('aria-current', 'true');
  });

  /** Um veículo abre com os detalhes dele na tela Veículos. */
  it('abre um veículo', async () => {
    abrirEm('/visao-geral');

    const dialogo = await buscarPor('def4');
    expect(
      await within(dialogo).findByRole('option', { name: /Fiat Strada 2024/ }),
    ).toBeInTheDocument();
    await userEvent.keyboard('{Enter}');

    const detalhes = await screen.findByRole('region', { name: 'Detalhes do veículo' });
    expect(await within(detalhes).findByText('DEF4G56')).toBeInTheDocument();
  });

  /** Uma seção das Configurações abre já marcada no painel. */
  it('abre uma seção das Configurações', async () => {
    abrirEm('/visao-geral');

    await buscarPor('tarifa');
    await userEvent.keyboard('{Enter}');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Configurações' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tarifa de energia' })).toHaveAttribute(
      'aria-current',
      'true',
    );
  });

  /** Setas mudam a opção ativa; termo sem resultado avisa. */
  it('percorre a lista e avisa quando não acha', async () => {
    abrirEm('/visao-geral');

    const dialogo = await buscarPor('t');
    const campo = within(dialogo).getByRole('combobox', { name: 'Buscar' });
    const [primeira, segunda] = within(dialogo).getAllByRole('option');
    expect(campo).toHaveAttribute('aria-activedescendant', primeira.id);
    expect(primeira).toHaveAttribute('aria-selected', 'true');

    await userEvent.keyboard('{ArrowDown}');
    expect(campo).toHaveAttribute('aria-activedescendant', segunda.id);
    await userEvent.keyboard('{ArrowUp}');
    expect(campo).toHaveAttribute('aria-activedescendant', primeira.id);

    await userEvent.type(campo, 'xyzw');
    expect(within(dialogo).getByText('Nenhum resultado para “txyzw”.')).toBeInTheDocument();
  });
});
