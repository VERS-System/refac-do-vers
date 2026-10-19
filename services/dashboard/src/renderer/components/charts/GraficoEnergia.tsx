/**
 * Gráfico de energia da Visão geral do VERS (Recharts).
 *
 * Tem duas formas, conforme o período da barra superior:
 * - curva (Hora e Dia): potência recuperada em mW, área dourada, com o
 *   consumo do nó tracejado e o pico marcado;
 * - barras (Semana e Mês): energia recuperada por dia, em mWh.
 *
 * O SVG do Recharts não é legível por leitores de tela, então o gráfico é uma
 * imagem (`role="img"`) nomeada por um resumo em texto (intervalo e pico).
 */

import type { ReactNode } from 'react';
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  LabelList,
  Line,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { horarioParaMinutos, minutosParaHorario, suavizarSerie } from '@/data/calculos';
import { useAnimacaoGrafico } from '@/hooks/useAnimacaoGrafico';
import type { Horario, PontoCurva, ResumoDia } from '@/data/tipos';
import {
  formatarDataCurta,
  formatarDiaSemanaCurto,
  formatarEnergia,
  formatarMedida,
  formatarPotencia,
} from '@/lib/format';

/** Pico exibido na curva. */
export interface PicoCurva {
  potenciaMw: number;
  horario?: Horario;
}

export type GraficoEnergiaProps =
  | {
      tipo: 'curva';
      pontos: readonly PontoCurva[];
      /** `dia`: eixo fixo de 00h a 24h; `janela`: eixo do primeiro ao último ponto. */
      escala: 'dia' | 'janela';
      pico?: PicoCurva | null;
    }
  | {
      tipo: 'barras';
      dias: readonly ResumoDia[];
      /** Rótulo de cada barra: dia da semana ("Seg") ou data ("01/10"). */
      rotulo: 'dia-da-semana' | 'data';
      /** Segunda série: energia entregue à bateria (P3), ao lado da recuperada. */
      serieBateria?: boolean;
      /** Linha tracejada com a média diária da energia recuperada. */
      media?: boolean;
      /** Valor de cada barra escrito acima dela. */
      valores?: boolean;
    };

const MINUTOS_NO_DIA = 24 * 60;
/** Altura do gráfico em px e tamanho inicial antes da primeira medição. */
const ALTURA = 240;
const DIMENSAO_INICIAL = { width: 800, height: ALTURA };

/** Cores das séries vindas dos tokens do tema (`global.css`). */
const COR = {
  recuperada: 'var(--color-chart-1)',
  bateria: 'var(--color-chart-2)',
  consumo: 'var(--color-chart-3)',
  grade: 'var(--color-chart-grid)',
  eixo: 'var(--color-fg-muted)',
};
const ESTILO_EIXO = { fill: COR.eixo, fontSize: 11, fontFamily: 'var(--font-mono)' };

/** Texto "valor unidade" de uma potência ("386 mW"). */
const textoPotencia = (mW: number) => formatarMedida(formatarPotencia(mW));

/** Resumo acessível da curva: intervalo e, se houver, o pico. */
export function descreverCurva(
  pontos: readonly PontoCurva[],
  pico: PicoCurva | null | undefined,
): string {
  const intervalo = `Potência recuperada de ${pontos[0].horario} a ${pontos[pontos.length - 1].horario}`;
  if (!pico) return `${intervalo}.`;
  const quando = pico.horario ? ` às ${pico.horario}` : '';
  return `${intervalo}, pico de ${textoPotencia(pico.potenciaMw)}${quando}.`;
}

/** Resumo acessível das barras: intervalo de datas e o dia de maior energia. */
export function descreverBarras(dias: readonly ResumoDia[]): string {
  const maior = dias.reduce((atual, dia) => (dia.energia.p1 > atual.energia.p1 ? dia : atual));
  const intervalo = `de ${formatarDataCurta(dias[0].data)} a ${formatarDataCurta(dias[dias.length - 1].data)}`;
  const valor = formatarMedida(formatarEnergia(maior.energia.p1, { unidade: 'mWh' }));
  return `Energia recuperada por dia ${intervalo}, maior valor ${valor} em ${formatarDataCurta(maior.data)}.`;
}

