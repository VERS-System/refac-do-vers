/** Verifica ausência de dados inventados e escolha explícita no painel de instalação real. */
import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RepositorioProvider } from '@/data/repositorio';
import { criarRepositorioMock } from '@/data/repositorioMock';
import { useSelecaoInstalacao } from '@/stores/instalacao';
import { CardInstalacao } from './CardInstalacao';

/** Monta somente o card com versões reais mínimas e cache sem repetição de erros. */
async function montar(multiplas: boolean, falhar = false) {
  const mock = criarRepositorioMock();
  const v = (await mock.obterVeiculos())[0];
  const i = { id: 'i1', veiculoId: v.id, modelo: 'Montagem real A', status: 'ativa' as const, instaladaEm: null, dispositivo: null };
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const repo = { ...mock, cadastroReal: true,
    listarInstalacoes: async () => { if (falhar) throw new Error('404'); return multiplas ? [i, { ...i, id: 'i2', modelo: 'Montagem real B' }] : [i]; },
    obterConfiguracoes: async (id: string) => [{ id: `c-${id}`, instalacaoId: id, nome: `Configuração ${id}`, versao: 1,
      piezosAtivos: 3, piezosTotal: null, piezosInativos: null, associacao: 'serie' as const,
      armazenamento: 'capacitor' as const, pontoInstalacao: 'Bancada', observacoes: null, criadaEm: '2026-10-20T00:00:00Z' }],
  };
  render(<QueryClientProvider client={cliente}><RepositorioProvider repositorio={repo}><CardInstalacao /></RepositorioProvider></QueryClientProvider>);
}

describe('instalação real', () => {
  beforeEach(() => useSelecaoInstalacao.setState({ escolhas: {} }));
  it('exige escolha entre duas instalações e usa somente versões da selecionada', async () => {
    await montar(true);
    const seletor = await screen.findByLabelText('Instalação exibida');
    expect(await screen.findByText('Selecione uma instalação para consultar seus dados.')).toBeInTheDocument();
    expect(screen.queryByText('Configuração i1 · v1')).not.toBeInTheDocument();
    await userEvent.selectOptions(seletor, 'i2');
    expect(await screen.findByText('Configuração i2 · v1')).toBeInTheDocument();
    expect(screen.queryByText('Configuração i1 · v1')).not.toBeInTheDocument();
    expect(screen.queryByText('Harvester LTC3588')).not.toBeInTheDocument();
    expect(screen.queryByText(/TP4056/)).not.toBeInTheDocument();
    expect(screen.getByText(/total de piezos.*não informados/)).toBeInTheDocument();
  });
  it('erro de instalação permanece erro, sem afirmar ausência', async () => {
    await montar(false, true);
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar a instalação');
    expect(screen.queryByText('Nenhuma instalação neste veículo.')).not.toBeInTheDocument();
  });
});
