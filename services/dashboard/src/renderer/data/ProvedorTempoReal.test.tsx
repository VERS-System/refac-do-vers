/** Confere assinatura compartilhada, snapshots, retomada e descarte de outra observação. */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { TempoRealProvider, useRecursosTempoReal } from './ProvedorTempoReal';
import type { AvisoTempoReal, PonteTempoReal } from '../../shared/realtime';
const recurso = { type: 'test' as const, id: '11111111-1111-4111-8111-111111111111' };
afterEach(() => vi.useRealTimers());
/** Consome o mesmo teste em componentes diferentes, como painel e tabela. */
function Consumidor() { useRecursosTempoReal([recurso]); return null; }

it('compartilha assinatura, refaz snapshot após ACK/foco e ignora avisos antigos', async () => {
  vi.useFakeTimers(); const cliente = new QueryClient();
  const chave = ['testes', 'resumo', recurso.id]; cliente.setQueryData(chave, 1);
  let ouvir!: (a: AvisoTempoReal) => void;
  const remover = vi.fn(); const observar = vi.fn().mockResolvedValue({ ok: true });
  const ponte: PonteTempoReal = { observar, receber: cb => { ouvir = cb; return remover; } };
  const expirar = vi.fn();
  /** Mantém um provider estável enquanto um dos dois consumidores sai. */
  const tela = (dois: boolean) => <QueryClientProvider client={cliente}><TempoRealProvider ponte={ponte} aoExpirar={expirar}>
    <Consumidor />{dois && <Consumidor />}
  </TempoRealProvider></QueryClientProvider>;
  const app = render(tela(true)); await act(() => vi.advanceTimersByTimeAsync(50));
  const inicio = observar.mock.calls.at(-1)![0]; expect(inicio.recursos).toEqual([recurso]);
  const quantidade = observar.mock.calls.length; app.rerender(tela(false));
  await act(() => vi.advanceTimersByTimeAsync(50)); expect(observar).toHaveBeenCalledTimes(quantidade);
  act(() => ouvir({ observacao: inicio.observacao, tipo: 'pronto', recurso }));
  expect(screen.getByLabelText('Tempo real')).toHaveTextContent('conectado');
  await act(() => vi.advanceTimersByTimeAsync(100)); expect(cliente.getQueryState(chave)?.isInvalidated).toBe(true);
  cliente.setQueryData(chave, 2);
  act(() => window.dispatchEvent(new Event('focus'))); await act(() => Promise.resolve());
  const retomada = observar.mock.calls.at(-1)![0]; expect(retomada.observacao).not.toBe(inicio.observacao);
  act(() => ouvir({ observacao: inicio.observacao, tipo: 'atualizacao', recurso }));
  await act(() => vi.advanceTimersByTimeAsync(100)); expect(cliente.getQueryState(chave)?.isInvalidated).toBe(false);
  act(() => ouvir({ observacao: retomada.observacao, tipo: 'desconectado' }));
  expect(screen.getByLabelText('Tempo real')).toHaveTextContent('Consultas REST mantidas');
  act(() => ouvir({ observacao: retomada.observacao, tipo: 'recurso-indisponivel', recurso }));
  await act(() => Promise.resolve()); expect(cliente.getQueryData(chave)).toBeUndefined();
  expect(screen.getByLabelText('Tempo real')).toHaveTextContent('Conferindo acesso pelo REST');
  act(() => ouvir({ observacao: retomada.observacao, tipo: 'sessao-expirada' }));
  expect(expirar).toHaveBeenCalledOnce(); expect(cliente.getQueryData(chave)).toBeUndefined();
  app.unmount(); expect(remover).toHaveBeenCalled(); expect(observar.mock.calls.at(-1)![0].recursos).toEqual([]);
  cliente.clear();
});
