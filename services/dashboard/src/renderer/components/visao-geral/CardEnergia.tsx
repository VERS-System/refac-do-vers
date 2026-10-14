/**
 * KPI "Energia recuperada" da Visão geral.
 *
 * É o único KPI que segue o período da barra superior: hoje (com a variação
 * sobre a média diária da semana), a última hora, a semana (com a variação
 * sobre a semana anterior) ou o mês até hoje. A minicurva mostra a forma da
 * curva (Hora e Dia) ou a energia de cada dia (Semana e Mês).
 */

import { Badge } from '@/components/ui/Badge';
import { KpiConsulta } from '@/components/ui/KpiConsulta';
import { Sparkline } from '@/components/charts/Sparkline';
import type { ComparacaoEnergia } from '@/data/tipos';
import { formatarEnergia, formatarVariacao } from '@/lib/format';
import type { Periodo } from '@/stores/periodo';
import { periodoComDias, useEnergiaDoPeriodo } from './useEnergiaDoPeriodo';

/** Rótulo do card em cada período. */
const ROTULOS: Record<Periodo, string> = {
  hora: 'Energia recuperada na última hora',
  dia: 'Energia recuperada hoje',
  semana: 'Energia recuperada na semana',
  mes: 'Energia recuperada no mês',
};

/** Texto da referência da comparação. */
const REFERENCIAS: Record<ComparacaoEnergia['referencia'], string> = {
  'media-semanal': 'média semanal',
  'semana-anterior': 'semana anterior',
};

/**
 * Badge da variação: verde quando sobe ou empata, laranja quando cai.
 *
 * Pode quebrar em duas linhas (como na referência) para caber ao lado do
 * rótulo quando o card fica estreito, em 1280 px. O `!` é necessário porque
 * `cn` só concatena: sem ele, a altura fixa e o `nowrap` do Badge venceriam.
 */
function BadgeComparacao({ comparacao }: { comparacao: ComparacaoEnergia }) {
  return (
    <Badge
      tone={comparacao.variacaoPercentual >= 0 ? 'success' : 'warning'}
      dot={false}
      className="h-auto! min-w-0 py-1 whitespace-normal!"
    >
      {`${formatarVariacao(comparacao.variacaoPercentual)} vs ${REFERENCIAS[comparacao.referencia]}`}
    </Badge>
  );
}

/**
 * Renderiza o card com o resumo do período global.
 *
 * Usa `formatarEnergia`, que troca de mWh para Wh a partir de 1.000 mWh
 * (292 mWh hoje, 1,92 Wh na semana).
 */
export function CardEnergia() {
  const { periodo, resumo, pontosCurva, dias } = useEnergiaDoPeriodo();
  const serie = periodoComDias(periodo)
    ? dias.data?.map((dia) => dia.energia.p1)
    : pontosCurva?.map((ponto) => ponto.recuperadaMw);

  return (
    <KpiConsulta label={ROTULOS[periodo]} consulta={resumo} nome="a energia recuperada">
      {(dados) => {
        const energia = formatarEnergia(dados.energiaRecuperadaMwh);
        return {
          value: energia.valor,
          unit: energia.unidade,
          badge: dados.comparacao && <BadgeComparacao comparacao={dados.comparacao} />,
          children: serie && <Sparkline valores={serie} />,
        };
      }}
    </KpiConsulta>
  );
}
