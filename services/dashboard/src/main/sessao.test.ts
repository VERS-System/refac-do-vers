/** Verifica a fronteira de sessão sem depender de cookies ou serviços reais. */
import { describe, expect, it, vi } from 'vitest';
import { criarSessao, validarApiLocal, remetentePermitido } from './sessao';

describe('sessão desktop', () => {
  it('restringe o destino à API HTTP local sem credenciais ou parâmetros', () => {
    expect(validarApiLocal('http://localhost:3000/api/v1')).toBe('http://localhost:3000/api/v1');
    for (const url of ['http://127.0.0.1/api/v1', 'http://[::1]/api/v1', 'https://example.com/api/v1', 'http://localhost.evil/api/v1', 'http://u:p@localhost/api/v1', 'http://localhost/api/v1?x=1', 'http://localhost/other']) {
      expect(() => validarApiLocal(url)).toThrow();
    }
  });

  it('aceita somente a janela e o frame principal na página prevista', () => {
    const frame = { url: 'file:///app/index.html#/login' };
    const sender = { mainFrame: frame };
    expect(remetentePermitido({ sender, senderFrame: frame }, sender, 'file:///app/index.html')).toBe(true);
    expect(remetentePermitido({ sender, senderFrame: { ...frame } }, sender, frame.url)).toBe(false);
    expect(remetentePermitido({ sender, senderFrame: frame }, {}, frame.url)).toBe(false);
    expect(remetentePermitido({ sender, senderFrame: frame }, sender, 'file:///other.html')).toBe(false);
  });

  it('obtém CSRF antes do login, restringe o retorno e persiste cookies', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(Response.json({ data: { csrfToken: 'a'.repeat(64) } }))
      .mockResolvedValueOnce(Response.json({ data: { user: { id: '1', email: 'a@b.c', roles: ['USER'], status: 'ACTIVE', displayName: null, avatarUrl: null, emailVerifiedAt: null, createdAt: '2026-01-01', updatedAt: '2026-01-01', accessToken: 'segredo' } } }));
    const flushStore = vi.fn().mockResolvedValue(undefined);
    const sessao = criarSessao({ fetch, cookies: { flushStore } }, 'http://localhost:3000/api/v1');
    const resultado = await sessao('entrar', { email: 'a@b.c', password: 'senha' });
    expect(resultado.ok).toBe(true);
    expect(JSON.stringify(resultado)).not.toContain('segredo');
    expect(fetch.mock.calls[1][0]).toBe('http://localhost:3000/api/v1/auth/login');
    expect(fetch.mock.calls[1][1]).toMatchObject({ method: 'POST', credentials: 'include', redirect: 'error', headers: { Origin: 'http://localhost:5174', 'x-csrf-token': 'a'.repeat(64) } });
    expect(flushStore).toHaveBeenCalledOnce();
  });

  it('rejeita operações e payloads arbitrários antes da rede', async () => {
    const fetch = vi.fn();
    const sessao = criarSessao({ fetch, cookies: { flushStore: vi.fn() } }, 'http://localhost:3000/api/v1');
    for (const [acao, dados] of [['url', {}], [['perfil'], undefined], ['entrar', { email: 'a', password: 'b', url: 'http://evil' }], ['sair', { headers: {} }], ['entrar', null]]) {
      expect(await sessao(acao, dados)).toEqual({ ok: false, status: 400, erro: 'REQUISICAO_INVALIDA' });
    }
    expect(fetch).not.toHaveBeenCalled();
  });

  it('preserva rejeição HTTP sem expor corpo e não repete mutação', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(Response.json({ data: { csrfToken: 'a'.repeat(64) } }))
      .mockResolvedValueOnce(Response.json({ password: 'segredo' }, { status: 401 }));
    const sessao = criarSessao({ fetch, cookies: { flushStore: vi.fn() } }, 'http://localhost:3000/api/v1');
    expect(await sessao('renovar')).toEqual({ ok: false, status: 401, erro: 'HTTP' });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('traduz rede indisponível e CSRF inválido sem enviar mutação', async () => {
    const fetch = vi.fn().mockRejectedValueOnce(new Error('detalhe privado'))
      .mockResolvedValueOnce(Response.json({ data: { csrfToken: 'invalido' } }));
    const sessao = criarSessao({ fetch, cookies: { flushStore: vi.fn() } }, 'http://localhost:3000/api/v1');
    expect(await sessao('perfil')).toEqual({ ok: false, status: 0, erro: 'CONEXAO' });
    expect(await sessao('sair')).toEqual({ ok: false, status: 0, erro: 'RESPOSTA_INVALIDA' });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('serializa renovações e continua após falha de rede', async () => {
    let finalizar!: (value: Response) => void;
    const fetch = vi.fn().mockImplementationOnce(() => new Promise<Response>(ok => { finalizar = ok; }))
      .mockRejectedValueOnce(new Error('queda'))
      .mockResolvedValueOnce(Response.json({ data: { csrfToken: 'a'.repeat(64) } }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    const flushStore = vi.fn().mockResolvedValue(undefined);
    const sessao = criarSessao({ fetch, cookies: { flushStore } }, 'http://localhost:3000/api/v1');
    const primeira = sessao('renovar');
    const segunda = sessao('renovar');
    await Promise.resolve();
    expect(fetch).toHaveBeenCalledTimes(1);
    finalizar(Response.json({ data: { csrfToken: 'a'.repeat(64) } }));
    expect((await primeira).ok).toBe(false);
    expect(await segunda).toEqual({ ok: true });
    expect(fetch).toHaveBeenCalledTimes(4);
    expect(flushStore).toHaveBeenCalledOnce();
  });
});
