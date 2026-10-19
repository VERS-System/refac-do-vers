/**
 * Card "Estado da bateria" da tela Energia.
 *
 * Mostra a especificação da bateria, o estado (carregando, descarregando,
 * ociosa), a carga e a tensão atuais, uma barra de 10 segmentos, a tensão
 * ao longo de hoje e os ciclos e a temperatura. Não depende do período: é o
 * estado atual do sistema.
 */

import { useId, type ReactNode } from 'react';
import { RefreshCw, Thermometer } from 'lucide-react';
import { BarraSegmentos } from '@/components/charts/BarraSegmentos';
import { Sparkline } from '@/components/charts/Sparkline';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { EstadoConsulta } from '@/components/ui/EstadoConsulta';
import { Skeleton } from '@/components/ui/Skeleton';
import type { Bateria, SerieTensaoBateria } from '@/data/tipos';
import { useBateria, useTensaoBateria } from '@/hooks/useDados';
import { formatarMedida, formatarNumero } from '@/lib/format';
import { ESTADOS_BATERIA } from './estadoBateria';

/** Texto "3,92 V" de uma tensão. */
const textoTensao = (volts: number) =>
  formatarMedida({ valor: formatarNumero(volts, 2), unidade: 'V' });

/** Pílula com ícone e texto ("Ciclos 3"), no rodapé do card. */
function Pilula({ icone, children }: { icone: ReactNode; children: ReactNode }) {
  return (
    <span className="flex items-center gap-2 rounded-full bg-inset px-3 py-2 font-mono text-xs text-fg-secondary">
      {icone}
      <span>{children}</span>
    </span>
  );
}

/**
 * Minigráfico da tensão de hoje, com a faixa (mínimo e máximo) em texto.
 *
 * A linha é decorativa; o que vale para leitores de tela é a legenda.
 */
function TensaoHoje({ serie }: { serie: SerieTensaoBateria }) {
  const tensoes = serie.pontos.map((ponto) => ponto.tensaoV);
  if (tensoes.length < 2) return null;
  return (
    <div className="flex flex-col gap-2">
      <Sparkline valores={tensoes} className="h-12 text-info" />
      <p className="font-mono text-xs text-fg-muted">
        {`Tensão hoje (V) · mín ${formatarNumero(Math.min(...tensoes), 2)} · máx ${formatarNumero(Math.max(...tensoes), 2)}`}
      </p>
    </div>
  );
}

/** Conteúdo do card com a bateria carregada. */
function ConteudoBateria({ bateria }: { bateria: Bateria }) {
  const tensao = useTensaoBateria();
  return (
    <div className="flex flex-1 flex-col gap-5">
      <p className="flex items-baseline gap-2 font-mono">
        <span className="tabular text-[32px] leading-[38px] font-medium tracking-[-0.5px] text-fg">
          {formatarNumero(bateria.cargaPercentual)}
        </span>
        <span className="text-sm text-fg-muted">%</span>
        <span className="ml-1 text-sm text-fg-secondary">{textoTensao(bateria.tensaoV)}</span>
      </p>
      <BarraSegmentos
        valor={bateria.cargaPercentual}
        maximo={100}
        segmentos={10}
        rotulo="Carga da bateria"
        tom="success"
      />
      {tensao.data && <TensaoHoje serie={tensao.data} />}
      <div className="mt-auto flex flex-wrap gap-2">
        <Pilula
          icone={<RefreshCw aria-hidden="true" className="size-3.5" />}
        >{`Ciclos ${bateria.ciclos}`}</Pilula>
        <Pilula icone={<Thermometer aria-hidden="true" className="size-3.5" />}>
          {`Temperatura ${formatarMedida({ valor: formatarNumero(bateria.temperaturaC, 1), unidade: '°C' })}`}
        </Pilula>
      </div>
    </div>
  );
}

/**
 * Renderiza o card como região nomeada "Estado da bateria".
 *
 * A capacidade fica sem separador de milhar ("2200 mAh"), como nas fichas
 * técnicas de baterias.
 */
export function CardEstadoBateria() {
  const bateria = useBateria();
  const idTitulo = useId();
  const estado = bateria.data && ESTADOS_BATERIA[bateria.data.estado];
  return (
    <Card as="section" aria-labelledby={idTitulo} className="flex flex-col">
      <header className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 id={idTitulo} className="text-base leading-[22px] font-semibold text-fg">
            Estado da bateria
          </h2>
          {bateria.data && (
            <p className="font-mono text-xs text-fg-muted">
              {`${bateria.data.quimica} ${formatarNumero(bateria.data.tensaoNominalV, 1)} V · ${bateria.data.capacidadeMah} mAh`}
            </p>
          )}
        </div>
        {estado && (
          <Badge tone={estado.tom} dot={false}>
            {estado.texto}
          </Badge>
        )}
      </header>
      <div className="mt-5 flex flex-1 flex-col">
        <EstadoConsulta
          consulta={bateria}
          nome="a bateria"
          carregando={
            <span className="flex flex-col gap-4">
              <Skeleton className="h-9 w-32" />
              <Skeleton className="h-2 w-full" />
              <Skeleton className="h-12 w-full" />
            </span>
          }
        >
          {(dados) => <ConteudoBateria bateria={dados} />}
        </EstadoConsulta>
      </div>
    </Card>
  );
}
