/**
 * Estado global do período exibido nas telas de dados (Hora, Dia, Semana, Mês).
 *
 * Fica no Zustand porque é compartilhado: o período escolhido na Visão geral
 * continua valendo ao abrir a Energia. Na Fase 3 os hooks de dados passam a
 * ler este período para buscar as fixtures certas.
 */

import { create } from 'zustand';

export type Periodo = 'hora' | 'dia' | 'semana' | 'mes';

/** Período inicial, o mesmo das referências do Stitch. */
export const PERIODO_PADRAO: Periodo = 'dia';

interface PeriodoState {
  periodo: Periodo;
  setPeriodo: (periodo: Periodo) => void;
}

/** Hook do estado do período; `setPeriodo` troca o período de todas as telas. */
export const usePeriodoStore = create<PeriodoState>()((set) => ({
  periodo: PERIODO_PADRAO,
  setPeriodo: (periodo) => set({ periodo }),
}));
