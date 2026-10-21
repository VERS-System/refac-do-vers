/** Adapta a ponte Electron aos contratos de autenticação já usados pelas telas. */
import type { UserProfile } from '@vers/shared-types';
import type { PonteSessao, ResultadoSessao } from '../../shared/sessao';
import type { AtualizacaoPerfil, Credenciais, NovaConta, Usuario } from './tipos';
import { ErroRepositorio } from './erros';

/** Converte campos públicos sem substituir ausência de dados por identidade fictícia. */
function usuarioDaApi(p: UserProfile): Usuario {
  return { id: p.id, nome: p.displayName ?? p.email, email: p.email,
    emailVerificado: p.emailVerifiedAt !== null,
    funcao: p.roles.includes('ADMIN') ? 'Administrador' : 'Usuário',
    ...(p.avatarUrl ? { foto: p.avatarUrl } : {}) };
}

/** Traduz respostas seguras, notificando troca de identidade somente quando confirmada. */
export function criarAutenticacao(ponte: PonteSessao | undefined, alterar: (usuario: Usuario | null, expirada?: true) => void) {
  /** Executa uma chamada sem replay e converte falhas para mensagens públicas. */
  async function chamar(acao: () => Promise<ResultadoSessao>, login = false): Promise<Extract<ResultadoSessao, { ok: true }>> {
    let resultado: ResultadoSessao;
    try {
      if (!ponte) throw new Error();
      resultado = await acao();
    } catch { throw new ErroRepositorio('indisponivel', 'Não foi possível comunicar com a API local.'); }
    if (resultado.ok) return resultado;
    if (resultado.status === 401) {
      if (!login) alterar(null, true);
      throw new ErroRepositorio(login ? 'credenciais-invalidas' : 'sessao-expirada', login ? 'E-mail ou senha incorretos.' : 'Sua sessão expirou. Entre de novo.');
    }
    if (resultado.status === 429) throw new ErroRepositorio('limite-tentativas', 'Muitas tentativas. Aguarde e tente de novo.');
    if (resultado.status === 403) throw new ErroRepositorio('acesso-negado', 'A operação não foi autorizada.');
    if (resultado.status === 409) throw new ErroRepositorio('conflito', 'Os dados foram alterados. Confira e tente de novo.');
    if ([400, 422].includes(resultado.status)) throw new ErroRepositorio('validacao', 'Confira os campos informados.');
    throw new ErroRepositorio('indisponivel', 'Não foi possível comunicar com a API local.');
  }

  /** Exige perfil onde o contrato promete usuário; ausência nunca vira dado de exemplo. */
  function lerUsuario(resultado: Extract<ResultadoSessao, { ok: true }>): Usuario {
    if (!resultado.usuario) throw new ErroRepositorio('indisponivel', 'A API local retornou um perfil inválido.');
    return usuarioDaApi(resultado.usuario);
  }

  return {
    /** Consulta perfil; renovação limitada ocorre na ponte principal. */
    obterUsuarioAtual: async () => lerUsuario(await chamar(() => ponte!.perfil())),
    /** Inicia sessão e informa a nova identidade para limpar o cache anterior. */
    entrar: async (dados: Credenciais) => {
      const usuario = lerUsuario(await chamar(() => ponte!.entrar({ email: dados.email, password: dados.senha }), true));
      alterar(usuario); return usuario;
    },
    /** Envia cadastro sem autenticar nem afirmar entrega de email. */
    registrar: async (dados: NovaConta) => {
      await chamar(() => ponte!.registrar({ email: dados.email, password: dados.senha,
        ...(dados.nome !== undefined ? { displayName: dados.nome } : {}) }), true);
    },
    /** Salva somente nome/avatar remoto; upload de arquivo não tem contrato nesta API. */
    atualizarPerfil: async (dados: AtualizacaoPerfil) => {
      if (dados.foto && !/^https?:\/\//.test(dados.foto)) throw new ErroRepositorio('validacao', 'O envio de fotos ainda não está disponível. Remova a foto para salvar.');
      return lerUsuario(await chamar(() => ponte!.atualizarPerfil({
        ...(dados.nome !== undefined ? { displayName: dados.nome } : {}),
        ...(dados.foto !== undefined ? { avatarUrl: dados.foto } : {}),
      })));
    },
    /** Revoga todas as sessões antes de remover a identidade local. */
    encerrarSessoes: async () => { await chamar(() => ponte!.sairDeTodas()); alterar(null); },
    /** Confirma logout no servidor antes de remover dados da conta. */
    sair: async () => { await chamar(() => ponte!.sair()); alterar(null); },
  };
}
