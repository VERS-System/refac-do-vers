/** Confere seleção, cobertura, falhas e CSV sem associar exemplos à instalação real. */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { energySummaryFixture } from '@vers/shared-types';
import { RepositorioProvider, type RepositorioVers } from '@/data/repositorio';
import { criarRepositorioMock } from '@/data/repositorioMock';
import { carregarEnergia } from '@/data/energia';
import { useSelecaoInstalacao } from '@/stores/instalacao';
import { usePeriodoStore } from '@/stores/periodo';
import { PainelEnergiaReal } from './PainelEnergiaReal';

/** Prepara uma instalação com um bloco parcial conhecido e as demais horas ausentes. */
async function preparar() {
  const base = criarRepositorioMock();
  const veiculo = (await base.obterVeiculoAtivo())!;
  const instalacao = (await base.obterInstalacao(veiculo.id))!;
  const obterEnergiaInstalacao = vi.fn<NonNullable<RepositorioVers['obterEnergiaInstalacao']>>().mockImplementation(async (id, janela) =>
    carregarEnergia(id, janela, async () => ({ data: [{ ...energySummaryFixture, id: 'hora-conhecida', installationId: id, testId: null,
      periodType: 'HOUR', periodStart: janela.inicio, periodEnd: new Date(Date.parse(janela.inicio) + 3600000).toISOString(),
      recoveredEnergyWh: 0.2, quality: 'PARTIAL' }], meta: { page: 1, pageSize: 100, totalItems: 1, totalPages: 1 } })));
  return { veiculo, instalacao, obterEnergiaInstalacao,
    repositorio: { ...base, obterEnergiaInstalacao, agora: () => new Date('2026-10-20T15:37:00.000Z') } };
}

/** Renderiza um painel real com cache isolado, sem serviços externos. */
function renderizar(repositorio: RepositorioVers) {
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={cliente}><RepositorioProvider repositorio={repositorio}><PainelEnergiaReal /></RepositorioProvider></QueryClientProvider>);
}

beforeEach(() => { usePeriodoStore.setState({ periodo: 'dia' }); useSelecaoInstalacao.setState({ escolhas: {} }); });

describe('energia real por instalação', () => {
  it('mostra soma oficial parcial e cobertura, sem eficiência ou bateria simuladas', async () => {
    const { repositorio } = await preparar(); renderizar(repositorio);
    expect(await screen.findByText('1 de 12 horas utilizáveis')).toBeInTheDocument();
    expect(screen.getByText(/0 boas · 1 parciais · 0 inválidas · 11 ausentes/)).toBeInTheDocument();
    expect(within(screen.getByRole('group', { name: 'Energia dos blocos utilizáveis' })).getByText('200,00 mWh')).toBeInTheDocument();
    expect(screen.getByRole('table', { name: 'Blocos horários oficiais' })).toBeInTheDocument();
    expect(screen.queryByText(/Bateria 68|76,7|53,5/)).not.toBeInTheDocument();
    expect(screen.getByText(/não comprovam medição contínua/)).toBeInTheDocument();
  });

  it('exige escolha entre instalações e não mantém números da anterior durante a troca', async () => {
    const { repositorio, instalacao, obterEnergiaInstalacao } = await preparar();
    obterEnergiaInstalacao.mockImplementationOnce(async () => new Promise(() => {}));
    renderizar({ ...repositorio, listarInstalacoes: async () => [{ ...instalacao, id: 'inst-a' }, { ...instalacao, id: 'inst-b' }] });
    expect(await screen.findByText('Selecione uma instalação para consultar a energia.')).toBeInTheDocument();
    expect(obterEnergiaInstalacao).not.toHaveBeenCalled();
    await userEvent.selectOptions(screen.getByLabelText('Instalação exibida'), 'inst-a');
    await waitFor(() => expect(obterEnergiaInstalacao).toHaveBeenCalledWith('inst-a', expect.any(Object)));
    expect(screen.queryByRole('group', { name: 'Energia dos blocos utilizáveis' })).not.toBeInTheDocument();
    await userEvent.selectOptions(screen.getByLabelText('Instalação exibida'), 'inst-b');
    expect(within(await screen.findByRole('group', { name: 'Energia dos blocos utilizáveis' })).getByText('200,00 mWh')).toBeInTheDocument();
    await userEvent.selectOptions(screen.getByLabelText('Instalação exibida'), 'inst-a');
    expect(screen.queryByRole('group', { name: 'Energia dos blocos utilizáveis' })).not.toBeInTheDocument();
  });

  it('mostra falha e permite tentar novamente sem usar o resumo de demonstração', async () => {
    const { repositorio, obterEnergiaInstalacao } = await preparar();
    obterEnergiaInstalacao.mockRejectedValueOnce(new Error('interno'));
    const exemplo = vi.spyOn(repositorio, 'obterResumoEnergia'); renderizar(repositorio);
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar');
    expect(exemplo).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(within(await screen.findByRole('group', { name: 'Energia dos blocos utilizáveis' })).getByText('200,00 mWh')).toBeInTheDocument();
  });

  it('exporta todas as horas e qualidades da janela, incluindo ausências', async () => {
    const criar = vi.fn((_b: Blob) => 'blob:energia');
    Object.assign(URL, { createObjectURL: criar, revokeObjectURL: vi.fn() });
    const clicar = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const { repositorio } = await preparar(); renderizar(repositorio);
    const botao = await screen.findByRole('button', { name: 'Exportar blocos CSV' });
    await userEvent.click(botao);
    const csv = await criar.mock.calls[0][0].text();
    expect(csv.trimEnd().split('\r\n')).toHaveLength(13);
    expect(csv).toContain('America/Sao_Paulo'); expect(csv).toContain('Parcial'); expect(csv).toContain('Ausente');
    clicar.mockRestore();
  });

  it('não consulta energia sem veículo principal', async () => {
    const { repositorio, obterEnergiaInstalacao } = await preparar();
    renderizar({ ...repositorio, obterVeiculoAtivo: async () => null });
    expect(await screen.findByText('Defina um veículo principal para consultar a energia.')).toBeInTheDocument();
    expect(obterEnergiaInstalacao).not.toHaveBeenCalled();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
});
