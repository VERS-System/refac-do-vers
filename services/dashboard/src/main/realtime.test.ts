/** Confere a fronteira do tempo real sem rede, Electron ou credenciais reais. */
import { EventEmitter } from 'node:events';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { io } from 'socket.io-client';
import { criarTempoReal } from './realtime';

vi.mock('socket.io-client', () => ({ io: vi.fn() }));
const recurso = { type: 'test', id: '11111111-1111-4111-8111-111111111111' };
const outro = { type: 'installation', id: '22222222-2222-4222-8222-222222222222' };
const observacao = '33333333-3333-4333-8333-333333333333';
const seguinte = '44444444-4444-4444-8444-444444444444';

/** Simula transporte com eventos controlados e ACK independente da conexão. */
function socketFalso() {
  const eventos = new EventEmitter();
  const socket = Object.assign(eventos, {
    connect: vi.fn(), disconnect: vi.fn(), timeout: vi.fn(),
    emitWithAck: vi.fn().mockImplementation(async (_acao, dados) => ({ ok: true, ...dados })),
  });
  socket.timeout.mockReturnValue(socket);
  return socket;
}

/** Aguarda as microtarefas de perfil/cookie/ACK sem avançar a reconexão. */
async function concluir() { for (let i = 0; i < 15; i++) await Promise.resolve(); }

/** Prepara uma sessão fictícia com cookie restrito ao processo principal. */
function preparar() {
  const sockets: ReturnType<typeof socketFalso>[] = [];
  vi.mocked(io).mockImplementation(() => { const s = socketFalso(); sockets.push(s); return s as never; });
  const sessao = vi.fn().mockResolvedValue({ ok: true, cookie: 'vers_access=valor.sintetico.local' });
  const avisar = vi.fn();
  return { sockets, sessao, avisar, tempoReal: criarTempoReal('http://localhost:3000/api/v1', sessao, avisar) };
}

