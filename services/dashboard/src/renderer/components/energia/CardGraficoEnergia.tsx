/**
 * Card do gráfico de energia do período, usado na Visão geral e na Energia.
 *
 * Em Hora e Dia é "Energia recuperada x consumo": a curva de potência com o
 * consumo do nó. Em Semana e Mês é "Energia recuperada por dia": uma barra
 * por dia. O subtítulo resume o período (intervalo, horas em movimento e
 * intervalo de aquisição).
 *
 * Na tela Energia o card é "detalhado": as barras ganham a energia entregue
 * à bateria, a média diária e os valores, e um rodapé diz como a energia é
 * calculada e o total do período.
 */

import { GraficoEnergia } from '@/components/charts/GraficoEnergia';
import { ChartCard, type ChartLegendItem } from '@/components/ui/ChartCard';
import { EstadoConsulta } from '@/components/ui/EstadoConsulta';
import { Skeleton } from '@/components/ui/Skeleton';
import type { ResumoEnergia } from '@/data/tipos';
import { formatarDataCurta, formatarEnergia, formatarMedida, formatarNumero } from '@/lib/format';
import { rotuloUnidade } from '@/lib/unidades';
import { periodoEmBarras, useEnergiaDoPeriodo } from './useEnergiaDoPeriodo';

/** Legenda da curva do dia, na unidade de potência escolhida. */
function legendaCurva(): ChartLegendItem[] {
  const unidade = rotuloUnidade('potencia');
  return [
    { label: `Recuperada (${unidade})`, color: 'var(--color-chart-1)' },
    { label: `Consumo nó (${unidade})`, color: 'var(--color-chart-3)' },
  ];
}

/** Legenda das barras por dia (com a bateria, na versão detalhada), na unidade de energia escolhida. */
function legendaBarras(detalhado: boolean): ChartLegendItem[] {
  const unidade = rotuloUnidade('energia');
  const recuperada = { label: `Recuperada (${unidade})`, color: 'var(--color-chart-1)' };
  if (!detalhado) return [recuperada];
  return [recuperada, { label: `Entregue à bateria (${unidade})`, color: 'var(--color-chart-2)' }];
}

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
 * Rodapé da versão detalhada: método de cálculo e total do período.
 *
 * A energia é a integral por trapézios de P = V × I. O intervalo de
 * aquisição vem da curva (10 s); o Stitch dizia "amostragem 10 Hz", que
 * contradiz as demais telas.
 */
function Rodape({ intervaloS, resumo }: { intervaloS?: number; resumo?: ResumoEnergia }) {
  if (intervaloS === undefined || !resumo) return null;
  return (
    <div className="mt-4 flex items-start justify-between gap-4 font-mono text-xs text-fg-muted">
      <p>Integração trapezoidal de P = V × I · amostragem a cada {intervaloS} s</p>
      <p className="shrink-0">
        Total:{' '}
        <strong className="font-medium text-fg">
          {formatarMedida(formatarEnergia(resumo.energiaRecuperadaMwh, { unidade: 'mWh' }))}
        </strong>{' '}
        recuperados
      </p>
    </div>
  );
}

export interface CardGraficoEnergiaProps {
  /** Versão da tela Energia: barras com bateria, média e valores, e rodapé. */
  detalhado?: boolean;
}

/**
 * Renderiza o card do período global.
 *
 * O pico marcado na curva vem do resumo do período (no Dia, o pico do dia;
 * na Hora, o da última hora). O título fica fixo enquanto os dados
 * carregam, para o card não mudar de nome.
 */
export function CardGraficoEnergia({ detalhado = false }: CardGraficoEnergiaProps) {
  const { periodo, resumo, curva, pontosCurva, dias } = useEnergiaDoPeriodo();
  const emBarras = periodoEmBarras(periodo);
  const rodape = detalhado && (
    <Rodape intervaloS={curva.data?.intervaloAquisicaoS} resumo={resumo.data} />
  );

  if (emBarras) {
    const intervalo =
      resumo.data &&
      `${formatarDataCurta(resumo.data.inicio)} a ${formatarDataCurta(resumo.data.fim)}`;
    const subtitulo =
      emBarras === 'semana'
        ? juntar(intervalo && `Semana de ${intervalo}`, emMovimento(resumo.data))
        : juntar('Mês até hoje', intervalo, emMovimento(resumo.data));
    return (
      <ChartCard
        title="Energia recuperada por dia"
        subtitle={subtitulo}
        legend={legendaBarras(detalhado)}
      >
        <EstadoConsulta consulta={dias} nome="a energia por dia" carregando={ESQUELETO}>
          {(lista) => (
            <GraficoEnergia
              tipo="barras"
              dias={lista}
              rotulo={emBarras === 'semana' ? 'dia-da-semana' : 'data'}
              serieBateria={detalhado}
              media={detalhado}
              valores={detalhado}
            />
          )}
        </EstadoConsulta>
        {rodape}
      </ChartCard>
    );
  }

  const aquisicao = curva.data && `intervalo de ${curva.data.intervaloAquisicaoS} s`;
  const subtitulo =
    periodo === 'hora'
      ? juntar(
          'Última hora',
          pontosCurva?.length
            ? `${pontosCurva[0].horario} às ${pontosCurva[pontosCurva.length - 1].horario}`
            : null,
          aquisicao,
        )
      : juntar('Ciclo diário 00h às 24h', emMovimento(resumo.data), aquisicao);
  return (
    <ChartCard title="Energia recuperada x consumo" subtitle={subtitulo} legend={legendaCurva()}>
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
      {rodape}
    </ChartCard>
  );
}
