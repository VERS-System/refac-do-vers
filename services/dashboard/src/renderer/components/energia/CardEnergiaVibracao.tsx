/**
 * Card "Energia × vibração" da tela Energia.
 *
 * Dispersão das amostras do período (vibração RMS × potência), com a reta de
 * tendência, o coeficiente de correlação (r) e a sua intensidade em texto.
 * O r é calculado das amostras, não copiado da referência. Abaixo, a
 * frequência dominante atual da vibração.
 */

import { useId } from 'react';
import { GraficoDispersao } from '@/components/charts/GraficoDispersao';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { EstadoConsulta } from '@/components/ui/EstadoConsulta';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  classificarCorrelacao,
  correlacaoPearson,
  regressaoLinear,
  type IntensidadeCorrelacao,
} from '@/data/calculos';
import type { AmostraVibracao } from '@/data/tipos';
import { useAmostrasVibracao, useVibracao } from '@/hooks/useDados';
import { formatarMedida, formatarNumero } from '@/lib/format';
import { rotuloUnidade } from '@/lib/unidades';

/** Texto de cada intensidade de correlação. */
const INTENSIDADES: Record<IntensidadeCorrelacao, string> = {
  alta: 'Alta correlação',
  moderada: 'Correlação moderada',
  baixa: 'Correlação baixa',
};

/** Converte as amostras em pares (x = vibração, y = potência) e calcula r e a tendência. */
function analisar(amostras: readonly AmostraVibracao[]) {
  const pares = amostras.map((amostra) => ({ x: amostra.vibracaoRmsMs2, y: amostra.potenciaMw }));
  const r = correlacaoPearson(pares);
  return { pares, r, tendencia: regressaoLinear(pares), intensidade: classificarCorrelacao(r) };
}

/** Renderiza o card como região nomeada "Energia × vibração". */
export function CardEnergiaVibracao() {
  const amostras = useAmostrasVibracao();
  const vibracao = useVibracao();
  const idTitulo = useId();
  const analise = amostras.data ? analisar(amostras.data) : null;

  return (
    <Card as="section" aria-labelledby={idTitulo} className="flex flex-col">
      <header className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 id={idTitulo} className="text-base leading-[22px] font-semibold text-fg">
            Energia × vibração
          </h2>
          <p className="font-mono text-xs text-fg-muted">Dispersão de potência vs vibração RMS</p>
        </div>
        {analise?.r != null && (
          <Badge tone="accent" dot={false}>
            {`r = ${formatarNumero(analise.r, 2)}`}
          </Badge>
        )}
      </header>
      <div className="mt-4 flex-1">
        <EstadoConsulta
          consulta={amostras}
          nome="as amostras de vibração"
          carregando={<Skeleton className="h-[200px] w-full" />}
        >
          {() =>
            analise && (
              <GraficoDispersao
                pontos={analise.pares}
                descricao={`Dispersão de ${analise.pares.length} amostras: potência (${rotuloUnidade('potencia')}) por vibração RMS (${rotuloUnidade('aceleracao')})${
                  analise.r != null ? `, r = ${formatarNumero(analise.r, 2)}` : ''
                }.`}
                rotuloX={`Vibração RMS (${rotuloUnidade('aceleracao')})`}
                rotuloY={`Potência (${rotuloUnidade('potencia')})`}
                tendencia={analise.tendencia}
              />
            )
          }
        </EstadoConsulta>
      </div>
      <dl className="mt-4 flex items-end justify-between gap-3 border-t border-line-subtle pt-4 font-mono text-xs">
        <div>
          <dt className="text-fg-muted">Frequência dominante</dt>
          <dd className="text-fg-secondary">
            {vibracao.data
              ? formatarMedida({
                  valor: formatarNumero(vibracao.data.frequenciaDominanteHz, 1),
                  unidade: 'Hz',
                })
              : '–'}
          </dd>
        </div>
        {analise?.intensidade && (
          <div className="text-right">
            <dt className="sr-only">Correlação</dt>
            <dd className="font-medium text-accent">{INTENSIDADES[analise.intensidade]}</dd>
          </div>
        )}
      </dl>
    </Card>
  );
}
