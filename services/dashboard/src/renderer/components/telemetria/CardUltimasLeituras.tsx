/**
 * Card "Últimas leituras" da Telemetria.
 *
 * Lista as amostras mais recentes do teste (horário, potência, tensão e
 * qualidade), o estado da conexão ao vivo e quantas amostras o teste tem.
 * Substitui o "Buffer local · Limpar" da referência: o desktop não guarda
 * histórico local como fonte de verdade (task D05).
 */

import { useId } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { EstadoConsulta, type ConsultaBasica } from '@/components/ui/EstadoConsulta';
import { Skeleton } from '@/components/ui/Skeleton';
import type { EstadoConexao } from '@/data/calculos';
import type { AmostraTelemetria, PaginaDe } from '@/data/tipos';
import {
  formatarHorarioCaptura,
  formatarMedida,
  formatarNumero,
  formatarPotencia,
} from '@/lib/format';
import { BADGE_CONEXAO, BADGE_QUALIDADE } from './rotulos';

export interface CardUltimasLeiturasProps {
  /** Consulta das leituras mais recentes (a primeira página, já limitada). */
  consulta: ConsultaBasica<PaginaDe<AmostraTelemetria>>;
  conexao: EstadoConexao;
}

/** Uma leitura da lista: horário, potência, tensão e qualidade. */
function Leitura({ amostra }: { amostra: AmostraTelemetria }) {
  const qualidade = BADGE_QUALIDADE[amostra.qualidade];
  return (
    <li className="flex items-center justify-between gap-3 rounded-control bg-inset px-3 py-2.5 font-mono text-xs">
      <span className="text-fg-muted">{formatarHorarioCaptura(amostra.capturadaEm)}</span>
      <span className="font-medium text-accent">
        {formatarMedida(formatarPotencia(amostra.potenciaMw))}
      </span>
      <span className="text-fg-secondary">
        {formatarMedida({ valor: formatarNumero(amostra.tensaoV, 2), unidade: 'V' })}
      </span>
      <Badge tone={qualidade.tom} dot={false}>
        {qualidade.texto}
      </Badge>
    </li>
  );
}

/** Renderiza o card como região nomeada "Últimas leituras". */
export function CardUltimasLeituras({ consulta, conexao }: CardUltimasLeiturasProps) {
  const idTitulo = useId();
  const estado = BADGE_CONEXAO[conexao];
  return (
    <Card as="section" aria-labelledby={idTitulo} className="flex flex-col">
      <header className="flex items-center justify-between gap-3">
        <h2 id={idTitulo} className="text-base leading-[22px] font-semibold text-fg">
          Últimas leituras
        </h2>
        <Badge tone={estado.tom}>{estado.texto}</Badge>
      </header>
      <div className="mt-4 flex-1">
        <EstadoConsulta
          consulta={consulta}
          nome="as últimas leituras"
          carregando={
            <span className="flex flex-col gap-2">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <Skeleton key={n} className="h-10 w-full" />
              ))}
            </span>
          }
        >
          {(pagina) => (
            <div className="flex h-full flex-col gap-3">
              {pagina.itens.length === 0 ? (
                <p className="text-[13px] text-fg-muted">Nenhuma amostra neste teste.</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {pagina.itens.map((amostra) => (
                    <Leitura key={amostra.id} amostra={amostra} />
                  ))}
                </ul>
              )}
              <p className="mt-auto font-mono text-xs text-fg-muted">{`${formatarNumero(pagina.total)} amostras neste teste`}</p>
            </div>
          )}
        </EstadoConsulta>
      </div>
    </Card>
  );
}
