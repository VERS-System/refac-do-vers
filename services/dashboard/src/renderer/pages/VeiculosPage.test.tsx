/**
 * Testes da tela Veículos (cadastro de carros).
 *
 * Seguem o plano `.AIs/docs/plans/desktop-frontend-veiculos.md`: lista com
 * o principal, detalhes com o ID gerado pelo sistema, cadastro com chassi
 * opcional, edição (placa fixa, chassi preenchível uma vez), troca do
 * principal e remoção com substituição.
 */

import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '@/App';

/** Formato do ID gerado pelo sistema. */
const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/;

/** Abre o app na tela Veículos. */
function abrirVeiculos() {
  window.location.hash = '#/veiculos';
  render(<App />);
}

/** Linhas de dados da lista "Seus veículos". */
async function linhas() {
  const tabela = await screen.findByRole('table', { name: 'Seus veículos' });
  return within(tabela).getAllByRole('row').slice(1);
}

const detalhes = () => screen.findByRole('region', { name: 'Detalhes do veículo' });

/** Abre os detalhes de um veículo pela lista. */
async function verVeiculo(nome: string) {
  await userEvent.click(await screen.findByRole('button', { name: `Ver ${nome}` }));
}

/** Cadastra um veículo pelo formulário "Novo veículo". */
async function cadastrar(placa: string, extra: { fabricante?: string; modelo?: string } = {}) {
  await userEvent.click(screen.getByRole('button', { name: 'Novo veículo' }));
  const formulario = await screen.findByRole('region', { name: 'Novo veículo' });
  await userEvent.type(within(formulario).getByLabelText('Placa'), placa);
  if (extra.fabricante) {
    await userEvent.type(within(formulario).getByLabelText('Fabricante'), extra.fabricante);
  }
  if (extra.modelo) await userEvent.type(within(formulario).getByLabelText('Modelo'), extra.modelo);
  await userEvent.click(within(formulario).getByRole('button', { name: 'Salvar veículo' }));
}

describe('VeiculosPage — lista e detalhes', () => {
  /** Lista os carros com o principal marcado; o item da sidebar fica ativo. */
  it('lista os veículos', async () => {
    abrirVeiculos();

    expect(screen.getByRole('heading', { level: 1, name: 'Veículos' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Veículos' })).toHaveAttribute('aria-current', 'page');
    const [civic, strada] = await linhas();
    expect(civic).toHaveTextContent('Honda Civic 2026');
    expect(civic).toHaveTextContent('ABC1D23');
    expect(civic).toHaveTextContent('Principal');
    expect(strada).toHaveTextContent('DEF4G56');
    expect(strada).not.toHaveTextContent('Principal');
  });

  /** Começa no principal; o ID completo pode ser copiado. */
  it('mostra os detalhes com o ID', async () => {
    const escrever = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: escrever },
      configurable: true,
    });
    abrirVeiculos();

    const painel = await detalhes();
    expect(await within(painel).findByText('ABC1D23')).toBeInTheDocument();
    const id = within(painel).getByText(UUID).textContent ?? '';
    expect(id).toMatch(UUID);
    expect(painel).toHaveTextContent('VERS-PZ01');

    await userEvent.click(within(painel).getByRole('button', { name: 'Copiar ID' }));
    expect(escrever).toHaveBeenCalledWith(id);
    expect(await within(painel).findByText('ID copiado.')).toBeInTheDocument();

    await verVeiculo('Fiat Strada 2024');
    expect(await within(await detalhes()).findByText('DEF4G56')).toBeInTheDocument();
  });
});

