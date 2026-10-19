/**
 * Card "Cadeia de conversão" da Visão geral.
 *
 * Mostra a leitura ao vivo dos 4 pontos medidos pelo ESP32, do nó
 * piezoelétrico ao celular: tensão, corrente e potência de cada um, e a
 * eficiência de cada estágio (potência do ponto sobre a do anterior).
 *
 * Fase 5: acima dos pontos, um trilho com pontos de luz dourados que correm
 * do Ponto 1 ao Ponto 4, mostrando o caminho da energia: mais rápidos com
 * mais potência captada e mais fracos até a fração que chega ao celular.
 */

import { useId, type CSSProperties, type ReactNode } from 'react';
import { RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { ContagemNumero } from '@/components/ui/ContagemNumero';
import { EstadoConsulta } from '@/components/ui/EstadoConsulta';
import { Skeleton } from '@/components/ui/Skeleton';
import type { PontoConversao } from '@/data/tipos';
import { useCadeiaAoVivo } from '@/hooks/useDados';
import { formatarMedida, formatarNumero, formatarPercentual, formatarPotencia } from '@/lib/format';

/** Linha "Tensão (V1) … 4,82 V" de um ponto. */
function Medida({
  rotulo,
  valor,
  destaque = false,
}: {
  rotulo: string;
  valor: ReactNode;
  destaque?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 font-mono text-[13px]">
      <dt className="text-fg-secondary">{rotulo}</dt>
      <dd className={destaque ? 'font-medium text-accent' : 'text-fg'}>{valor}</dd>
    </div>
  );
}

/** Textos das medidas de um ponto ("4,82 V", "44 mA", "212 mW"). */
const textoTensao = (v: number) => formatarMedida({ valor: formatarNumero(v, 2), unidade: 'V' });
const textoCorrente = (ma: number) => formatarMedida({ valor: formatarNumero(ma), unidade: 'mA' });
const textoPotencia = (mw: number) => formatarMedida(formatarPotencia(mw));

/**
 * Cartão de um ponto da cadeia.
 *
 * O ponto 1 é a entrada (não há estágio anterior), então mostra "Entrada
 * AC/DC" no lugar da eficiência.
 */
function CartaoPonto({ ponto }: { ponto: PontoConversao }) {
  const idNome = useId();
  const n = ponto.ponto;
  return (
    <article
      aria-labelledby={idNome}
      className="flex flex-col rounded-control border border-line-subtle bg-inset p-4"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-label text-[11px] font-semibold tracking-[0.06em] text-accent uppercase">
          {`Ponto ${n}`}
        </span>
        {ponto.eficienciaEstagioPercentual === null ? (
          <Badge tone="neutral" dot={false}>
            Entrada AC/DC
          </Badge>
        ) : (
          <Badge tone="accent" dot={false}>
            {`η ${formatarMedida(formatarPercentual(ponto.eficienciaEstagioPercentual))}`}
          </Badge>
        )}
      </div>
      <h3 id={idNome} className="mt-3 text-[15px] leading-5 font-semibold text-fg">
        {ponto.nome}
      </h3>
      <p className="text-xs text-fg-muted">{ponto.descricao}</p>
      <dl className="mt-4 flex flex-col gap-1.5">
        {/* Os valores contam até a leitura, como os KPIs (Fase 5). */}
        <Medida
          rotulo={`Tensão (V${n})`}
          valor={<ContagemNumero numero={ponto.tensaoV} formatar={textoTensao} />}
        />
        <Medida
          rotulo={`Corrente (I${n})`}
          valor={<ContagemNumero numero={ponto.correnteMa} formatar={textoCorrente} />}
        />
        <Medida
          rotulo={`Potência (P${n})`}
          valor={<ContagemNumero numero={ponto.potenciaMw} formatar={textoPotencia} />}
          destaque
        />
      </dl>
    </article>
  );
}

/** Duração de uma volta do fluxo: 3 s a 200 mW, proporcional à potência. */
const SEGUNDOS_A_200_MW = 3;
const DURACAO_MINIMA_S = 1.4;
const DURACAO_MAXIMA_S = 6;

/**
 * Quanto tempo a luz leva do Ponto 1 ao Ponto 4, pela potência captada no
 * Ponto 1: mais potência, mais rápido, entre 1,4 e 6 s. Sem potência, `null`
 * (o fluxo para).
 */
export function duracaoFluxo(potenciaMw: number | null): number | null {
  if (potenciaMw === null || !(potenciaMw > 0)) return null;
  const duracao = (SEGUNDOS_A_200_MW * 200) / potenciaMw;
  return Math.min(DURACAO_MAXIMA_S, Math.max(DURACAO_MINIMA_S, duracao));
}

/** Pontos de luz correndo ao mesmo tempo, defasados em um terço da volta. */
const LUZES = 3;

/**
 * Trilho do fluxo: um marcador sobre o centro de cada ponto e as luzes
 * correndo do primeiro ao último. A luz termina na fração P4/P1 da energia.
 */
function FluxoEnergia({ pontos }: { pontos: PontoConversao[] }) {
  const entrada = pontos[0]?.potenciaMw ?? null;
  const saida = pontos[pontos.length - 1]?.potenciaMw ?? null;
  const duracao = duracaoFluxo(entrada);
  const fim = duracao && saida !== null ? Math.min(1, Math.max(0.15, saida / entrada!)) : 0;
  const estilo = {
    '--duracao': duracao ? `${Number(duracao.toFixed(2))}s` : undefined,
    '--fim': duracao ? fim.toFixed(2) : undefined,
  } as CSSProperties;
  return (
    <div
      data-slot="fluxo"
      data-parado={duracao === null}
      aria-hidden="true"
      style={estilo}
      className="relative mb-3 hidden h-3 grid-cols-4 gap-4 xl:grid"
    >
      {/* O trilho vai do centro do primeiro ponto ao centro do último. */}
      <span className="absolute top-1/2 right-[calc((100%-48px)/8)] left-[calc((100%-48px)/8)] h-px -translate-y-1/2 bg-accent-border/60" />
      {pontos.map((ponto) => (
        <span key={ponto.ponto} className="relative grid place-items-center">
          <span
            data-slot="marcador"
            className="size-2 rounded-full border border-accent-border bg-accent-subtle"
          />
        </span>
      ))}
      {duracao !== null && (
        <span className="fluxo-trilho absolute inset-y-0 right-[calc((100%-48px)/8)] left-[calc((100%-48px)/8)]">
          {Array.from({ length: LUZES }, (_, i) => (
            <span
              key={i}
              data-slot="luz"
              className="fluxo-luz"
              style={{ animationDelay: `calc(var(--duracao) * ${i / LUZES} * -1)` }}
            />
          ))}
        </span>
      )}
    </div>
  );
}

/** Renderiza o card como região nomeada "Cadeia de conversão". */
export function CadeiaConversao() {
  const cadeia = useCadeiaAoVivo();
  const idTitulo = useId();
  return (
    <Card as="section" aria-labelledby={idTitulo}>
      <header className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h2 id={idTitulo} className="text-base leading-[22px] font-semibold text-fg">
              Cadeia de conversão
            </h2>
            {cadeia.data && (
              <Badge tone="accent" dot={false}>
                {`${cadeia.data.pontos.length} nós monitorados`}
              </Badge>
            )}
          </div>
          <p className="text-[13px] leading-[18px] text-fg-muted">
            Rastreamento do fluxo piezoelétrico até a carga final
          </p>
        </div>
        <p className="flex items-center gap-2 font-mono text-xs text-fg-muted">
          <RefreshCw aria-hidden="true" className="size-3.5 text-success" />
          Telemetria em tempo real
        </p>
      </header>
      <div className="mt-5">
        <EstadoConsulta
          consulta={cadeia}
          nome="a cadeia de conversão"
          carregando={
            <span className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[1, 2, 3, 4].map((n) => (
                <Skeleton key={n} className="h-40" />
              ))}
            </span>
          }
        >
          {(dados) => (
            <>
              <FluxoEnergia pontos={dados.pontos} />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {dados.pontos.map((ponto) => (
                  <CartaoPonto key={ponto.ponto} ponto={ponto} />
                ))}
              </div>
            </>
          )}
        </EstadoConsulta>
      </div>
    </Card>
  );
}