/** Topo do eixo Y: o máximo arredondado para cima em centenas (mínimo 100). */
function topoDoEixo(maximo: number): number {
  return Math.max(100, Math.ceil(maximo / 100) * 100);
}

/** Marcas do eixo Y de 100 em 100, de 0 até o topo. */
function marcasY(topo: number): number[] {
  return Array.from({ length: topo / 100 + 1 }, (_, i) => i * 100);
}

/** Marcas do eixo X da curva: de 4 em 4 h no dia, de 15 em 15 min na janela. */
function marcasX(inicio: number, fim: number, passo: number): number[] {
  const marcas: number[] = [];
  for (let minuto = inicio; minuto <= fim; minuto += passo) marcas.push(minuto);
  return marcas;
}

/** Rótulo do eixo X: "04h" no dia inteiro, "17:20" na janela. */
function rotuloMinuto(minuto: number, escala: 'dia' | 'janela'): string {
  return escala === 'dia'
    ? `${String(Math.floor(minuto / 60)).padStart(2, '0')}h`
    : minutosParaHorario(minuto);
}

/** Caixa do tooltip no estilo dos cards (superfície elevada, texto em Geist Mono). */
function CaixaTooltip({
  titulo,
  linhas,
}: {
  titulo: string;
  linhas: { rotulo: string; valor: string }[];
}) {
  return (
    <div className="rounded-control border border-line bg-surface-raised px-3 py-2 font-mono text-xs shadow-elevation-1">
      <p className="mb-1 text-fg-muted">{titulo}</p>
      {linhas.map((linha) => (
        <p key={linha.rotulo} className="text-fg">
          <span className="text-fg-secondary">{linha.rotulo}</span> {linha.valor}
        </p>
      ))}
    </div>
  );
}

/** Tamanho que o `ResponsiveContainer` injeta no filho direto. */
interface TamanhoInjetado {
  width?: number;
  height?: number;
}

/** Formato de um ponto da curva para o Recharts (x em minutos desde 00:00). */
interface PontoGrafico {
  minuto: number;
  /** Potência recuperada medida (tooltip). */
  recuperada: number;
  /** Potência recuperada suavizada, só para o desenho da área. */
  desenho: number;
  consumo: number;
}

/**
 * Pontos da curva para o Recharts. A área é desenhada com a média móvel de
 * 5 min (`suavizarSerie`), sem o serrilhado minuto a minuto do sensor, e
 * passa pelo pico medido; o tooltip mostra o valor medido (Fase 5).
 */
export function pontosDaCurva(pontos: readonly PontoCurva[]): PontoGrafico[] {
  const desenho = suavizarSerie(pontos.map((p) => p.recuperadaMw));
  return pontos.map((p, i) => ({
    minuto: horarioParaMinutos(p.horario),
    recuperada: p.recuperadaMw,
    desenho: desenho[i],
    consumo: p.consumoNoMw,
  }));
}

/**
 * Desenha a curva: área da potência recuperada, linha tracejada do consumo do
 * nó e o pico com rótulo. No dia, o eixo vai de 00h a 24h mesmo com dados só
 * até agora, para mostrar quanto do dia já passou.
 */
