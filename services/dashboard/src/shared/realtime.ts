/** Contrato público de avisos; não transporta medições, URLs ou credenciais. */
import type { ResultadoSessao } from './sessao';

export type RecursoTempoReal = Readonly<{ type: 'test' | 'installation'; id: string }>;
export type ObservacaoTempoReal = Readonly<{ observacao: string; recursos: readonly RecursoTempoReal[] }>;
export type AvisoTempoReal = Readonly<{ observacao: string } & (
  | { tipo: 'conectando' | 'desconectado' | 'sessao-expirada' }
  | { tipo: 'pronto' | 'atualizacao' | 'recurso-indisponivel'; recurso: RecursoTempoReal }
)>;

export interface PonteTempoReal {
  observar(dados: ObservacaoTempoReal): Promise<ResultadoSessao>;
  receber(ouvinte: (aviso: AvisoTempoReal) => void): () => void;
}
