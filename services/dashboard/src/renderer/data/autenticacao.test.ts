/** Verifica tradução de contratos e isolamento da autenticação real. */
import { describe, expect, it, vi } from 'vitest';
import { userProfileFixture } from '@vers/shared-types';
import type { PonteSessao } from '../../shared/sessao';
import { criarAutenticacao } from './autenticacao';

/** Cria ponte controlada sem rede para verificar cada contrato público. */
function preparar() {
  const ponte = { entrar: vi.fn(), perfil: vi.fn(), renovar: vi.fn(), sair: vi.fn(), registrar: vi.fn(), atualizarPerfil: vi.fn(), sairDeTodas: vi.fn() } satisfies PonteSessao;
  const alterar = vi.fn();
  return { ponte, alterar, api: criarAutenticacao(ponte, alterar) };
}

describe('autenticação real', () => {
  it('traduz login/perfil sem inventar nome, foto ou permissões', async () => {
    const f = preparar();
    f.ponte.entrar.mockResolvedValue({ ok: true, usuario: { ...userProfileFixture, displayName: null, avatarUrl: null, roles: ['USER'] } });
    const usuario = await f.api.entrar({ email: 'a@b.test', senha: 'segredo' });
    expect(f.ponte.entrar).toHaveBeenCalledWith({ email: 'a@b.test', password: 'segredo' });
    expect(usuario.nome).toBe(userProfileFixture.email);
    expect(usuario.foto).toBeUndefined(); expect(usuario.funcao).toBe('Usuário');
    expect(f.alterar).toHaveBeenCalledWith(usuario);
  });

  it('cadastro aceita202 sem iniciar sessão e mantém nomes do contrato', async () => {
    const f = preparar(); f.ponte.registrar.mockResolvedValue({ ok: true });
    await f.api.registrar({ email: 'novo@vers.test', senha: 'Segredo!1', nome: 'Novo' });
    expect(f.ponte.registrar).toHaveBeenCalledWith({ email: 'novo@vers.test', password: 'Segredo!1', displayName: 'Novo' });
    expect(f.alterar).not.toHaveBeenCalled();
  });

  it.each([400, 403, 409, 422, 429, 503, 0])('trata status%s sem fallback ou corpo bruto', async status => {
    const f = preparar(); f.ponte.perfil.mockResolvedValue({ ok: false, status, erro: 'HTTP' });
    await expect(f.api.obterUsuarioAtual()).rejects.toThrow();
    expect(f.alterar).not.toHaveBeenCalled(); expect(f.ponte.perfil).toHaveBeenCalledOnce();
  });

  it('401 protegido remove identidade, mas login recusado não simula sucesso', async () => {
    const f = preparar(); f.ponte.perfil.mockResolvedValue({ ok: false, status: 401, erro: 'HTTP' });
    await expect(f.api.obterUsuarioAtual()).rejects.toMatchObject({ codigo: 'sessao-expirada' });
    expect(f.alterar).toHaveBeenCalledWith(null, true);
    f.alterar.mockClear(); f.ponte.entrar.mockResolvedValue({ ok: false, status: 401, erro: 'HTTP' });
    await expect(f.api.entrar({ email: 'a', senha: 'b' })).rejects.toMatchObject({ codigo: 'credenciais-invalidas' });
    expect(f.alterar).not.toHaveBeenCalled();
  });

  it('só limpa identidade após logout confirmado e recusa foto blob', async () => {
    const f = preparar(); f.ponte.sair.mockResolvedValueOnce({ ok: false, status: 503, erro: 'HTTP' }).mockResolvedValueOnce({ ok: true });
    await expect(f.api.sair()).rejects.toThrow(); expect(f.alterar).not.toHaveBeenCalled();
    await f.api.sair(); expect(f.alterar).toHaveBeenCalledWith(null);
    await expect(f.api.atualizarPerfil({ foto: 'blob:temporario' })).rejects.toMatchObject({ codigo: 'validacao' });
    expect(f.ponte.atualizarPerfil).not.toHaveBeenCalled();
  });

  it('não expõe exceção IPC nem repete operação', async () => {
    const f = preparar(); f.ponte.sairDeTodas.mockRejectedValue(new Error('segredo interno'));
    await expect(f.api.encerrarSessoes()).rejects.toThrow('Não foi possível comunicar com a API local.');
    expect(f.ponte.sairDeTodas).toHaveBeenCalledOnce(); expect(f.alterar).not.toHaveBeenCalled();
  });
});
