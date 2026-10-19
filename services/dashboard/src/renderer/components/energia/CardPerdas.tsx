/**
 * Card "Perdas na conversão" da tela Energia.
 *
 * Mostra os 4 pontos da cadeia, do nó piezoelétrico ao celular: o ponto 1
 * com a energia gerada no período e os pontos 2 a 4 com quanto dela chegou
 * até eles, em % (decisão de 19/10/2026). Cada estágio traz a sua perda e
 * uma barra proporcional ao ponto 1. Fecha com a eficiência ponta a ponta.
 * Na Hora não há energia por ponto (só a curva do P1), e o card diz isso.
 */

import { useId } from 'react';
import { CircleCheck } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { EstadoConsulta } from '@/components/ui/EstadoConsulta';
import { Skeleton } from '@/components/ui/Skeleton';
import type { EnergiaPorPonto, ResumoEnergia } from '@/data/tipos';
import { useResumoEnergia } from '@/hooks/useDados';
import { cn } from '@/lib/cn';
import { eficiencia } from '@/data/calculos';
import { formatarEnergia, formatarMedida, formatarPercentual } from '@/lib/format';
import { SEM_DETALHE_POR_PONTO } from './KpisEnergia';

/** Os 4 pontos, na ordem da cadeia, com a cor da barra de cada um. */
const PONTOS: { chave: keyof EnergiaPorPonto; nome: string; cor: string }[] = [
  { chave: 'p1', nome: 'Ponto 1 · Nó piezoelétrico', cor: 'bg-accent' },
  { chave: 'p2', nome: 'Ponto 2 · Saída LTC3588', cor: 'bg-accent/70' },
  { chave: 'p3', nome: 'Ponto 3 · Bateria TP4056', cor: 'bg-chart-2' },
  { chave: 'p4', nome: 'Ponto 4 · Celular', cor: 'bg-chart-3' },
];

/** Perda de cada estágio, na ordem dos pontos 2 a 4 (o ponto 1 não tem estágio anterior). */
function perdasPorPonto(resumo: ResumoEnergia): (number | null)[] {
  const perdas = resumo.perdas;
  return [null, perdas?.regulador ?? null, perdas?.bateria ?? null, perdas?.celular ?? null];
}

/**
 * Valor de um ponto: a energia gerada no ponto 1 e, nos demais, quanto do
 * gerado chegou até ele ("87,1%").
 */
function valorDoPonto(energia: EnergiaPorPonto, chave: keyof EnergiaPorPonto): string {
  if (chave === 'p1') return formatarMedida(formatarEnergia(energia.p1));
  return formatarMedida(formatarPercentual(eficiencia(energia[chave], energia.p1)));
}

/** Lista dos pontos e a eficiência ponta a ponta, com os dados carregados. */
function ConteudoPerdas({ resumo }: { resumo: ResumoEnergia }) {
  const energia = resumo.porPonto;
  if (!energia) return <p className="text-[13px] text-fg-muted">{SEM_DETALHE_POR_PONTO}</p>;
  const perdas = perdasPorPonto(resumo);
  return (
    <>
      <ul className="flex flex-col gap-4">
        {PONTOS.map((ponto, i) => {
          const proporcao = energia.p1 > 0 ? Math.min(energia[ponto.chave] / energia.p1, 1) : 0;
          const perda = perdas[i];
          return (
            <li key={ponto.chave} className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-3 font-mono text-xs">
                <span className={i === 0 ? 'font-medium text-fg' : 'text-fg-secondary'}>
                  {ponto.nome}
                </span>
                <span className="flex shrink-0 items-center gap-3">
                  {perda !== null && (
                    <span className="text-danger">{`−${formatarPercentual(perda).valor}%`}</span>
                  )}
                  <span className="font-medium text-fg">{valorDoPonto(energia, ponto.chave)}</span>
                </span>
              </div>
              <div
                aria-hidden="true"
                className="h-1.5 overflow-hidden rounded-full bg-surface-raised"
              >
                <div
                  className={cn('h-full rounded-full', ponto.cor)}
                  style={{ width: `${proporcao * 100}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
      <div className="mt-auto flex items-center justify-between gap-3 rounded-control bg-inset px-4 py-3">
        <span className="flex items-center gap-2 text-[13px] font-medium text-fg">
          <CircleCheck aria-hidden="true" className="size-4 text-success" />
          Eficiência ponta a ponta
        </span>
        <span className="font-mono text-base font-medium text-success">
          {formatarMedida(formatarPercentual(resumo.eficienciaPercentual))}
        </span>
      </div>
    </>
  );
}

/** Renderiza o card como região nomeada "Perdas na conversão". */
export function CardPerdas() {
  const resumo = useResumoEnergia();
  const idTitulo = useId();
  return (
    <Card as="section" aria-labelledby={idTitulo} className="flex flex-col">
      <h2 id={idTitulo} className="text-base leading-[22px] font-semibold text-fg">
        Perdas na conversão
      </h2>
      <p className="mt-1 text-[13px] leading-[18px] text-fg-muted">
        Rendimento através dos 4 nós do sistema
      </p>
      <div className="mt-5 flex flex-1 flex-col gap-6">
        <EstadoConsulta
          consulta={resumo}
          nome="as perdas na conversão"
          carregando={
            <span className="flex flex-col gap-4">
              {PONTOS.map((ponto) => (
                <Skeleton key={ponto.chave} className="h-8 w-full" />
              ))}
            </span>
          }
        >
          {(dados) => <ConteudoPerdas resumo={dados} />}
        </EstadoConsulta>
      </div>
    </Card>
  );
}
