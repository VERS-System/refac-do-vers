/**
 * Card "Cadeia de conversão" da Visão geral.
 *
 * Mostra a leitura ao vivo dos 4 pontos medidos pelo ESP32, do nó
 * piezoelétrico ao celular: tensão, corrente e potência de cada um, e a
 * eficiência de cada estágio (potência do ponto sobre a do anterior).
 */

import { useId } from 'react';
import { RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
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
  valor: string;
  destaque?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 font-mono text-[13px]">
      <dt className="text-fg-secondary">{rotulo}</dt>
      <dd className={destaque ? 'font-medium text-accent' : 'text-fg'}>{valor}</dd>
    </div>
  );
}

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
        <Medida
          rotulo={`Tensão (V${n})`}
          valor={formatarMedida({ valor: formatarNumero(ponto.tensaoV, 2), unidade: 'V' })}
        />
        <Medida
          rotulo={`Corrente (I${n})`}
          valor={formatarMedida({ valor: formatarNumero(ponto.correnteMa), unidade: 'mA' })}
        />
        <Medida
          rotulo={`Potência (P${n})`}
          valor={formatarMedida(formatarPotencia(ponto.potenciaMw))}
          destaque
        />
      </dl>
    </article>
  );
}

/** Renderiza o card como região nomeada "Cadeia de conversão". */
export function CadeiaConversao() {
  const cadeia = useCadeiaAoVivo();
  const idTitulo = useId();
  return (
    <Card as="section" aria-labelledby={idTitulo}>
      <header className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
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
            <span className="grid grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((n) => (
                <Skeleton key={n} className="h-40" />
              ))}
            </span>
          }
        >
          {(dados) => (
            <div className="grid grid-cols-4 gap-4">
              {dados.pontos.map((ponto) => (
                <CartaoPonto key={ponto.ponto} ponto={ponto} />
              ))}
            </div>
          )}
        </EstadoConsulta>
      </div>
    </Card>
  );
}
