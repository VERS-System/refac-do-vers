/**
 * Card "Sinal em tempo real" da Telemetria.
 *
 * Mostra as amostras dos últimos 10 minutos do teste (até agora, se está em
 * andamento, ou até o fim, se já terminou), com botões que ligam e desligam
 * cada série. Os botões fazem também o papel de legenda: cada um tem a cor
 * da sua série.
 */

import { useState } from 'react';
import { GraficoSinal, CORES_SINAL, type SeriesSinal } from '@/components/charts/GraficoSinal';
import { ChartCard } from '@/components/ui/ChartCard';
import { EstadoConsulta, type ConsultaBasica } from '@/components/ui/EstadoConsulta';
import { Skeleton } from '@/components/ui/Skeleton';
import type { AmostraTelemetria, PaginaDe } from '@/data/tipos';
import { cn } from '@/lib/cn';
import { rotuloUnidade } from '@/lib/unidades';

/** Botões das séries, na ordem da referência, com as unidades escolhidas. */
function botoes(): { chave: keyof SeriesSinal; rotulo: string }[] {
  return [
    { chave: 'potencia', rotulo: `Potência (${rotuloUnidade('potencia')})` },
    { chave: 'tensao', rotulo: 'Tensão (V)' },
    { chave: 'vibracao', rotulo: `Vibração RMS (${rotuloUnidade('aceleracao')})` },
  ];
}

export interface CardSinalProps {
  /** Consulta das amostras da janela de 10 minutos. */
  consulta: ConsultaBasica<PaginaDe<AmostraTelemetria>>;
}

/**
 * Renderiza o card com as três séries ligadas no início.
 *
 * Cada botão é um alternador (`aria-pressed`); a escolha fica só nesta tela
 * (é preferência de visualização, não dado).
 */
export function CardSinal({ consulta }: CardSinalProps) {
  const [series, setSeries] = useState<SeriesSinal>({
    potencia: true,
    tensao: true,
    vibracao: true,
  });

  const alternadores = (
    <div className="flex flex-wrap items-center gap-2">
      {botoes().map(({ chave, rotulo }) => (
        <button
          key={chave}
          type="button"
          aria-pressed={series[chave]}
          onClick={() => setSeries((atual) => ({ ...atual, [chave]: !atual[chave] }))}
          className={cn(
            'flex h-7 items-center gap-2 rounded-full border px-3 font-mono text-xs transition-colors',
            series[chave]
              ? 'border-line bg-surface-raised text-fg'
              : 'border-line-subtle text-fg-muted',
          )}
        >
          <span
            aria-hidden="true"
            className="size-2 rounded-full"
            style={{
              backgroundColor: series[chave] ? CORES_SINAL[chave] : 'transparent',
              border: `1px solid ${CORES_SINAL[chave]}`,
            }}
          />
          {rotulo}
        </button>
      ))}
    </div>
  );

  return (
    <ChartCard
      title="Sinal em tempo real"
      subtitle="Últimos 10 minutos · intervalo 10 s"
      actions={alternadores}
    >
      <EstadoConsulta
        consulta={consulta}
        nome="o sinal recente"
        carregando={<Skeleton className="h-[264px] w-full" />}
      >
        {(pagina) => <GraficoSinal amostras={pagina.itens} series={series} />}
      </EstadoConsulta>
    </ChartCard>
  );
}
