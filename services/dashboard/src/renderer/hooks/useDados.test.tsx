/**
 * Testes dos hooks de dados (TanStack Query sobre o repositório).
 *
 * Usam um repositório falso para conferir que os hooks pedem os dados certos,
 * seguem o período global e expõem carregamento e erro.
 */

import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RepositorioProvider, type RepositorioVers } from '@/data/repositorio';
import { criarRepositorioMock } from '@/data/repositorioMock';
import { PERIODO_PADRAO, usePeriodoStore } from '@/stores/periodo';
import {
  useAcoesPerfil,
  useAcoesTeste,
  useAcoesVeiculo,
  useAcoesViber,
  useAmostrasTelemetria,
  useAmostrasVibracao,
  useComparacaoTestes,
  useConfiguracoes,
  useContextosViber,
  useConversasViber,
  useDiasDoPeriodo,
  useDispositivo,
  useInstalacao,
  useLogsDispositivo,
  useMensagensViber,
  useResumoEnergia,
  useResumoTeste,
  useRevisoes,
  useTensaoBateria,
  useTestes,
  useUsuarioAtual,
  useVeiculoAtivo,
  useVeiculos,
} from './useDados';

/** Cria o wrapper com um QueryClient novo (sem cache entre testes) e o repositório. */
function criarWrapper(repositorio: RepositorioVers) {
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={cliente}>
        <RepositorioProvider repositorio={repositorio}>{children}</RepositorioProvider>
      </QueryClientProvider>
    );
  };
}

