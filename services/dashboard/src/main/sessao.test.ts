/** Verifica a fronteira de sessão sem depender de cookies ou serviços reais. */
import { describe, expect, it, vi } from 'vitest';
import { criarSessao, validarApiLocal, remetentePermitido } from './sessao';
import { userProfileFixture } from '@vers/shared-types';

describe('sessão desktop', () => {
  it('aceita cadastro202 sem criar sessão', async () => {
    const csrf = () => Response.json({ data: { csrfToken: 'a'.repeat(64) } });
    const fetch = vi.fn().mockResolvedValueOnce(csrf()).mockResolvedValueOnce(new Response(null, { status: 202 }));
    const sessao = criarSessao({ fetch, cookies: { flushStore: vi.fn() } }, 'http://localhost:3000/api/v1');
    expect(await sessao('registrar', { email: 'novo@vers.test', password: 'Segredo!1', displayName: 'Novo' })).toEqual({ ok: true });
    expect(fetch.mock.calls[1][0]).toContain('/auth/register');
    expect(fetch.mock.calls[1][1].body).toContain('displayName');
  });

  it.each(['atualizarPerfil', 'sairDeTodas'])('verifica acesso e envia%s uma vez sem replay', async acao => {
    const fetch = vi.fn().mockResolvedValueOnce(Response.json({ data: userProfileFixture }))
      .mockResolvedValueOnce(Response.json({ data: { csrfToken: 'a'.repeat(64) } }))
      .mockResolvedValueOnce(new Response(null, { status: 401 }));
    const sessao = criarSessao({ fetch, cookies: { flushStore: vi.fn() } }, 'http://localhost:3000/api/v1');
    expect(await sessao(acao, acao === 'atualizarPerfil' ? { displayName: 'Novo' } : undefined)).toMatchObject({ ok: false, status: 401 });
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(fetch.mock.calls[2][1].method).toBe(acao === 'atualizarPerfil' ? 'PATCH' : 'POST');
  });

  it('compartilha refresh único entre duas leituras concorrentes após expiração', async () => {
    let autorizado = false;
    const fetch = vi.fn().mockImplementation(async (url: string) => {
      if (url.endsWith('/auth/csrf')) return Response.json({ data: { csrfToken: 'a'.repeat(64) } });
      if (url.endsWith('/auth/refresh')) { autorizado = true; return new Response(null, { status: 204 }); }
      return autorizado ? Response.json({ data: userProfileFixture }) : new Response(null, { status: 401 });
    });
    const sessao = criarSessao({ fetch, cookies: { flushStore: vi.fn() } }, 'http://localhost:3000/api/v1');
    expect((await Promise.all([sessao('perfil'), sessao('perfil')])).every(r => r.ok)).toBe(true);
    expect(fetch.mock.calls.filter(c => c[0].endsWith('/auth/refresh'))).toHaveLength(1);
  });

  it('renova uma vez após perfil401 e repete somente a leitura', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(Response.json({ data: { csrfToken: 'a'.repeat(64) } }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(new Response(null, { status: 401 }));
    const sessao = criarSessao({ fetch, cookies: { flushStore: vi.fn() } }, 'http://localhost:3000/api/v1');
    expect(await sessao('perfil')).toEqual({ ok: false, status: 401, erro: 'HTTP' });
    expect(fetch.mock.calls.map(c => c[0])).toEqual([
      'http://localhost:3000/api/v1/users/me', 'http://localhost:3000/api/v1/auth/csrf',
      'http://localhost:3000/api/v1/auth/refresh', 'http://localhost:3000/api/v1/users/me',
    ]);
  });

  it('recusa campos fora do contrato no cadastro/perfil/logout-all', async () => {
    const fetch = vi.fn();
    const sessao = criarSessao({ fetch, cookies: { flushStore: vi.fn() } }, 'http://localhost:3000/api/v1');
    for (const [acao, dados] of [['registrar', { email: 'a', password: 'b', roles: ['ADMIN'] }], ['atualizarPerfil', { id: 'outro' }], ['sairDeTodas', {}]]) {
      expect(await sessao(acao, dados)).toEqual({ ok: false, status: 400, erro: 'REQUISICAO_INVALIDA' });
    }
    expect(fetch).not.toHaveBeenCalled();
  });
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