describe('tempo real no main', () => {
  beforeEach(() => { vi.useFakeTimers(); vi.clearAllMocks(); });
  afterEach(() => vi.useRealTimers());

  it('recusa destino externo e comandos arbitrários antes de consultar a sessão', async () => {
    expect(() => criarTempoReal('https://outro.test/api/v1', vi.fn(), vi.fn())).toThrow();
    const { tempoReal, sessao } = preparar();
    for (const dados of [null, {}, { observacao, recursos: [recurso], token: 'x' },
      { observacao, recursos: [{ ...recurso, id: '../users/me' }] },
      { observacao, recursos: [{ ...recurso, type: 'user' }] },
      { observacao, recursos: [{ ...recurso, token: 'x' }] },
      { observacao, recursos: [recurso, { ...recurso, id: recurso.id.toUpperCase() }] },
      { observacao, recursos: Array.from({ length: 21 }, () => recurso) }]) {
      expect(tempoReal.observar(dados)).toMatchObject({ ok: false, status: 400 });
    }
    await concluir(); expect(sessao).not.toHaveBeenCalled(); expect(io).not.toHaveBeenCalled();
  });

  it('instala listener antes do connect, envia cookie só ao destino fixo e confirma após ACK', async () => {
    const { tempoReal, sockets, avisar } = preparar();
    expect(tempoReal.observar({ observacao, recursos: [recurso, outro] })).toEqual({ ok: true });
    await concluir(); const s = sockets[0];
    expect(io).toHaveBeenCalledWith('http://localhost:3000/realtime', expect.objectContaining({
      path: '/socket.io', autoConnect: false, reconnection: false, forceNew: true, transports: ['websocket'],
      extraHeaders: { Origin: 'http://localhost:5174', Cookie: 'vers_access=valor.sintetico.local' },
    }));
    expect(s.listenerCount('data.updated')).toBe(1); expect(s.connect).toHaveBeenCalledOnce();
    expect(s.emitWithAck).not.toHaveBeenCalled();
    s.emit('connect'); await concluir();
    expect(s.emitWithAck.mock.calls).toEqual([
      ['subscribe', { version: 1, resource: recurso }], ['subscribe', { version: 1, resource: outro }],
    ]);
    expect(avisar).toHaveBeenCalledWith({ observacao, tipo: 'pronto', recurso });
    expect(JSON.stringify(avisar.mock.calls)).not.toContain('sintetico');
  });

  it('serializa ACKs e só aceita confirmação do recurso solicitado', async () => {
    const { tempoReal, sockets, avisar } = preparar();
    tempoReal.observar({ observacao, recursos: [recurso, outro] }); await concluir();
    let resolver!: (v: unknown) => void;
    sockets[0].emitWithAck.mockImplementationOnce(() => new Promise(r => { resolver = r; }));
    sockets[0].emit('connect'); await concluir();
    expect(sockets[0].emitWithAck).toHaveBeenCalledOnce();
    resolver({ ok: true, version: 1, resource: outro }); await concluir();
    expect(avisar.mock.calls.flat()).not.toContainEqual(expect.objectContaining({ tipo: 'pronto' }));
    expect(sockets[0].disconnect).toHaveBeenCalledOnce();
  });

  it('valida avisos, não trata data como cursor e ignora outro recurso', async () => {
    const { tempoReal, sockets, avisar } = preparar();
    tempoReal.observar({ observacao, recursos: [recurso] }); await concluir();
    const evento = { version: 1, type: 'data.updated', resource: recurso, occurredAt: '2020-01-01T00:00:00.000Z' };
    sockets[0].emit('data.updated', evento); sockets[0].emit('data.updated', evento);
    for (const invalido of [{ ...evento, token: 'x' }, { ...evento, occurredAt: '2026-02-30T00:00:00Z' },
      { ...evento, resource: outro }, { ...evento, version: 2 }, { ...evento, occurredAt: 'ontem' }]) sockets[0].emit('data.updated', invalido);
    expect(avisar.mock.calls.filter(([e]) => e.tipo === 'atualizacao')).toHaveLength(2);
  });

  it('reconecta mesmo após disconnect do servidor, renova credenciais e reassina', async () => {
    const { tempoReal, sockets, avisar, sessao } = preparar();
    tempoReal.observar({ observacao, recursos: [recurso] }); await concluir();
    sockets[0].emit('connect'); await concluir();
    sockets[0].emit('disconnect', 'io server disconnect');
    await vi.advanceTimersByTimeAsync(999); expect(sockets).toHaveLength(1);
    sessao.mockResolvedValue({ ok: true, cookie: 'vers_access=novo.cookie.local' });
    await vi.advanceTimersByTimeAsync(1); await concluir();
    expect(sockets).toHaveLength(2); expect(sessao).toHaveBeenCalledTimes(2);
    sockets[1].emit('connect'); await concluir();
    expect(avisar.mock.calls.filter(([e]) => e.tipo === 'pronto')).toHaveLength(2);
  });

  it('não revela causa do erro e mantém espera crescente limitada a 30 segundos', async () => {
    const { tempoReal, sockets, avisar } = preparar();
    tempoReal.observar({ observacao, recursos: [recurso] }); await concluir();
    for (const espera of [1000, 2000, 4000, 8000, 16000, 30000, 30000]) {
      const quantidade = sockets.length;
      sockets.at(-1)!.emit('connect_error', new Error('Cookie=segredo'));
      await vi.advanceTimersByTimeAsync(espera - 1); expect(sockets).toHaveLength(quantidade);
      await vi.advanceTimersByTimeAsync(1); await concluir(); expect(sockets).toHaveLength(quantidade + 1);
    }
    expect(JSON.stringify(avisar.mock.calls)).not.toContain('segredo'); tempoReal.encerrar();
  });

  it('distingue recurso não autorizado e sessão expirada de indisponibilidade', async () => {
    const { tempoReal, sockets, avisar, sessao } = preparar();
    tempoReal.observar({ observacao, recursos: [recurso, outro] }); await concluir();
    sockets[0].emitWithAck.mockResolvedValueOnce({ ok: false, version: 1, code: 'RESOURCE_UNAVAILABLE' });
    sockets[0].emit('connect'); await concluir();
    expect(avisar).toHaveBeenCalledWith({ observacao, tipo: 'recurso-indisponivel', recurso });
    expect(avisar).toHaveBeenCalledWith({ observacao, tipo: 'pronto', recurso: outro });
    sockets[0].emit('disconnect');
    sessao.mockResolvedValue({ ok: false, status: 401, erro: 'HTTP' });
    await vi.advanceTimersByTimeAsync(1000); await concluir();
    expect(avisar).toHaveBeenCalledWith({ observacao, tipo: 'sessao-expirada' });
    await vi.advanceTimersByTimeAsync(60000); expect(sockets).toHaveLength(1);
  });

  it('descarta ACKs, eventos e preparações tardias após troca de observação ou encerramento', async () => {
    const { tempoReal, sockets, avisar, sessao } = preparar();
    tempoReal.observar({ observacao, recursos: [recurso] }); await concluir();
    let resolver!: (v: unknown) => void;
    sockets[0].emitWithAck.mockImplementationOnce(() => new Promise(r => { resolver = r; }));
    sockets[0].emit('connect'); await concluir();
    tempoReal.observar({ observacao: seguinte, recursos: [outro] }); await concluir();
    resolver({ ok: true, version: 1, resource: recurso }); await concluir();
    expect(avisar.mock.calls.flat()).not.toContainEqual({ observacao, tipo: 'pronto', recurso });
    expect(sockets[0].listenerCount('data.updated')).toBe(0);
    let autorizar!: (v: unknown) => void;
    sessao.mockImplementationOnce(() => new Promise(r => { autorizar = r; }));
    tempoReal.observar({ observacao, recursos: [recurso] }); tempoReal.encerrar();
    await concluir(); autorizar({ ok: true, cookie: 'vers_access=tardio.cookie.local' }); await concluir();
    expect(sockets).toHaveLength(2); await vi.advanceTimersByTimeAsync(60000); expect(sockets).toHaveLength(2);
  });

  it('lista vazia cancela a observação sem rede ou reconexão', async () => {
    const { tempoReal, sockets, sessao } = preparar();
    tempoReal.observar({ observacao, recursos: [recurso] }); await concluir();
    tempoReal.observar({ observacao: seguinte, recursos: [] }); await concluir();
    expect(sockets[0].disconnect).toHaveBeenCalledOnce(); expect(sessao).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(60000); expect(sockets).toHaveLength(1);
  });
});
