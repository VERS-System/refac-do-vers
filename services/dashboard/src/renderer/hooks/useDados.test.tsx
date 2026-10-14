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
import { useDispositivo, useResumoEnergia, useUsuarioAtual, useVeiculoAtivo } from './useDados';

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
    const { result } = renderHook(() => useResumoEnergia('dia'), { wrapper: criarWrapper(repositorio) });

    await waitFor(() => expect(result.current.data?.periodo).toBe('dia'));
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
    expect(result.current.data).toMatchObject({ nome: 'ESP32 · VERS-01', vistoHa: 'há 3 s', online: true });
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
