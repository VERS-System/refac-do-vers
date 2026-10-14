/**
 * Dados de energia do período escolhido na barra superior, prontos para a
 * Visão geral.
 *
 * O card "Energia recuperada" e o gráfico grande mudam juntos com o período:
 * Hora e Dia mostram a curva de potência (a última hora ou o dia todo);
 * Semana e Mês mostram a energia por dia. Este hook concentra essa escolha
 * para os dois componentes não repetirem a mesma lógica.
 */

import { recortarUltimosMinutos } from '@/data/calculos';
import type { PeriodoComDias } from '@/data/repositorio';
import { useCurvaDoDia, useDiasDoPeriodo, useResumoEnergia } from '@/hooks/useDados';
import { usePeriodoStore, type Periodo } from '@/stores/periodo';

/** Minutos mostrados no período Hora. */
export const MINUTOS_DA_HORA = 60;

/** Indica se o período se divide em dias (barras) ou é uma curva. */
export function periodoComDias(periodo: Periodo): PeriodoComDias | null {
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
  const dias = useDiasDoPeriodo(periodoComDias(periodo));

  const pontosCurva = curva.data
    ? periodo === 'hora'
      ? recortarUltimosMinutos(curva.data.pontos, MINUTOS_DA_HORA)
      : curva.data.pontos
    : undefined;

  return { periodo, resumo, curva, pontosCurva, dias };
}