function Curva({
  pontos,
  escala,
  pico,
  width,
  height,
}: Extract<GraficoEnergiaProps, { tipo: 'curva' }> & TamanhoInjetado) {
  const animacao = useAnimacaoGrafico();
  const dados = pontosDaCurva(pontos);
  const inicio = escala === 'dia' ? 0 : dados[0].minuto;
  const fim = escala === 'dia' ? MINUTOS_NO_DIA : dados[dados.length - 1].minuto;
  const topo = topoDoEixo(Math.max(...dados.map((d) => Math.max(d.recuperada, d.consumo))));

  return (
    <ComposedChart
      width={width}
      height={height}
      data={dados}
      margin={{ top: 24, right: 12, bottom: 0, left: 0 }}
    >
      <defs>
        <linearGradient id="vers-gradiente-recuperada" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={COR.recuperada} stopOpacity={0.35} />
          <stop offset="100%" stopColor={COR.recuperada} stopOpacity={0} />
        </linearGradient>
      </defs>
      <CartesianGrid stroke={COR.grade} strokeDasharray="2 4" vertical={false} />
      <XAxis
        dataKey="minuto"
        type="number"
        domain={[inicio, fim]}
        ticks={marcasX(inicio, fim, escala === 'dia' ? 240 : 15)}
        tickFormatter={(minuto: number) => rotuloMinuto(minuto, escala)}
        tick={ESTILO_EIXO}
        axisLine={false}
        tickLine={false}
      />
      <YAxis
        domain={[0, topo]}
        ticks={marcasY(topo)}
        tickFormatter={(valor: number) => formatarPotencia(valor).valor}
        tick={ESTILO_EIXO}
        axisLine={false}
        tickLine={false}
        width={36}
      />
      <Tooltip
        cursor={{ stroke: COR.grade }}
        content={({ active, payload }) => {
          const ponto = payload?.[0]?.payload as PontoGrafico | undefined;
          if (!active || !ponto) return null;
          return (
            <CaixaTooltip
              titulo={minutosParaHorario(ponto.minuto)}
              linhas={[
                { rotulo: 'Recuperada', valor: textoPotencia(ponto.recuperada) },
                { rotulo: 'Consumo nó', valor: textoPotencia(ponto.consumo) },
              ]}
            />
          );
        }}
      />
      <Line
        dataKey="consumo"
        stroke={COR.consumo}
        strokeDasharray="4 4"
        strokeWidth={1.5}
        dot={false}
        {...animacao}
      />
      <Area
        dataKey="desenho"
        type="monotone"
        stroke={COR.recuperada}
        strokeWidth={2}
        fill="url(#vers-gradiente-recuperada)"
        dot={false}
        {...animacao}
      />
      {pico?.horario && (
        <ReferenceDot
          x={horarioParaMinutos(pico.horario)}
          y={pico.potenciaMw}
          r={4}
          fill={COR.recuperada}
          stroke="none"
          label={{
            value: `Pico ${textoPotencia(pico.potenciaMw)} · ${pico.horario}`,
            position: 'top',
            offset: 10,
            fill: 'var(--color-fg)',
            fontSize: 11,
            fontFamily: 'var(--font-mono)',
          }}
        />
      )}
    </ComposedChart>
  );
}

/** Formato de uma barra para o Recharts. */
interface BarraGrafico {
  rotulo: string;
  data: string;
  energia: number;
  bateria: number;
}

/** Texto "274 mWh" de uma energia em mWh. */
const textoMwh = (mWh: number) => formatarMedida(formatarEnergia(mWh, { unidade: 'mWh' }));

/** Estilo dos valores escritos acima das barras. */
const ESTILO_VALOR = {
  fill: 'var(--color-fg-secondary)',
  fontSize: 10,
  fontFamily: 'var(--font-mono)',
};

/**
 * Desenha as barras de energia por dia, em mWh.
 *
 * Na Visão geral é só a recuperada (P1); na Energia entram também a
 * entregue à bateria (P3), a linha da média diária e os valores das barras.
 */
