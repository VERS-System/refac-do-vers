/**
 * Testes da tela Veículo e instalação.
 *
 * Seguem o plano `.AIs/docs/plans/desktop-frontend-veiculo.md`: cadastro de
 * veículos funcionando em memória (editar, adicionar, trocar o principal),
 * instalação e dispositivo só de leitura, ações no hardware e "Solicitar
 * revisão" desativadas, log de exemplo e os estados de erro e vazio.
 */

import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RepositorioProvider, type RepositorioVers } from '@/data/repositorio';
import { criarRepositorioMock } from '@/data/repositorioMock';
import { VeiculoInstalacaoPage } from './VeiculoInstalacaoPage';

/** Renderiza a tela com um cache novo e o repositório informado. */
function renderizar(repositorio: RepositorioVers = criarRepositorioMock()) {
  const cliente = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={cliente}>
      <RepositorioProvider repositorio={repositorio}>
        <VeiculoInstalacaoPage />
      </RepositorioProvider>
    </QueryClientProvider>,
  );
  return repositorio;
}

const regiao = (nome: string) => screen.getByRole('region', { name: nome });

describe('VeiculoInstalacaoPage — leitura', () => {
  /** Barra superior: revisão desativada (precisa da API) e adicionar veículo. */
  it('mostra a barra superior', () => {
    renderizar();

    expect(
      screen.getByRole('heading', { level: 1, name: 'Veículo e instalação' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Cadastro, configuração dos piezos e dispositivo')).toBeInTheDocument();
    const revisao = screen.getByRole('button', { name: 'Solicitar revisão' });
    expect(revisao).toBeDisabled();
    expect(revisao).toHaveAccessibleDescription('Disponível com a API.');
    expect(screen.getByRole('button', { name: 'Adicionar veículo' })).toBeEnabled();
  });

  /** Veículo principal com os campos do contrato e a instalação vinculada. */
  it('mostra o veículo principal', async () => {
    renderizar();

    const veiculo = regiao('Veículo em teste');
    expect(await within(veiculo).findByText('Honda Civic 2026')).toBeInTheDocument();
    expect(within(veiculo).getByText('Principal')).toBeInTheDocument();
    for (const texto of ['ABC1D23', 'Honda', 'Civic', '2026', 'Proprietário']) {
      expect(within(veiculo).getByText(texto)).toBeInTheDocument();
    }
    expect(await within(veiculo).findByText('Instalação VERS-PZ01 vinculada')).toBeInTheDocument();
  });

  /** Outros veículos, com a ação de tornar principal. */
  it('mostra os outros veículos', async () => {
    renderizar();

    const outros = regiao('Outros veículos');
    const strada = await within(outros).findByRole('listitem');
    expect(strada).toHaveTextContent('Fiat Strada 2024');
    expect(strada).toHaveTextContent('DEF4G56');
    expect(strada).toHaveTextContent('Motorista');
    expect(
      within(strada).getByRole('button', { name: 'Tornar Fiat Strada 2024 principal' }),
    ).toBeInTheDocument();
  });

  /** Instalação: status, topologia, circuito, associação (só leitura), bateria e versões. */
  it('mostra a instalação', async () => {
    renderizar();

    const instalacao = regiao('Instalação');
    expect(await within(instalacao).findByText('VERS-PZ01')).toBeInTheDocument();
    expect(within(instalacao).getByText('Ativa')).toBeInTheDocument();
    expect(instalacao).toHaveTextContent('Instalada em 12/09/2026');
    expect(await within(instalacao).findByText('6 de 8 piezos captando')).toBeInTheDocument();
    expect(
      within(instalacao).getByRole('img', { name: /8 posições, 6 captando; inativos: 6 e 8/ }),
    ).toBeInTheDocument();
    expect(instalacao).toHaveTextContent('Config v3');
    expect(instalacao).toHaveTextContent('Harvester LTC3588');
    expect(instalacao).toHaveTextContent('75% em operação');
    expect(instalacao).toHaveTextContent('Li-ion 3,7 V · 2200 mAh');
    expect(instalacao).toHaveTextContent('Suspensão dianteira e traseira');

    const associacao = within(instalacao).getByRole('radiogroup', { name: 'Associação dos nós' });
    expect(within(associacao).getByRole('radio', { name: 'Paralelo' })).toBeChecked();
    for (const opcao of within(associacao).getAllByRole('radio')) expect(opcao).toBeDisabled();

    const versoes = within(instalacao).getByRole('list', { name: 'Versões da configuração' });
    expect(
      within(versoes)
        .getAllByRole('listitem')
        .map((v) => v.textContent),
    ).toEqual(['v3 (ativa)', 'v2', 'v1']);
  });

  /** Dispositivo: dados públicos, reiniciar desativado e logs de exemplo. */
  it('mostra o dispositivo e o log', async () => {
    renderizar();

    const dispositivo = regiao('Dispositivo');
    expect(await within(dispositivo).findByText('ESP32 · VERS-01')).toBeInTheDocument();
    expect(within(dispositivo).getByText('Online')).toBeInTheDocument();
    expect(dispositivo).toHaveTextContent('Firmware0.4.2');
    expect(dispositivo).toHaveTextContent('Último contatohá 3 s');
    expect(dispositivo).toHaveTextContent('ProtocoloMQTT');
    expect(within(dispositivo).getByRole('button', { name: 'Reiniciar terminal' })).toBeDisabled();

    await userEvent.click(within(dispositivo).getByRole('button', { name: 'Ver logs' }));
    const dialogo = screen.getByRole('dialog', { name: 'Log do ESP32 · VERS-01' });
    expect((await within(dialogo).findAllByText(/#023/)).length).toBeGreaterThan(0);
    expect(within(dialogo).getAllByRole('listitem').length).toBeGreaterThan(5);
  });

  /** Revisões do contrato de suporte, sem técnico nem OS. */
  it('mostra o histórico de revisões', async () => {
    renderizar();

    const revisoes = regiao('Histórico de revisões');
    const itens = await within(revisoes).findAllByRole('listitem');
    expect(itens).toHaveLength(3);
    expect(itens[0]).toHaveTextContent('Agendada');
    expect(itens[0]).toHaveTextContent('piezo 6');
    expect(itens[1]).toHaveTextContent('Resolvida');
    expect(revisoes).toHaveTextContent('3 registros');
  });
});

describe('VeiculoInstalacaoPage — cadastro', () => {
  /** Editar muda fabricante, modelo e ano; a placa não pode ser alterada. */
  it('edita o veículo principal', async () => {
    renderizar();
    const veiculo = regiao('Veículo em teste');
    await within(veiculo).findByText('Honda Civic 2026');

    await userEvent.click(within(veiculo).getByRole('button', { name: 'Editar dados' }));
    const dialogo = screen.getByRole('dialog', { name: 'Editar veículo' });
    expect(within(dialogo).getByLabelText('Placa')).toBeDisabled();
    const modelo = within(dialogo).getByLabelText('Modelo');
    await userEvent.clear(modelo);
    await userEvent.type(modelo, 'Civic Touring');
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(await within(veiculo).findByText('Honda Civic Touring 2026')).toBeInTheDocument();
  });

  /** Tornar outro veículo principal, com confirmação; sem instalação, a tela diz isso. */
  it('troca o veículo principal', async () => {
    renderizar();
    const outros = regiao('Outros veículos');

    await userEvent.click(
      await within(outros).findByRole('button', { name: 'Tornar Fiat Strada 2024 principal' }),
    );
    const dialogo = screen.getByRole('dialog', {
      name: 'Tornar Fiat Strada 2024 o veículo principal?',
    });
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Tornar principal' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(
      await within(regiao('Veículo em teste')).findByText('Fiat Strada 2024'),
    ).toBeInTheDocument();
    expect(
      await within(regiao('Instalação')).findByText('Nenhuma instalação neste veículo.'),
    ).toBeInTheDocument();
    expect(await within(outros).findByText('Honda Civic 2026')).toBeInTheDocument();
  });

  /** Adicionar valida a placa, recusa repetida e cadastra a nova. */
  it('adiciona um veículo', async () => {
    renderizar();
    await within(regiao('Outros veículos')).findByRole('listitem');

    await userEvent.click(screen.getByRole('button', { name: 'Adicionar veículo' }));
    const dialogo = screen.getByRole('dialog', { name: 'Adicionar veículo' });
    await userEvent.type(within(dialogo).getByLabelText('Placa'), 'AB12');
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Adicionar' }));
    expect(within(dialogo).getByText('Use o formato ABC1D23 ou ABC1234.')).toBeInTheDocument();

    await userEvent.clear(within(dialogo).getByLabelText('Placa'));
    await userEvent.type(within(dialogo).getByLabelText('Placa'), 'ABC1D23');
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Adicionar' }));
    expect(await within(dialogo).findByRole('alert')).toHaveTextContent(
      'Já existe um veículo com a placa ABC1D23.',
    );

    await userEvent.clear(within(dialogo).getByLabelText('Placa'));
    await userEvent.type(within(dialogo).getByLabelText('Placa'), 'GHI2J34');
    await userEvent.type(within(dialogo).getByLabelText('Fabricante'), 'Volkswagen');
    await userEvent.type(within(dialogo).getByLabelText('Modelo'), 'Polo');
    await userEvent.type(within(dialogo).getByLabelText('Ano'), '2023');
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Adicionar' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(
      await within(regiao('Outros veículos')).findByText('Volkswagen Polo 2023'),
    ).toBeInTheDocument();
  });
});

describe('VeiculoInstalacaoPage — estados', () => {
  /** Falha ao buscar os veículos: erro no card. */
  it('mostra o erro dos veículos', async () => {
    const repositorio = criarRepositorioMock();
    vi.spyOn(repositorio, 'obterVeiculos').mockRejectedValue(new Error('sem conexão'));
    renderizar(repositorio);

    expect(await within(regiao('Veículo em teste')).findByRole('alert')).toHaveTextContent(
      'Não foi possível carregar os veículos.',
    );
  });

  /** Sem revisões: mensagem de vazio. */
  it('mostra o histórico vazio', async () => {
    const repositorio = criarRepositorioMock();
    vi.spyOn(repositorio, 'obterRevisoes').mockResolvedValue([]);
    renderizar(repositorio);

    expect(
      await within(regiao('Histórico de revisões')).findByText('Nenhuma revisão registrada.'),
    ).toBeInTheDocument();
  });
});
