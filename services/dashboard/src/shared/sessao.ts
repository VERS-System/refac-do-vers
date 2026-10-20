/** Contrato restrito da ponte de sessão; nunca transporta cookies ou JWTs. */
import type { LoginRequest, UserProfile } from '@vers/shared-types';

export type ResultadoSessao =
  | { ok: true; usuario?: UserProfile }
  | { ok: false; status: number; erro: 'HTTP' | 'CONEXAO' | 'RESPOSTA_INVALIDA' | 'REQUISICAO_INVALIDA' | 'REMETENTE_INVALIDO' };

export interface PonteSessao {
  entrar(dados: LoginRequest): Promise<ResultadoSessao>;
  perfil(): Promise<ResultadoSessao>;
  renovar(): Promise<ResultadoSessao>;
  sair(): Promise<ResultadoSessao>;
}

declare global {
  interface Window {
    vers: { plataforma: string; sessao: PonteSessao };
  }
}
