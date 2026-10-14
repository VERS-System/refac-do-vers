/**
 * Card do gráfico grande da Visão geral.
 *
 * Em Hora e Dia é "Energia recuperada x consumo": a curva de potência com o
 * consumo do nó. Em Semana e Mês é "Energia recuperada por dia": uma barra
 * por dia. O subtítulo resume o período (intervalo, horas em movimento e
 * intervalo de aquisição).
 */

import { GraficoEnergia } from '@/components/charts/GraficoEnergia';
import { ChartCard, type ChartLegendItem } from '@/components/ui/ChartCard';
import { EstadoConsulta } from '@/components/ui/EstadoConsulta';
import { Skeleton } from '@/components/ui/Skeleton';
import type { ResumoEnergia } from '@/data/tipos';
import { formatarDataCurta, formatarNumero } from '@/lib/format';
import { periodoComDias, useEnergiaDoPeriodo } from './useEnergiaDoPeriodo';

const LEGENDA_CURVA: ChartLegendItem[] = [
  { label: 'Recuperada (mW)', color: 'var(--color-chart-1)' },
  { label: 'Consumo nó (mW)', color: 'var(--color-chart-3)' },
];
const LEGENDA_BARRAS: ChartLegendItem[] = [{ label: 'Recuperada (mWh)', color: 'var(--color-chart-1)' }];

const ESQUELETO = <Skeleton className="h-[264px] w-full" />;

/** Trecho "1,5 h em movimento" do subtítulo. */
function emMovimento(resumo: ResumoEnergia | undefined): string | null {
  return resumo ? `${formatarNumero(resumo.horasMovimento, 1)} h em movimento` : null;
}

/** Junta as partes do subtítulo que já estão disponíveis, separadas por " · ". */
function juntar(...partes: (string | null | undefined)[]): string {
  return partes.filter(Boolean).join(' · ');
}

/**
 * Renderiza o card do período global.
 *
 * O pico marcado na curva vem do resumo do período (no Dia, o pico do dia;
 * na Hora, o da última hora). O título fica fixo enquanto os dados
 * carregam, para o card não mudar de nome.
 */
export function CardGraficoEnergia() {
  const { periodo, resumo, curva, pontosCurva, dias } = useEnergiaDoPeriodo();
  const periodoDias = periodoComDias(periodo);

  if (periodoDias) {
    const intervalo = resumo.data && `${formatarDataCurta(resumo.data.inicio)} a ${formatarDataCurta(resumo.data.fim)}`;
    const subtitulo =
      periodoDias === 'semana'
        ? juntar(intervalo && `Semana de ${intervalo}`, emMovimento(resumo.data))
        : juntar('Mês até hoje', intervalo, emMovimento(resumo.data));
    return (
      <ChartCard title="Energia recuperada por dia" subtitle={subtitulo} legend={LEGENDA_BARRAS}>
        <EstadoConsulta consulta={dias} nome="a energia por dia" carregando={ESQUELETO}>
          {(lista) => (
            <GraficoEnergia tipo="barras" dias={lista} rotulo={periodoDias === 'semana' ? 'dia-da-semana' : 'data'} />
          )}
        </EstadoConsulta>
      </ChartCard>
    );
  }

  const aquisicao = curva.data && `intervalo de ${curva.data.intervaloAquisicaoS} s`;
  const subtitulo =
    periodo === 'hora'
      ? juntar(
          'Última hora',
          pontosCurva?.length ? `${pontosCurva[0].horario} às ${pontosCurva[pontosCurva.length - 1].horario}` : null,
          aquisicao,
        )
      : juntar('Ciclo diário 00h às 24h', emMovimento(resumo.data), aquisicao);
  return (
    <ChartCard title="Energia recuperada x consumo" subtitle={subtitulo} legend={LEGENDA_CURVA}>
      <EstadoConsulta consulta={curva} nome="a curva de potência" carregando={ESQUELETO}>
        {() => (
          <GraficoEnergia
            tipo="curva"
            pontos={pontosCurva ?? []}
            escala={periodo === 'hora' ? 'janela' : 'dia'}
            pico={resumo.data?.pico}
          />
        )}
      </EstadoConsulta>
    </ChartCard>
  );
}