describe('VeiculosPage — cadastro', () => {
  /** Valida placa e chassi antes de enviar. */
  it('valida o novo veículo', async () => {
    abrirVeiculos();
    await userEvent.click(await screen.findByRole('button', { name: 'Novo veículo' }));
    const formulario = await screen.findByRole('region', { name: 'Novo veículo' });

    await userEvent.type(within(formulario).getByLabelText('Placa'), 'abc');
    await userEvent.type(within(formulario).getByLabelText('Chassi (opcional)'), 'xyz');
    await userEvent.click(within(formulario).getByRole('button', { name: 'Salvar veículo' }));

    expect(
      within(formulario).getByText('Informe uma placa válida, como ABC1D23.'),
    ).toBeInTheDocument();
    expect(
      within(formulario).getByText('O chassi tem 17 letras e números, sem I, O e Q.'),
    ).toBeInTheDocument();
  });

  /** Cadastra com chassi; o novo fica selecionado e mostra o ID gerado. */
  it('cadastra um veículo', async () => {
    abrirVeiculos();
    await userEvent.click(await screen.findByRole('button', { name: 'Novo veículo' }));
    const formulario = await screen.findByRole('region', { name: 'Novo veículo' });

    await userEvent.type(within(formulario).getByLabelText('Placa'), 'ghi-2j34');
    await userEvent.type(
      within(formulario).getByLabelText('Chassi (opcional)'),
      '9bwzzz377vt004251',
    );
    await userEvent.type(within(formulario).getByLabelText('Fabricante'), 'Volkswagen');
    await userEvent.type(within(formulario).getByLabelText('Modelo'), 'Polo');
    await userEvent.type(within(formulario).getByLabelText('Ano'), '2023');
    await userEvent.click(within(formulario).getByRole('button', { name: 'Salvar veículo' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Veículo cadastrado.');
    const painel = await detalhes();
    expect(painel).toHaveTextContent('GHI2J34');
    expect(painel).toHaveTextContent('9BWZZZ377VT004251');
    expect(painel).toHaveTextContent(UUID);
    expect(await linhas()).toHaveLength(3);
  });

  /** Placa já cadastrada é recusada pelo repositório e o erro aparece no formulário. */
  it('recusa placa repetida', async () => {
    abrirVeiculos();

    await cadastrar('abc-1d23');

    const formulario = screen.getByRole('region', { name: 'Novo veículo' });
    expect(await within(formulario).findByRole('alert')).toHaveTextContent(
      'Já existe um veículo com a placa ABC1D23.',
    );
  });
});

describe('VeiculosPage — edição, principal e remoção', () => {
  /** Placa fixa; o chassi vazio pode ser preenchido uma vez. */
  it('edita o veículo', async () => {
    abrirVeiculos();
    await verVeiculo('Fiat Strada 2024');

    await userEvent.click(within(await detalhes()).getByRole('button', { name: 'Editar' }));
    const formulario = screen.getByRole('region', { name: 'Editar veículo' });
    expect(within(formulario).queryByLabelText('Placa')).not.toBeInTheDocument();
    await userEvent.type(
      within(formulario).getByLabelText('Chassi (opcional)'),
      '9BD17164G55123456',
    );
    await userEvent.clear(within(formulario).getByLabelText('Ano'));
    await userEvent.type(within(formulario).getByLabelText('Ano'), '2025');
    await userEvent.click(within(formulario).getByRole('button', { name: 'Salvar alterações' }));

    const painel = await detalhes();
    expect(await within(painel).findByText('9BD17164G55123456')).toBeInTheDocument();
    expect(painel).toHaveTextContent('2025');

    await userEvent.click(within(painel).getByRole('button', { name: 'Editar' }));
    const deNovo = screen.getByRole('region', { name: 'Editar veículo' });
    expect(within(deNovo).queryByLabelText('Chassi (opcional)')).not.toBeInTheDocument();
    expect(deNovo).toHaveTextContent('O chassi não muda depois de informado.');
  });

  /** Tornar principal pede confirmação e move o selo na lista. */
  it('troca o veículo principal', async () => {
    abrirVeiculos();
    await verVeiculo('Fiat Strada 2024');

    await userEvent.click(
      within(await detalhes()).getByRole('button', { name: 'Tornar principal' }),
    );
    await userEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Tornar principal' }),
    );

    const [civic, strada] = await linhas();
    expect(await within(strada).findByText('Principal')).toBeInTheDocument();
    expect(civic).not.toHaveTextContent('Principal');
  });

  /** Remover um carro comum pede confirmação e o tira da lista. */
  it('remove um veículo', async () => {
    abrirVeiculos();
    await verVeiculo('Fiat Strada 2024');

    await userEvent.click(within(await detalhes()).getByRole('button', { name: 'Remover' }));
    const dialogo = screen.getByRole('dialog', { name: 'Remover Fiat Strada 2024?' });
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Remover veículo' }));

    expect(await screen.findByText('Veículo removido.')).toBeInTheDocument();
    expect(await linhas()).toHaveLength(1);
  });

  /** O principal só sai escolhendo quem o substitui, quando sobram dois ou mais. */
  it('remove o principal com substituto', async () => {
    abrirVeiculos();
    await cadastrar('GHI2J34', { fabricante: 'Volkswagen', modelo: 'Polo' });
    await screen.findByText('Veículo cadastrado.');
    await userEvent.click(
      within(await detalhes()).getByRole('button', { name: 'Tornar principal' }),
    );
    await userEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Tornar principal' }),
    );

    await userEvent.click(within(await detalhes()).getByRole('button', { name: 'Remover' }));
    const dialogo = screen.getByRole('dialog', { name: 'Remover Volkswagen Polo?' });
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Remover veículo' }));
    expect(within(dialogo).getByText('Escolha o novo veículo principal.')).toBeInTheDocument();

    await userEvent.selectOptions(
      within(dialogo).getByLabelText('Novo veículo principal'),
      'Fiat Strada 2024 · DEF4G56',
    );
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Remover veículo' }));

    const restantes = await linhas();
    expect(restantes).toHaveLength(2);
    expect(await within(restantes[1]).findByText('Principal')).toBeInTheDocument();
  });

  /** Carro com instalação do VERS não sai no exemplo (no backend, a instalação iria junto). */
  it('protege o veículo com instalação', async () => {
    abrirVeiculos();

    const painel = await detalhes();
    expect(await within(painel).findByRole('button', { name: 'Remover' })).toBeDisabled();
    expect(painel).toHaveTextContent(
      'Remover um veículo com instalação apaga a instalação junto: disponível com a API.',
    );
  });
});