function Barras({
  dias,
  rotulo,
  serieBateria = false,
  media = false,
  valores = false,
  width,
  height,
}: Extract<GraficoEnergiaProps, { tipo: 'barras' }> & TamanhoInjetado) {
  const animacao = useAnimacaoGrafico();
  const dados: BarraGrafico[] = dias.map((dia) => ({
    rotulo: rotulo === 'data' ? formatarDataCurta(dia.data) : formatarDiaSemanaCurto(dia.data),
    data: dia.data,
    energia: dia.energia.p1,
    bateria: dia.energia.p3,
  }));
  const topo = topoDoEixo(Math.max(...dados.map((d) => d.energia)));
  const mediaMwh = dados.reduce((soma, d) => soma + d.energia, 0) / dados.length;
  const rotuloValor = valores ? (
    <LabelList
      position="top"
      offset={6}
      style={ESTILO_VALOR}
      formatter={(valor: number) => formatarEnergia(valor, { unidade: 'mWh' }).valor}
    />
  ) : null;

  return (
    <BarChart
      width={width}
      height={height}
      data={dados}
      barGap={4}
      margin={{ top: valores ? 20 : 12, right: 12, bottom: 0, left: 0 }}
    >
      <CartesianGrid stroke={COR.grade} strokeDasharray="2 4" vertical={false} />
      <XAxis dataKey="rotulo" tick={ESTILO_EIXO} axisLine={false} tickLine={false} />
      <YAxis
        domain={[0, topo]}
        ticks={marcasY(topo)}
        tickFormatter={(valor: number) => formatarEnergia(valor, { unidade: 'mWh' }).valor}
        tick={ESTILO_EIXO}
        axisLine={false}
        tickLine={false}
        width={36}
      />
      <Tooltip
        cursor={{ fill: 'var(--color-hover)', opacity: 0.4 }}
        content={({ active, payload }) => {
          const barra = payload?.[0]?.payload as BarraGrafico | undefined;
          if (!active || !barra) return null;
          return (
            <CaixaTooltip
              titulo={`${formatarDiaSemanaCurto(barra.data)} ${formatarDataCurta(barra.data)}`}
              linhas={[
                { rotulo: 'Recuperada', valor: textoMwh(barra.energia) },
                ...(serieBateria
                  ? [{ rotulo: 'Entregue à bateria', valor: textoMwh(barra.bateria) }]
                  : []),
              ]}
            />
          );
        }}
      />
      <Bar
        dataKey="energia"
        fill={COR.recuperada}
        radius={[6, 6, 0, 0]}
        maxBarSize={serieBateria ? 18 : 36}
        {...animacao}
      >
        {rotuloValor}
      </Bar>
      {serieBateria && (
        <Bar
          dataKey="bateria"
          fill={COR.bateria}
          radius={[6, 6, 0, 0]}
          maxBarSize={18}
          {...animacao}
        >
          {rotuloValor}
        </Bar>
      )}
      {media && (
        <ReferenceLine
          y={mediaMwh}
          stroke={COR.eixo}
          strokeDasharray="3 4"
          label={{
            value: `Média ${textoMwh(mediaMwh)}`,
            position: 'insideTopRight',
            fill: 'var(--color-fg-secondary)',
            fontSize: 10,
            fontFamily: 'var(--font-mono)',
          }}
        />
      )}
    </BarChart>
  );
}

/**
 * Renderiza o gráfico pedido, ou o aviso de período sem medições.
 *
 * O `ResponsiveContainer` acompanha a largura do card (a altura é fixa) e
 * injeta o tamanho medido em `Curva`/`Barras`, que o repassam ao gráfico.
 */
export function GraficoEnergia(props: GraficoEnergiaProps) {
  const vazio = props.tipo === 'curva' ? props.pontos.length === 0 : props.dias.length === 0;
  if (vazio) {
    return (
      <div className="grid h-60 place-items-center rounded-control bg-inset text-[13px] text-fg-muted">
        Sem medições neste período.
      </div>
    );
  }

  let grafico: ReactNode;
  let descricao: string;
  if (props.tipo === 'curva') {
    grafico = <Curva {...props} />;
    descricao = descreverCurva(props.pontos, props.pico);
  } else {
    grafico = <Barras {...props} />;
    descricao = descreverBarras(props.dias);
  }

  return (
    <div role="img" aria-label={descricao} className="rounded-control bg-inset p-3">
      <ResponsiveContainer width="100%" height={ALTURA} initialDimension={DIMENSAO_INICIAL}>
        {grafico}
      </ResponsiveContainer>
    </div>
  );
}