describe('hooks de dados', () => {
  beforeEach(() => {
    usePeriodoStore.getState().setPeriodo(PERIODO_PADRAO);
  });

  /** Começa carregando e depois entrega o resumo do período global. */
  it('busca o resumo de energia do período global', async () => {
    const repositorio = criarRepositorioMock();
    const espiao = vi.spyOn(repositorio, 'obterResumoEnergia');
    const { result } = renderHook(() => useResumoEnergia(), { wrapper: criarWrapper(repositorio) });

    expect(result.current.isPending).toBe(true);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(espiao).toHaveBeenCalledWith('dia');
    expect(result.current.data?.periodo).toBe('dia');
  });

  /** Trocar o período global busca o novo período. */
  it('acompanha a troca de período', async () => {
    const repositorio = criarRepositorioMock();
    const { result } = renderHook(() => useResumoEnergia(), { wrapper: criarWrapper(repositorio) });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    act(() => usePeriodoStore.getState().setPeriodo('semana'));

    await waitFor(() => expect(result.current.data?.periodo).toBe('semana'));
  });

  /** Um período fixo ignora o período global (ex.: KPI "hoje"). */
  it('aceita um período fixo', async () => {
    const repositorio = criarRepositorioMock();
    usePeriodoStore.getState().setPeriodo('mes');
    const { result } = renderHook(() => useResumoEnergia('dia'), {
      wrapper: criarWrapper(repositorio),
    });

    await waitFor(() => expect(result.current.data?.periodo).toBe('dia'));
  });

  /** Semana e Mês têm dias para o gráfico de barras. */
  it('busca os dias do período pedido', async () => {
    const repositorio = criarRepositorioMock();
    const espiao = vi.spyOn(repositorio, 'obterDias');
    const { result } = renderHook(() => useDiasDoPeriodo('mes'), {
      wrapper: criarWrapper(repositorio),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(espiao).toHaveBeenCalledWith('mes');
    expect(result.current.data).toHaveLength(5);
  });

  /** As amostras de vibração seguem o período global. */
  it('busca as amostras de vibração do período global', async () => {
    const repositorio = criarRepositorioMock();
    const espiao = vi.spyOn(repositorio, 'obterAmostrasVibracao');
    usePeriodoStore.getState().setPeriodo('semana');
    const { result } = renderHook(() => useAmostrasVibracao(), {
      wrapper: criarWrapper(repositorio),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(espiao).toHaveBeenCalledWith('semana');
    expect(result.current.data).toHaveLength(28);
  });

  /** A tensão da bateria de hoje não depende do período. */
  it('busca a tensão da bateria de hoje', async () => {
    const repositorio = criarRepositorioMock();
    const { result } = renderHook(() => useTensaoBateria(), { wrapper: criarWrapper(repositorio) });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.pontos.at(-1)?.horario).toBe('18:05');
  });

  /** Testes do dispositivo, para o seletor da Telemetria. */
  it('busca os testes', async () => {
    const repositorio = criarRepositorioMock();
    const espiao = vi.spyOn(repositorio, 'buscarTestes');
    const consulta = { status: 'concluido' as const, pagina: 1, tamanhoPagina: 5 };
    const { result } = renderHook(() => useTestes(consulta), {
      wrapper: criarWrapper(repositorio),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(espiao).toHaveBeenCalledWith(consulta);
    expect(result.current.data?.itens).toHaveLength(5);
    expect(result.current.data?.total).toBe(13);
  });

  /** As ações devolvem o teste atualizado e refazem as buscas de testes. */
  it('executa ações de teste e atualiza a lista', async () => {
    const repositorio = criarRepositorioMock();
    const wrapper = criarWrapper(repositorio);
    const lista = renderHook(() => useTestes({ status: 'planejado' }), { wrapper });
    const acoes = renderHook(() => useAcoesTeste(), { wrapper });
    await waitFor(() => expect(lista.result.current.data?.total).toBe(1));

    await act(() =>
      acoes.result.current.cancelar.mutateAsync({ testeId: 'teste-024', motivo: 'Chuva' }),
    );

    await waitFor(() => expect(lista.result.current.data?.total).toBe(0));
  });

  /** Erros do repositório (ex.: conflito) chegam à tela pela mutação. */
  it('expõe o conflito ao iniciar', async () => {
    const repositorio = criarRepositorioMock();
    const { result } = renderHook(() => useAcoesTeste(), { wrapper: criarWrapper(repositorio) });

    await expect(act(() => result.current.iniciar.mutateAsync('teste-024'))).rejects.toMatchObject({
      codigo: 'conflito',
    });
  });

  /** Veículos, instalação do principal, configurações, revisões e log. */
  it('busca os dados de veículo e instalação', async () => {
    const repositorio = criarRepositorioMock();
    const wrapper = criarWrapper(repositorio);
    const veiculos = renderHook(() => useVeiculos(), { wrapper });
    await waitFor(() => expect(veiculos.result.current.data).toHaveLength(2));
    const civic = veiculos.result.current.data![0];

    const instalacao = renderHook(() => useInstalacao(civic.id), { wrapper });
    await waitFor(() => expect(instalacao.result.current.data?.modelo).toBe('VERS-PZ01'));
    const configuracoes = renderHook(() => useConfiguracoes(instalacao.result.current.data!.id), {
      wrapper,
    });
    const revisoes = renderHook(() => useRevisoes(), { wrapper });
    const log = renderHook(() => useLogsDispositivo('VERS-01'), { wrapper });
    const semLog = renderHook(() => useLogsDispositivo(null), { wrapper });

    await waitFor(() => expect(configuracoes.result.current.data?.[0].versao).toBe(3));
    await waitFor(() => expect(revisoes.result.current.data).toHaveLength(3));
    await waitFor(() => expect(log.result.current.data?.length).toBeGreaterThan(0));
    expect(semLog.result.current.fetchStatus).toBe('idle');
  });

  /** Trocar o principal atualiza o veículo ativo (o dos subtítulos). */
  it('troca o veículo principal', async () => {
    const repositorio = criarRepositorioMock();
    const wrapper = criarWrapper(repositorio);
    const ativo = renderHook(() => useVeiculoAtivo(), { wrapper });
    const acoes = renderHook(() => useAcoesVeiculo(), { wrapper });
    await waitFor(() => expect(ativo.result.current.data?.placa).toBe('ABC1D23'));
    const [, strada] = await repositorio.obterVeiculos();

    await act(() =>
      acoes.result.current.atualizar.mutateAsync({ veiculoId: strada.id, principal: true }),
    );

    await waitFor(() =>
      expect(ativo.result.current.data?.descricao).toBe('Fiat Strada 2024 · DEF4G56'),
    );
  });

  /** Viber: contextos, conversas, mensagens e envio (que atualiza a conversa). */
  it('conversa com o Viber', async () => {
    const repositorio = criarRepositorioMock();
    const wrapper = criarWrapper(repositorio);
    const contextos = renderHook(() => useContextosViber(), { wrapper });
    const conversas = renderHook(() => useConversasViber(), { wrapper });
    await waitFor(() => expect(conversas.result.current.data).toHaveLength(4));
    const atual = conversas.result.current.data![0];
    const mensagens = renderHook(() => useMensagensViber(atual.id), { wrapper });
    const acoes = renderHook(() => useAcoesViber(), { wrapper });
    await waitFor(() => expect(mensagens.result.current.data).toHaveLength(4));
    await waitFor(() => expect(contextos.result.current.data).toHaveLength(3));

    await act(() =>
      acoes.result.current.enviar.mutateAsync({
        conversaId: atual.id,
        texto: 'Resumo da semana',
        contextoId: 'semana',
        sugestao: 'resumo',
      }),
    );

    await waitFor(() => expect(mensagens.result.current.data).toHaveLength(6));
  });

  /** Salvar o perfil atualiza o usuário atual (o da sidebar). */
  it('atualiza o perfil', async () => {
    const repositorio = criarRepositorioMock();
    const wrapper = criarWrapper(repositorio);
    const usuario = renderHook(() => useUsuarioAtual(), { wrapper });
    const acoes = renderHook(() => useAcoesPerfil(), { wrapper });
    await waitFor(() => expect(usuario.result.current.data?.nome).toBe('Ana Silva'));

    await act(() => acoes.result.current.atualizar.mutateAsync({ nome: 'Ana S. Silva' }));

    await waitFor(() => expect(usuario.result.current.data?.nome).toBe('Ana S. Silva'));
  });

  /** Resumo e comparação de testes encerrados. */
  it('busca o resumo e a comparação', async () => {
    const repositorio = criarRepositorioMock();
    const wrapper = criarWrapper(repositorio);
    const resumo = renderHook(() => useResumoTeste('teste-016'), { wrapper });
    const comparacao = renderHook(() => useComparacaoTestes(['teste-016', 'teste-015']), {
      wrapper,
    });
    const semComparar = renderHook(() => useComparacaoTestes(null), { wrapper });

    await waitFor(() => expect(resumo.result.current.data?.picoPotenciaMw).toBe(412));
    await waitFor(() => expect(comparacao.result.current.data).toHaveLength(2));
    expect(semComparar.result.current.fetchStatus).toBe('idle');
  });

  /** Amostras da consulta pedida; sem teste escolhido, não consulta. */
  it('busca as amostras da consulta', async () => {
    const repositorio = criarRepositorioMock();
    const espiao = vi.spyOn(repositorio, 'obterAmostrasTelemetria');
    const tarde = { id: 'teste-023' };
    const consulta = { testeId: tarde.id, pagina: 2, tamanhoPagina: 10 };
    const { result } = renderHook(() => useAmostrasTelemetria(consulta), {
      wrapper: criarWrapper(repositorio),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(espiao).toHaveBeenCalledWith(consulta);
    expect(result.current.data?.itens).toHaveLength(10);

    const semTeste = renderHook(() => useAmostrasTelemetria(null), {
      wrapper: criarWrapper(repositorio),
    });
    expect(semTeste.result.current.fetchStatus).toBe('idle');
  });

  /** Ao vivo, a consulta se repete no intervalo pedido. */
  it('repete a consulta no intervalo ao vivo', async () => {
    const repositorio = criarRepositorioMock();
    const espiao = vi.spyOn(repositorio, 'obterAmostrasTelemetria');
    const tarde = { id: 'teste-023' };
    renderHook(() => useAmostrasTelemetria({ testeId: tarde.id }, { intervaloMs: 30 }), {
      wrapper: criarWrapper(repositorio),
    });

    await waitFor(() => expect(espiao.mock.calls.length).toBeGreaterThanOrEqual(3));
  });

  /** Sem período (Hora), o hook não consulta o repositório. */
  it('não busca dias quando o período é nulo', () => {
    const repositorio = criarRepositorioMock();
    const espiao = vi.spyOn(repositorio, 'obterDias');
    const { result } = renderHook(() => useDiasDoPeriodo(null), {
      wrapper: criarWrapper(repositorio),
    });

    expect(result.current.fetchStatus).toBe('idle');
    expect(espiao).not.toHaveBeenCalled();
  });

  /** Falhas do repositório aparecem como erro do hook. */
  it('expõe o erro do repositório', async () => {
    const repositorio = criarRepositorioMock();
    vi.spyOn(repositorio, 'obterUsuarioAtual').mockRejectedValue(new Error('sem conexão'));
    const { result } = renderHook(() => useUsuarioAtual(), { wrapper: criarWrapper(repositorio) });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('sem conexão');
  });

  /** O dispositivo chega pronto para exibição, com o "visto há" calculado. */
  it('entrega o dispositivo resumido com o tempo desde o último contato', async () => {
    const repositorio = criarRepositorioMock();
    const { result } = renderHook(() => useDispositivo(), { wrapper: criarWrapper(repositorio) });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toMatchObject({
      nome: 'ESP32 · VERS-01',
      vistoHa: 'há 3 s',
      online: true,
    });
  });

  /** O veículo vem com a descrição curta do subtítulo. */
  it('entrega o veículo com a descrição curta', async () => {
    const repositorio = criarRepositorioMock();
    const { result } = renderHook(() => useVeiculoAtivo(), { wrapper: criarWrapper(repositorio) });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.descricao).toBe('Honda Civic 2026 · ABC1D23');
  });

  /** Usar um hook fora do provedor é erro de programação, com mensagem clara. */
  it('exige o RepositorioProvider', () => {
    const cliente = new QueryClient();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={cliente}>{children}</QueryClientProvider>
    );
    vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => renderHook(() => useUsuarioAtual(), { wrapper })).toThrow(/RepositorioProvider/);
  });
});
