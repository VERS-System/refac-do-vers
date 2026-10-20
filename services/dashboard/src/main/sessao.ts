/** Executa somente operações de sessão na API local, fora do renderer. */
import type { Session } from 'electron';
import type { UserProfile } from '@vers/shared-types';
import type { ResultadoSessao } from '../shared/sessao';
import { navegacaoPermitida } from './seguranca';

/** Recusa destinos externos e caminhos arbitrários antes de qualquer conexão. */
export function validarApiLocal(endereco: string): string {
  const url = new URL(endereco);
  if (url.protocol !== 'http:' || url.hostname !== 'localhost'
    || url.username || url.password || url.search || url.hash || url.pathname !== '/api/v1') {
    throw new Error('API local inválida');
  }
  return url.href;
}

/** Exige a janela conhecida e seu frame principal na página originalmente carregada. */
export function remetentePermitido(
  evento: { sender: unknown; senderFrame: { url: string } | null },
  esperado: { mainFrame?: unknown }, pagina: string,
): boolean {
  return evento.sender === esperado && evento.senderFrame === esperado.mainFrame
    && !!evento.senderFrame && navegacaoPermitida(evento.senderFrame.url, pagina);
}

/** Valida e copia somente os campos públicos definidos no contrato do perfil. */
function perfilPublico(valor: unknown): UserProfile {
  if (!valor || typeof valor !== 'object') throw new Error('Perfil inválido');
  const p = valor as Record<string, unknown>;
  if (!['id', 'email', 'createdAt', 'updatedAt'].every(c => typeof p[c] === 'string')
    || !['displayName', 'avatarUrl', 'emailVerifiedAt'].every(c => p[c] === null || typeof p[c] === 'string')
    || !Array.isArray(p.roles) || !p.roles.every(r => r === 'USER' || r === 'ADMIN')
    || !['ACTIVE', 'BLOCKED', 'PENDING_VERIFICATION'].includes(String(p.status))) throw new Error('Perfil inválido');
  return { id: p.id, email: p.email, displayName: p.displayName, avatarUrl: p.avatarUrl,
    roles: p.roles, status: p.status, emailVerifiedAt: p.emailVerifiedAt,
    createdAt: p.createdAt, updatedAt: p.updatedAt } as UserProfile;
}

/** Serializa a sessão para evitar que CSRF ou rotação concorrentes invalidem cookies. */
export function criarSessao(rede: Pick<Session, 'fetch'> & { cookies: Pick<Session['cookies'], 'flushStore'> }, endereco: string) {
  const base = validarApiLocal(endereco);
  let fila: Promise<unknown> = Promise.resolve();

  /** Executa uma operação validada, sem devolver corpo bruto ou repetir mutações. */
  async function executar(acao: unknown, dados?: unknown): Promise<ResultadoSessao> {
    if (typeof acao !== 'string' || !['entrar', 'perfil', 'renovar', 'sair'].includes(acao)
      || (acao !== 'entrar' && dados !== undefined)
      || (acao === 'entrar' && (!dados || typeof dados !== 'object'
        || Object.keys(dados).sort().join(',') !== 'email,password'
        || typeof (dados as Record<string, unknown>).email !== 'string'
        || typeof (dados as Record<string, unknown>).password !== 'string'
        || (dados as { email: string }).email.length > 320
        || (dados as { password: string }).password.length > 1024))) {
      return { ok: false, status: 400, erro: 'REQUISICAO_INVALIDA' };
    }
    const signal = AbortSignal.timeout(10_000);
    const opcoes = { credentials: 'include' as const, redirect: 'error' as const, signal };
    let resposta: Response;
    try {
      if (acao === 'perfil') resposta = await rede.fetch(`${base}/users/me`, opcoes);
      else {
        const csrf = await rede.fetch(`${base}/auth/csrf`, opcoes);
        if (!csrf.ok) return { ok: false, status: csrf.status, erro: 'HTTP' };
        let token: unknown;
        try { token = (await csrf.json()).data?.csrfToken; } catch { /* Retorno inválido abaixo. */ }
        if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) {
          return { ok: false, status: 0, erro: 'RESPOSTA_INVALIDA' };
        }
        const rota = acao === 'entrar' ? 'login' : acao === 'renovar' ? 'refresh' : 'logout';
        resposta = await rede.fetch(`${base}/auth/${rota}`, { ...opcoes, method: 'POST',
          headers: { Origin: 'http://localhost:5174', 'Content-Type': 'application/json', 'x-csrf-token': token },
          body: JSON.stringify(acao === 'entrar' ? dados : {}),
        });
        await rede.cookies.flushStore();
      }
    } catch { return { ok: false, status: 0, erro: 'CONEXAO' }; }
    if (!resposta.ok) return { ok: false, status: resposta.status, erro: 'HTTP' };
    if (acao === 'renovar' || acao === 'sair') return resposta.status === 204
      ? { ok: true } : { ok: false, status: 0, erro: 'RESPOSTA_INVALIDA' };
    try {
      const { data } = await resposta.json();
      return { ok: true, usuario: perfilPublico(acao === 'entrar' ? data?.user : data) };
    } catch { return { ok: false, status: 0, erro: 'RESPOSTA_INVALIDA' }; }
  }

  /** Enfileira chamadas da ponte mantendo a fila utilizável após uma falha. */
  return (acao: unknown, dados?: unknown): Promise<ResultadoSessao> => {
    const resultado = fila.then(() => executar(acao, dados));
    fila = resultado.catch(() => undefined);
    return resultado;
  };
}
