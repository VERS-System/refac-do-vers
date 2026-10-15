/**
 * Dados de energia do período escolhido na barra superior, compartilhados
 * pela Visão geral e pela tela Energia.
 *
 * O card "Energia recuperada" e o gráfico de energia mudam juntos com o
 * período: Hora e Dia mostram a curva de potência (a última hora ou o dia
 * todo); Semana e Mês mostram a energia por dia em barras. Este hook
 * concentra essa escolha para os componentes não repetirem a mesma lógica.
 */

import { recortarUltimosMinutos } from '@/data/calculos';
import { useCurvaDoDia, useDiasDoPeriodo, useResumoEnergia } from '@/hooks/useDados';
import { usePeriodoStore, type Periodo } from '@/stores/periodo';

/** Minutos mostrados no período Hora. */
export const MINUTOS_DA_HORA = 60;

/** Períodos cujo gráfico de energia é de barras (um dia por barra). */
export type PeriodoEmBarras = Extract<Periodo, 'semana' | 'mes'>;

/** Rótulo do KPI "Energia recuperada" em cada período. */
export const ROTULOS_ENERGIA: Record<Periodo, string> = {
  hora: 'Energia recuperada na última hora',
  dia: 'Energia recuperada hoje',
  semana: 'Energia recuperada na semana',
  mes: 'Energia recuperada no mês',
};

/** Indica se o gráfico do período é de barras (Semana e Mês) ou uma curva (Hora e Dia). */
export function periodoEmBarras(periodo: Periodo): PeriodoEmBarras | null {
  return periodo === 'semana' || periodo === 'mes' ? periodo : null;
}

/**
 * Lê o período global e as consultas de energia que ele exige.
 *
 * Todas as consultas são chamadas sempre (regra dos hooks), mas a de dias só
 * roda em Semana e Mês. Os pontos da curva já vêm recortados na última hora
 * quando o período é Hora.
 */
export function useEnergiaDoPeriodo() {
  const periodo = usePeriodoStore((estado) => estado.periodo);
  const resumo = useResumoEnergia();
  const curva = useCurvaDoDia();
  const dias = useDiasDoPeriodo(periodoEmBarras(periodo));

  const pontosCurva = curva.data
    ? periodo === 'hora'
      ? recortarUltimosMinutos(curva.data.pontos, MINUTOS_DA_HORA)
      : curva.data.pontos
    : undefined;

  return { periodo, resumo, curva, pontosCurva, dias };
}
