/**
 * Card de KPI ligado a uma consulta de dados.
 *
 * Junta `KpiCard` e `EstadoConsulta`: o rótulo aparece sempre (o card não
 * some enquanto carrega) e o valor só quando os dados chegam. Carregando, o
 * card mostra um esqueleto do tamanho do valor; com erro, a mensagem e o
 * botão "Tentar de novo".
 */

import type { ReactNode } from 'react';
import { EstadoConsulta, type ConsultaBasica } from './EstadoConsulta';
import { KpiCard, type KpiCardProps } from './KpiCard';
import { Skeleton } from './Skeleton';

/** O que o card mostra quando os dados chegam (tudo do KpiCard, menos o rótulo). */
export type ConteudoKpi = Omit<KpiCardProps, 'label' | 'className'>;

export interface KpiConsultaProps<T> {
  label: string;
  consulta: ConsultaBasica<T>;
  /** Nome do dado com artigo, para a mensagem de erro ("a bateria"). */
  nome: string;
  /** Badge exibido mesmo antes de os dados chegarem (ex.: "Ao vivo"). */
  badge?: ReactNode;
  className?: string;
  /** Monta valor, unidade, badge e rodapé a partir dos dados. */
  children: (dados: T) => ConteudoKpi;
}

/**
 * Renderiza o KPI conforme o estado da consulta.
 *
 * Com dados, delega tudo ao `KpiCard`. Sem dados, renderiza o `KpiCard` sem
 * valor e coloca o `EstadoConsulta` no rodapé, que mostra o esqueleto ou o
 * erro.
 */
export function KpiConsulta<T>({ label, consulta, nome, badge, className, children }: KpiConsultaProps<T>) {
  if (consulta.data !== undefined && !consulta.isError) {
    const conteudo = children(consulta.data);
    return <KpiCard label={label} className={className} {...conteudo} badge={conteudo.badge ?? badge} />;
  }
  return (
    <KpiCard label={label} badge={badge} className={className}>
      <EstadoConsulta
        consulta={consulta}
        nome={nome}
        carregando={
          <span className="flex flex-col gap-3">
            <Skeleton className="h-9 w-28" />
            <Skeleton className="h-2 w-full" />
          </span>
        }
      >
        {() => null}
      </EstadoConsulta>
    </KpiCard>
  );
}
