/**
 * Seletor de período da barra superior (Hora, Dia, Semana, Mês).
 *
 * Liga o `SegmentedControl` ao estado global do período, para que a escolha
 * valha em todas as telas de dados.
 */

import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { usePeriodoStore, type Periodo } from '@/stores/periodo';

const OPCOES: { value: Periodo; label: string }[] = [
  { value: 'hora', label: 'Hora' },
  { value: 'dia', label: 'Dia' },
  { value: 'semana', label: 'Semana' },
  { value: 'mes', label: 'Mês' },
];

/** Renderiza o seletor lendo e gravando o período no Zustand. */
export function PeriodSelector() {
  const periodo = usePeriodoStore((estado) => estado.periodo);
  const setPeriodo = usePeriodoStore((estado) => estado.setPeriodo);
  return <SegmentedControl aria-label="Período" options={OPCOES} value={periodo} onChange={setPeriodo} />;
}
