/** Verifica cookies, origem, limite de resposta e cancelamento do transporte Chromium. */
import { EventEmitter } from 'node:events';
import type { Net, Session } from 'electron';
import { describe, expect, it, vi } from 'vitest';
import { fetchDaSessao } from './rede-sessao';

/** Simula somente os eventos da conexão nativa, sem substituir a prova real do Electron. */
function preparar() {
  const pedido = Object.assign(new EventEmitter(), { abort: vi.fn(), end: vi.fn() });
  const request = vi.fn().mockReturnValue(pedido);
  const sessao = {} as Session;
  return { pedido, request, sessao, fetch: fetchDaSessao({ request } as unknown as Pick<Net, 'request'>, sessao) };
}

describe('rede da sessão', () => {
  it('usa origem fixa, cookies da partição e recusa redirecionamento', async () => {
    const f = preparar();
    const resultado = f.fetch('http://localhost:3000/api/v1/auth/logout', { method: 'POST', body: '{}' });
    expect(f.request).toHaveBeenCalledWith(expect.objectContaining({ session: f.sessao, origin: 'http://localhost:5174', useSessionCookies: true, redirect: 'error' }));
    expect(f.pedido.end).toHaveBeenCalledWith('{}');
    const resposta = Object.assign(new EventEmitter(), { statusCode: 204 });
    f.pedido.emit('response', resposta); resposta.emit('end');
    expect((await resultado).status).toBe(204);
  });

  it('aborta requisição cancelada sem enviar corpo', async () => {
    const f = preparar();
    const signal = AbortSignal.abort();
    await expect(f.fetch('http://localhost:3000/api/v1/users/me', { signal })).rejects.toThrow();
    expect(f.pedido.abort).toHaveBeenCalledOnce(); expect(f.pedido.end).not.toHaveBeenCalled();
  });

  it('recusa corpo não serializado antes de abrir conexão', async () => {
    const f = preparar();
    await expect(f.fetch('http://localhost:3000/api/v1/auth/login', { body: new FormData() })).rejects.toThrow();
    expect(f.request).not.toHaveBeenCalled();
  });

  it('limita memória para resposta excessiva', async () => {
    const f = preparar();
    const resultado = f.fetch('http://localhost:3000/api/v1/users/me');
    const resposta = Object.assign(new EventEmitter(), { statusCode: 200 });
    f.pedido.emit('response', resposta); resposta.emit('data', Buffer.alloc(1024 * 1024 + 1));
    await expect(resultado).rejects.toThrow(); expect(f.pedido.abort).toHaveBeenCalledOnce();
  });
});
