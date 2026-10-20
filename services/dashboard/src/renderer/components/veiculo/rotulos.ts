/**
 * Textos e tons da tela Veículo e instalação: relação com o veículo, status
 * da instalação e das revisões, associação dos piezos e armazenamento.
 */

import type { BadgeTone } from '@/components/ui/Badge';
import type {
  AssociacaoPiezos,
  RelacaoVeiculo,
  StatusInstalacao,
  StatusRevisao,
  TipoArmazenamento,
} from '@/data/tipos';

export const TEXTO_RELACAO: Record<RelacaoVeiculo, string> = {
  proprietario: 'Proprietário',
  motorista: 'Motorista',
  administrador: 'Administrador',
};

export const BADGE_INSTALACAO: Record<StatusInstalacao, { texto: string; tom: BadgeTone }> = {
  ativa: { texto: 'Ativa', tom: 'success' },
  manutencao: { texto: 'Em manutenção', tom: 'warning' },
  inativa: { texto: 'Inativa', tom: 'neutral' },
  falha: { texto: 'Falha', tom: 'danger' },
};

export const BADGE_REVISAO: Record<StatusRevisao, { texto: string; tom: BadgeTone }> = {
  aberta: { texto: 'Aberta', tom: 'info' },
  'em-revisao': { texto: 'Em revisão', tom: 'warning' },
  agendada: { texto: 'Agendada', tom: 'info' },
  resolvida: { texto: 'Resolvida', tom: 'success' },
  cancelada: { texto: 'Cancelada', tom: 'neutral' },
};

export const ASSOCIACOES: { valor: AssociacaoPiezos; rotulo: string }[] = [
  { valor: 'serie', rotulo: 'Série' },
  { valor: 'paralelo', rotulo: 'Paralelo' },
  { valor: 'misto', rotulo: 'Misto' },
];

export const TEXTO_ARMAZENAMENTO: Record<TipoArmazenamento, string> = {
  bateria: 'Bateria',
  supercapacitor: 'Supercapacitor',
  capacitor: 'Capacitor',
  nenhum: 'Sem armazenamento',
};

/** Aviso das ações que dependem do backend real. */
export const DISPONIVEL_COM_A_API = 'Disponível com a API.';
