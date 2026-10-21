/** Verifica agrupamento e nova leitura após aviso recebido durante um REST pendente. */
import { QueryClient, QueryObserver } from '@tanstack/react-query';
import { afterEach, expect, it, vi } from 'vitest';
import { criarAtualizadorTempoReal } from './tempoReal';
const recurso = { type: 'test' as const, id: '11111111-1111-4111-8111-111111111111' };
afterEach(() => vi.useRealTimers());

it('agrupa rajadas, invalida filtros/comparações e mantém outro teste intacto', async () => {
  vi.useFakeTimers(); const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const chaves = [['telemetria', 'amostras', { testeId: recurso.id, pagina: 1 }],
    ['telemetria', 'amostras', { testeId: recurso.id, pagina: 2, qualidade: 'boa' }],
    ['testes', 'resumo', recurso.id], ['testes', 'comparacao', [recurso.id, 'outro']], ['testes', 'busca', {}]];
  chaves.forEach(k => cliente.setQueryData(k, 1));
  cliente.setQueryData(['testes', 'resumo', 'outro'], 2);
  const atualizar = criarAtualizadorTempoReal(cliente);
  for (let i = 0; i < 50; i++) atualizar.avisar(recurso);
  await vi.advanceTimersByTimeAsync(100);
  chaves.forEach(k => expect(cliente.getQueryState(k)?.isInvalidated).toBe(true));
  expect(cliente.getQueryState(['testes', 'resumo', 'outro'])?.isInvalidated).toBe(false);
  atualizar.encerrar(); cliente.clear();
});

it('termina a consulta pendente e lê novamente sem cancelar nem perder o aviso', async () => {
  vi.useFakeTimers(); const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  let concluir!: (n: number) => void;
  const consultar = vi.fn().mockImplementationOnce(() => new Promise<number>(r => { concluir = r; })).mockResolvedValue(2);
  const chave = ['testes', 'resumo', recurso.id];
  const observer = new QueryObserver(cliente, { queryKey: chave, queryFn: consultar });
  const remover = observer.subscribe(() => {}); const atualizar = criarAtualizadorTempoReal(cliente);
  atualizar.avisar(recurso); await vi.advanceTimersByTimeAsync(100);
  expect(consultar).toHaveBeenCalledOnce(); concluir(1);
  await vi.advanceTimersByTimeAsync(100);
  expect(consultar).toHaveBeenCalledTimes(2); expect(cliente.getQueryData(chave)).toBe(2);
  atualizar.encerrar(); remover(); cliente.clear();
});

it('limita energia à instalação e descarta avisos/timers após desmontagem', async () => {
  vi.useFakeTimers(); const cliente = new QueryClient();
  const chave = ['energia', 'instalacao', recurso.id, 'semana'];
  const outra = ['energia', 'instalacao', 'outra', 'semana'];
  cliente.setQueryData(chave, 1); cliente.setQueryData(outra, 2);
  const atualizar = criarAtualizadorTempoReal(cliente);
  atualizar.avisar({ type: 'installation', id: recurso.id }); await vi.advanceTimersByTimeAsync(100);
  expect(cliente.getQueryState(chave)?.isInvalidated).toBe(true);
  expect(cliente.getQueryState(outra)?.isInvalidated).toBe(false);
  atualizar.avisar({ type: 'installation', id: 'outra' }); atualizar.encerrar();
  await vi.advanceTimersByTimeAsync(1000); expect(cliente.getQueryState(outra)?.isInvalidated).toBe(false);
  cliente.clear();
});

it('não atualiza amostras pausadas mesmo quando outro consumidor observa o teste', async () => {
  vi.useFakeTimers(); const cliente = new QueryClient();
  const chave = ['telemetria', 'amostras', { testeId: recurso.id }];
  await cliente.fetchQuery({ queryKey: chave, queryFn: async () => 1, meta: { tempoReal: false } });
  const atualizar = criarAtualizadorTempoReal(cliente); atualizar.avisar(recurso);
  await vi.advanceTimersByTimeAsync(100); expect(cliente.getQueryState(chave)?.isInvalidated).toBe(false);
  atualizar.encerrar(); cliente.clear();
});
