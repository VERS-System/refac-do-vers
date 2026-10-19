/**
 * Gráfico de dispersão do VERS (Recharts), com reta de tendência opcional.
 *
 * Usado em "Energia × vibração" da tela Energia: cada ponto é uma amostra
 * (vibração RMS no eixo x, potência no eixo y) e a reta tracejada é a
 * regressão linear das amostras. Eixos e dica seguem as unidades escolhidas
 * nas Configurações; os pontos ficam em m/s² e mW. Como nos demais gráficos, o SVG fica numa
 * imagem (`role="img"`) nomeada por uma descrição em texto.
 */

import {
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { ParXY, Reta } from '@/data/calculos';
import { formatarAceleracao, formatarMedida, formatarPotencia } from '@/lib/format';
import { useAnimacaoGrafico } from '@/hooks/useAnimacaoGrafico';

export interface GraficoDispersaoProps {
  pontos: readonly ParXY[];
  /** Resumo acessível do gráfico (quantas amostras, o que cada eixo mede, r). */
  descricao: string;
  rotuloX: string;
  rotuloY: string;
  /** Reta de tendência (regressão); `null` para não desenhar. */
  tendencia: Reta | null;
}

const ALTURA = 200;
const DIMENSAO_INICIAL = { width: 300, height: ALTURA };
const ESTILO_EIXO = { fill: 'var(--color-fg-muted)', fontSize: 10, fontFamily: 'var(--font-mono)' };
const ESTILO_ROTULO = {
  fill: 'var(--color-fg-muted)',
  fontSize: 10,
  fontFamily: 'var(--font-mono)',
};

/** Tamanho que o `ResponsiveContainer` injeta no filho direto. */
interface TamanhoInjetado {
  width?: number;
  height?: number;
}

/** Topo "redondo" de um eixo: o máximo arredondado para cima no passo dado. */
function topo(maximo: number, passo: number): number {
  return Math.max(passo, Math.ceil(maximo / passo) * passo);
}

/**
 * Desenha os pontos e a tendência.
 *
 * Os eixos começam em zero (potência e vibração não são negativas) e vão
 * até um valor redondo acima do maior ponto. A tendência é desenhada entre o
 * menor e o maior x das amostras, sem extrapolar. O rótulo do eixo y fica
 * acima do gráfico (em `GraficoDispersao`): girado ao lado do eixo, ele
 * encostava nos números das marcas.
 */
function Dispersao({
  pontos,
  rotuloX,
  tendencia,
  width,
  height,
}: GraficoDispersaoProps & TamanhoInjetado) {
  const animacao = useAnimacaoGrafico();
  const xs = pontos.map((p) => p.x);
  const topoX = topo(Math.max(...xs), 2);
  const topoY = topo(Math.max(...pontos.map((p) => p.y)), 50);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);

  return (
    <ScatterChart width={width} height={height} margin={{ top: 8, right: 12, bottom: 16, left: 0 }}>
      <CartesianGrid stroke="var(--color-chart-grid)" strokeDasharray="2 4" />
      <XAxis
        type="number"
        dataKey="x"
        domain={[0, topoX]}
        ticks={Array.from({ length: topoX / 2 + 1 }, (_, i) => i * 2)}
        tickFormatter={(valor: number) => formatarAceleracao(valor, 0).valor}
        tick={ESTILO_EIXO}
        axisLine={false}
        tickLine={false}
        label={{ value: rotuloX, position: 'insideBottom', offset: -10, style: ESTILO_ROTULO }}
      />
      <YAxis
        type="number"
        dataKey="y"
        domain={[0, topoY]}
        ticks={[0, topoY / 2, topoY]}
        tickFormatter={(valor: number) => formatarPotencia(valor).valor}
        tick={ESTILO_EIXO}
        axisLine={false}
        tickLine={false}
        width={36}
      />
      <Tooltip
        cursor={{ stroke: 'var(--color-chart-grid)' }}
        content={({ active, payload }) => {
          const ponto = payload?.[0]?.payload as ParXY | undefined;
          if (!active || !ponto) return null;
          return (
            <div className="rounded-control border border-line bg-surface-raised px-3 py-2 font-mono text-xs text-fg shadow-elevation-1">
              {`${formatarMedida(formatarAceleracao(ponto.x, 2))} · ${formatarMedida(formatarPotencia(ponto.y))}`}
            </div>
          );
        }}
      />
      {tendencia && (
        <ReferenceLine
          segment={[
            { x: minX, y: tendencia.inclinacao * minX + tendencia.intercepto },
            { x: maxX, y: tendencia.inclinacao * maxX + tendencia.intercepto },
          ]}
          ifOverflow="hidden"
          shape={(props: { x1?: number; y1?: number; x2?: number; y2?: number }) => (
            <line
              data-slot="tendencia"
              x1={props.x1}
              y1={props.y1}
              x2={props.x2}
              y2={props.y2}
              stroke="var(--color-chart-1)"
              strokeOpacity={0.6}
              strokeDasharray="4 4"
              strokeWidth={1.5}
            />
          )}
        />
      )}
      <Scatter data={[...pontos]} fill="var(--color-chart-1)" {...animacao} />
    </ScatterChart>
  );
}

/**
 * Renderiza a dispersão, ou o aviso de período sem amostras (com menos de
 * dois pontos não há relação a mostrar).
 */
export function GraficoDispersao(props: GraficoDispersaoProps) {
  if (props.pontos.length < 2) {
    return (
      <div className="grid h-[200px] place-items-center rounded-control bg-inset text-[13px] text-fg-muted">
        Sem amostras neste período.
      </div>
    );
  }
  return (
    <div role="img" aria-label={props.descricao}>
      <p aria-hidden="true" className="mb-1 font-mono text-[10px] text-fg-muted">
        {props.rotuloY}
      </p>
      <ResponsiveContainer width="100%" height={ALTURA} initialDimension={DIMENSAO_INICIAL}>
        <Dispersao {...props} />
      </ResponsiveContainer>
    </div>
  );
}
