/**
 * Texto e tom dos badges da Telemetria: qualidade das amostras e estado da
 * conexão ao vivo.
 *
 * Ficam juntos para que a mesma qualidade (ou o mesmo estado) apareça sempre
 * com o mesmo nome e a mesma cor nas últimas leituras e na tabela.
 */

import type { BadgeTone } from '@/components/ui/Badge';
import type { EstadoConexao } from '@/data/calculos';
import { TEXTO_QUALIDADE } from '@/data/exportacao';
import type { QualidadeAmostra } from '@/data/tipos';

/** Badge de cada qualidade: verde válida, laranja parcial, vermelho suspeita, neutro inválida. */
export const BADGE_QUALIDADE: Record<QualidadeAmostra, { texto: string; tom: BadgeTone }> = {
  valida: { texto: TEXTO_QUALIDADE.valida, tom: 'success' },
  parcial: { texto: TEXTO_QUALIDADE.parcial, tom: 'warning' },
  suspeita: { texto: TEXTO_QUALIDADE.suspeita, tom: 'danger' },
  invalida: { texto: TEXTO_QUALIDADE.invalida, tom: 'neutral' },
};

/** Badge de cada estado da conexão ao vivo (task D05 da equipe). */
export const BADGE_CONEXAO: Record<EstadoConexao, { texto: string; tom: BadgeTone }> = {
  conectando: { texto: 'Conectando', tom: 'info' },
  conectado: { texto: 'Conectado', tom: 'success' },
  reconectando: { texto: 'Reconectando', tom: 'warning' },
  desatualizado: { texto: 'Desatualizado', tom: 'warning' },
  offline: { texto: 'Offline', tom: 'danger' },
  pausado: { texto: 'Pausado', tom: 'neutral' },
};
