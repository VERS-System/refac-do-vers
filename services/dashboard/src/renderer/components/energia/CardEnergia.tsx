/**
 * KPI "Energia recuperada", usado na Visão geral e na tela Energia.
 *
 * Segue o período da barra superior: hoje (com a variação sobre a média
 * diária da semana), a última hora, a semana (com a variação sobre a semana
 * anterior) ou o mês até hoje. A minicurva mostra a forma da curva (Hora e
 * Dia) ou a energia de cada dia (Semana e Mês).
 *
 * As duas telas diferem só no arranjo: na Visão geral a variação fica no
 * canto do card; na Energia o canto mostra o ícone do KPI e a variação desce
 * para o rodapé, ao lado da minicurva (como nas referências).
 */

import { Zap } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { KpiConsulta } from '@/components/ui/KpiConsulta';
import { Sparkline } from '@/components/charts/Sparkline';
import type { ComparacaoEnergia } from '@/data/tipos';
import { formatarVariacao } from '@/lib/format';
import { energiaDoKpi } from './KpisEnergia';
import { periodoEmBarras, ROTULOS_ENERGIA, useEnergiaDoPeriodo } from './useEnergiaDoPeriodo';

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

export interface CardEnergiaProps {
  /** Arranjo do card: o da Visão geral (padrão) ou o da tela Energia. */
  variante?: 'visao-geral' | 'energia';
}

/**
 * Renderiza o card com o resumo do período global.
 *
 * Usa `energiaDoKpi`: o valor é contado até o resumo do período e a escala
 * troca de mWh para Wh a partir de 1.000 mWh (292 mWh hoje, 1,92 Wh na
 * semana).
 */
export function CardEnergia({ variante = 'visao-geral' }: CardEnergiaProps) {
  const { periodo, resumo, pontosCurva, dias } = useEnergiaDoPeriodo();
  const serie = periodoEmBarras(periodo)
    ? dias.data?.map((dia) => dia.energia.p1)
    : pontosCurva?.map((ponto) => ponto.recuperadaMw);
  const icone =
    variante === 'energia' ? (
      <Zap aria-hidden="true" className="size-5 shrink-0 text-accent" />
    ) : undefined;

  return (
    <KpiConsulta
      label={ROTULOS_ENERGIA[periodo]}
      consulta={resumo}
      nome="a energia recuperada"
      badge={icone}
    >
      {(dados) => {
        const energia = energiaDoKpi(dados.energiaRecuperadaMwh);
        const comparacao = dados.comparacao && <BadgeComparacao comparacao={dados.comparacao} />;
        const minicurva = serie && <Sparkline valores={serie} />;
        if (variante === 'energia') {
          return {
            ...energia,
            children: (
              <div className="flex items-center justify-between gap-3">
                {comparacao}
                <div className="w-16 shrink-0">{minicurva}</div>
              </div>
            ),
          };
        }
        return {
          ...energia,
          badge: comparacao,
          children: minicurva,
        };
      }}
    </KpiConsulta>
  );
}
