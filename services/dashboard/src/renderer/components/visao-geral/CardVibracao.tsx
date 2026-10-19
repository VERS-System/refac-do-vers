/**
 * Card "Vibração RMS" da Visão geral.
 *
 * Mostra a vibração medida agora (RMS e eixo), a faixa calculada pelo
 * backend, uma onda ilustrativa e os detalhes do bloco de piezos: quantos
 * estão captando, a frequência dominante e a temperatura.
 */

import { useId, type ReactNode } from 'react';
import { OndaVibracao } from '@/components/charts/OndaVibracao';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { EstadoConsulta } from '@/components/ui/EstadoConsulta';
import { Skeleton } from '@/components/ui/Skeleton';
import type { Vibracao } from '@/data/tipos';
import { useVibracao } from '@/hooks/useDados';
import { cn } from '@/lib/cn';
import { formatarAceleracao, formatarMedida, formatarNumero } from '@/lib/format';

/** Texto e cor de cada faixa de vibração. */
const FAIXAS: Record<Vibracao['faixa'], { texto: string; classe: string }> = {
  baixa: { texto: 'Faixa baixa', classe: 'text-info' },
  normal: { texto: 'Faixa normal', classe: 'text-success' },
  alta: { texto: 'Faixa alta', classe: 'text-warning' },
};

/**
 * Pontos dos piezos: um por piezo, dourado se está captando.
 *
 * Decorativos; a contagem "6 / 8" ao lado é o texto que vale.
 */
function PontosPiezos({ ativos, total }: { ativos: number; total: number }) {
  return (
    <span aria-hidden="true" className="flex gap-1">
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={cn('size-2 rounded-full', i < ativos ? 'bg-accent' : 'bg-surface-raised')}
        />
      ))}
    </span>
  );
}

/** Linha "rótulo … valor" da lista de detalhes. */
function Detalhe({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-[13px] text-fg-secondary">{rotulo}</dt>
      <dd className="flex items-center gap-3 font-mono text-[13px] text-fg">{children}</dd>
    </div>
  );
}

/** Conteúdo do card com os dados já carregados. */
function ConteudoVibracao({ vibracao }: { vibracao: Vibracao }) {
  const faixa = FAIXAS[vibracao.faixa];
  return (
    <>
      <div className="mt-4 flex items-baseline justify-between gap-3">
        <p className="flex items-baseline gap-1.5 font-mono">
          <span className="tabular text-[32px] leading-[38px] font-medium tracking-[-0.5px] text-fg">
            {formatarAceleracao(vibracao.rmsMs2).valor}
          </span>
          <span className="text-sm text-fg-muted">
            {formatarAceleracao(vibracao.rmsMs2).unidade}
          </span>
        </p>
        <p className={cn('font-mono text-[13px]', faixa.classe)}>{faixa.texto}</p>
      </div>
      <div className="mt-4 rounded-control bg-inset px-3 py-4">
        <OndaVibracao />
      </div>
      <dl className="mt-auto flex flex-col gap-3 pt-6">
        <Detalhe rotulo="Piezos ativos">
          <PontosPiezos ativos={vibracao.piezosAtivos} total={vibracao.piezosTotal} />
          <span>{`${vibracao.piezosAtivos} / ${vibracao.piezosTotal}`}</span>
        </Detalhe>
        <Detalhe rotulo="Frequência dominante">
          {formatarMedida({
            valor: formatarNumero(vibracao.frequenciaDominanteHz, 1),
            unidade: 'Hz',
          })}
        </Detalhe>
        <Detalhe rotulo="Temperatura no bloco">
          {formatarMedida({ valor: formatarNumero(vibracao.temperaturaBlocoC, 1), unidade: '°C' })}
        </Detalhe>
      </dl>
    </>
  );
}

/** Renderiza o card como região nomeada "Vibração RMS". */
export function CardVibracao() {
  const vibracao = useVibracao();
  const idTitulo = useId();
  return (
    <Card as="section" aria-labelledby={idTitulo} className="flex flex-col">
      <header className="flex items-start justify-between gap-3">
        <h2 id={idTitulo} className="text-base leading-[22px] font-semibold text-fg">
          Vibração RMS
        </h2>
        {vibracao.data && (
          <Badge tone="accent" dot={false}>
            {`Eixo ${vibracao.data.eixo}`}
          </Badge>
        )}
      </header>
      <EstadoConsulta
        consulta={vibracao}
        nome="a vibração"
        carregando={
          <span className="mt-4 flex flex-col gap-4">
            <Skeleton className="h-9 w-28" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-16 w-full" />
          </span>
        }
      >
        {(dados) => <ConteudoVibracao vibracao={dados} />}
      </EstadoConsulta>
    </Card>
  );
}
