/**
 * Gráfico "Sinal em tempo real" da Telemetria (Recharts).
 *
 * Mostra as amostras mais recentes de um teste: potência (área dourada, eixo
 * esquerdo em mW), tensão (linha azul) e vibração RMS (tracejada), as duas
 * no eixo direito (V e m/s² cabem na mesma escala de 0 a 6). O eixo x é o
 * tempo até a última amostra ("Agora"). Cada série pode ser desligada.
 * Amostras inválidas (sem medida) aparecem como lacunas, não como zero.
 */

import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { AmostraTelemetria } from '@/data/tipos';
import {
  formatarAceleracao,
  formatarHorarioCaptura,
  formatarMedida,
  formatarNumero,
  formatarPotencia,
} from '@/lib/format';

/** Quais séries estão ligadas. */
export interface SeriesSinal {
  potencia: boolean;
  tensao: boolean;
  vibracao: boolean;
}

export interface GraficoSinalProps {
  /** Amostras em qualquer ordem (o gráfico ordena por horário). */
  amostras: readonly AmostraTelemetria[];
  series: SeriesSinal;
}

/** Cores das séries, dos tokens do tema. */
export const CORES_SINAL = {
  potencia: 'var(--color-chart-1)',
  tensao: 'var(--color-chart-2)',
  vibracao: 'var(--color-chart-3)',
};

const ALTURA = 240;
const DIMENSAO_INICIAL = { width: 700, height: ALTURA };
const ESTILO_EIXO = { fill: 'var(--color-fg-muted)', fontSize: 11, fontFamily: 'var(--font-mono)' };
/** Topo do eixo direito, comum a tensão (V) e vibração (m/s²). */
const TOPO_EIXO_DIREITO = 6;

/** Instante da captura em ms, para ordenar e medir distâncias. */
const instante = (amostra: AmostraTelemetria) => Date.parse(amostra.capturadaEm);

/** Ordena da mais antiga para a mais recente, sem alterar a lista recebida. */
function emOrdem(amostras: readonly AmostraTelemetria[]): AmostraTelemetria[] {
  return [...amostras].sort((a, b) => instante(a) - instante(b));
}

/**
 * "212 mW · 4,82 V · 3,2 m/s²" de uma amostra, nas unidades escolhidas
 * (medidas ausentes como "–").
 */
export function textoLeitura(amostra: AmostraTelemetria): string {
  return [
    formatarMedida(formatarPotencia(amostra.potenciaMw)),
    formatarMedida({ valor: formatarNumero(amostra.tensaoV, 2), unidade: 'V' }),
    formatarMedida(formatarAceleracao(amostra.vibracaoRmsMs2)),
  ].join(' · ');
}

/**
 * Resumo acessível: intervalo, faixa de potência e a última leitura.
 *
 * É o que um leitor de tela anuncia no lugar do desenho.
 */
export function descreverSinal(amostras: readonly AmostraTelemetria[]): string {
  const ordenadas = emOrdem(amostras);
  const primeira = ordenadas[0];
  const ultima = ordenadas[ordenadas.length - 1];
  const potencias = ordenadas.map((a) => a.potenciaMw).filter((p): p is number => p !== null);
  const faixa = potencias.length
    ? `potência de ${formatarPotencia(Math.min(...potencias)).valor} a ${formatarMedida(formatarPotencia(Math.max(...potencias)))}`
    : 'sem potência medida';
  return `Sinal de ${formatarHorarioCaptura(primeira.capturadaEm)} a ${formatarHorarioCaptura(ultima.capturadaEm)}: ${faixa}; última leitura ${textoLeitura(ultima)}.`;
}

/** Ponto do gráfico: segundos até a última amostra (negativos) e as medidas. */
interface PontoSinal {
  segundos: number;
  amostra: AmostraTelemetria;
  potencia: number | null;
  tensao: number | null;
  vibracao: number | null;
}

/** Rótulo do eixo x: "Agora" no fim, "−8 min" ou "−30 s" antes. */
function rotuloTempo(segundos: number): string {
  if (segundos === 0) return 'Agora';
  return Math.abs(segundos) >= 60
    ? `−${Math.round(Math.abs(segundos) / 60)} min`
    : `−${Math.abs(segundos)} s`;
}

/** Tamanho que o `ResponsiveContainer` injeta no filho direto. */
interface TamanhoInjetado {
  width?: number;
  height?: number;
}

