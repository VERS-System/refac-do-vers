/** Garante que múltiplas instalações exigem escolha e que ela vale entre consumidores. */
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RepositorioProvider } from '../data/repositorio';
import { criarRepositorioMock } from '../data/repositorioMock';
import { useSelecaoInstalacao } from '../stores/instalacao';
import { useInstalacao } from './useDados';

describe('seleção de instalação', () => {
  beforeEach(() => useSelecaoInstalacao.setState({ escolhas: {} }));
  it('não escolhe a primeira nem a ACTIVE quando existem duas', async () => {
    const mock = criarRepositorioMock();
    const i = { id: 'i1', veiculoId: 'v1', modelo: 'A', status: 'ativa' as const, instaladaEm: null, dispositivo: null };
    const lista = [{ ...i, id: 'i1' }, { ...i, id: 'i2' }];
    const repositorio = { ...mock, listarInstalacoes: async () => lista };
    const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    /** Fornece cache e repositório isolados ao hook de instalação. */
    const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={cliente}><RepositorioProvider repositorio={repositorio}>{children}</RepositorioProvider></QueryClientProvider>;
    const a = renderHook(() => useInstalacao('v1'), { wrapper });
    const b = renderHook(() => useInstalacao('v1'), { wrapper });
    await waitFor(() => expect(a.result.current.isSuccess).toBe(true));
    expect(a.result.current.data).toBeNull(); expect(a.result.current.precisaEscolher).toBe(true);
    act(() => useSelecaoInstalacao.getState().escolher('v1', 'i2'));
    await waitFor(() => expect(b.result.current.data?.id).toBe('i2'));
    expect(a.result.current.data?.id).toBe('i2');
  });
});