/** Desenha as séries ligadas, com dois eixos y e o tooltip da leitura. */
function Sinal({ amostras, series, width, height }: GraficoSinalProps & TamanhoInjetado) {
  const ordenadas = emOrdem(amostras);
  const fim = instante(ordenadas[ordenadas.length - 1]);
  const dados: PontoSinal[] = ordenadas.map((amostra) => ({
    segundos: Math.round((instante(amostra) - fim) / 1000),
    amostra,
    potencia: amostra.potenciaMw,
    tensao: amostra.tensaoV,
    vibracao: amostra.vibracaoRmsMs2,
  }));
  const inicio = dados[0].segundos;
  const passo = Math.abs(inicio) > 120 ? 120 : 30;
  const marcas: number[] = [];
  for (let s = 0; s >= inicio; s -= passo) marcas.unshift(s);
  const potencias = dados.map((d) => d.potencia ?? 0);
  const topoMw = Math.max(100, Math.ceil(Math.max(...potencias) / 100) * 100);

  return (
    <ComposedChart
      width={width}
      height={height}
      data={dados}
      margin={{ top: 12, right: 0, bottom: 0, left: 0 }}
    >
      <defs>
        <linearGradient id="vers-gradiente-sinal" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={CORES_SINAL.potencia} stopOpacity={0.3} />
          <stop offset="100%" stopColor={CORES_SINAL.potencia} stopOpacity={0} />
        </linearGradient>
      </defs>
      <CartesianGrid stroke="var(--color-chart-grid)" strokeDasharray="2 4" vertical={false} />
      <XAxis
        dataKey="segundos"
        type="number"
        domain={[inicio, 0]}
        ticks={marcas}
        tickFormatter={rotuloTempo}
        tick={ESTILO_EIXO}
        axisLine={false}
        tickLine={false}
      />
      <YAxis
        yAxisId="mw"
        domain={[0, topoMw]}
        tickFormatter={(valor: number) => formatarPotencia(valor).valor}
        tick={ESTILO_EIXO}
        axisLine={false}
        tickLine={false}
        width={40}
      />
      <YAxis
        yAxisId="direito"
        orientation="right"
        domain={[0, TOPO_EIXO_DIREITO]}
        ticks={[0, 1.5, 3, 4.5, 6]}
        tickFormatter={(valor: number) => formatarNumero(valor, 1)}
        tick={ESTILO_EIXO}
        axisLine={false}
        tickLine={false}
        width={36}
      />
      <Tooltip
        cursor={{ stroke: 'var(--color-chart-grid)' }}
        content={({ active, payload }) => {
          const ponto = payload?.[0]?.payload as PontoSinal | undefined;
          if (!active || !ponto) return null;
          return (
            <div className="rounded-control border border-line bg-surface-raised px-3 py-2 font-mono text-xs shadow-elevation-1">
              <p className="mb-1 text-fg-muted">
                {formatarHorarioCaptura(ponto.amostra.capturadaEm)}
              </p>
              <p className="text-fg">{textoLeitura(ponto.amostra)}</p>
            </div>
          );
        }}
      />
      {series.potencia && (
        <Area
          yAxisId="mw"
          dataKey="potencia"
          stroke={CORES_SINAL.potencia}
          strokeWidth={2}
          fill="url(#vers-gradiente-sinal)"
          connectNulls={false}
          isAnimationActive={false}
        />
      )}
      {series.tensao && (
        <Line
          yAxisId="direito"
          dataKey="tensao"
          stroke={CORES_SINAL.tensao}
          strokeWidth={1.5}
          dot={false}
          connectNulls={false}
          isAnimationActive={false}
        />
      )}
      {series.vibracao && (
        <Line
          yAxisId="direito"
          dataKey="vibracao"
          stroke={CORES_SINAL.vibracao}
          strokeWidth={1.5}
          strokeDasharray="3 3"
          dot={false}
          isAnimationActive={false}
        />
      )}
    </ComposedChart>
  );
}

/**
 * Renderiza o gráfico, ou o aviso de que não há amostras recentes (com
 * menos de duas amostras não há sinal a desenhar).
 */
export function GraficoSinal(props: GraficoSinalProps) {
  if (props.amostras.length < 2) {
    return (
      <div className="grid h-60 place-items-center rounded-control bg-inset text-[13px] text-fg-muted">
        Sem amostras nos últimos 10 minutos.
      </div>
    );
  }
  return (
    <div
      role="img"
      aria-label={descreverSinal(props.amostras)}
      className="rounded-control bg-inset p-3"
    >
      <ResponsiveContainer width="100%" height={ALTURA} initialDimension={DIMENSAO_INICIAL}>
        <Sinal {...props} />
      </ResponsiveContainer>
    </div>
  );
}
