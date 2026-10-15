/**
 * Painel lateral da Viber: o contexto da conversa e as conversas recentes.
 *
 * O contexto mostra os dados que delimitam as respostas (período, veículo,
 * teste em andamento, amostras e a leitura atual dos 4 nós) e deixa escolher
 * entre os contextos autorizados (task D11). As conversas recentes abrem a
 * conversa escolhida.
 */

import { useId, type ReactNode } from 'react';
import { MessagesSquare } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { EstadoConsulta } from '@/components/ui/EstadoConsulta';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Skeleton } from '@/components/ui/Skeleton';
import { ViberMark } from '@/components/ui/ViberMark';
import { useRepositorio } from '@/data/repositorio';
import type { ContextoViber } from '@/data/tipos';
import {
  useAmostrasTelemetria,
  useBateria,
  useCadeiaAoVivo,
  useConversasViber,
  useResumoEnergia,
  useTestes,
  useVeiculoAtivo,
} from '@/hooks/useDados';
import { cn } from '@/lib/cn';
import { formatarDataCurta, formatarMedida, formatarNumero, formatarPotencia } from '@/lib/format';

/** Bloco "rótulo / valor" do contexto. */
function Item({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1 rounded-control border border-line-subtle bg-inset px-3 py-2.5">
      <dt className="text-[11px] text-fg-muted">{rotulo}</dt>
      <dd className="font-mono text-xs text-fg">{children}</dd>
    </div>
  );
}

/** Leitura de um nó: nome curto e valor. */
function No({ nome, valor }: { nome: string; valor: string | undefined }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-control border border-line px-2 py-2 text-center font-mono text-[11px]">
      <span className="text-fg-secondary">{nome}</span>
      <span className="text-accent">{valor ?? '–'}</span>
    </div>
  );
}

export interface PainelContextoProps {
  contextos: ContextoViber[] | undefined;
  contextoId: string;
  onTrocarContexto: (id: string) => void;
}

/** Contexto da conversa: escolha do contexto e os dados que ele cobre. */
export function PainelContexto({ contextos, contextoId, onTrocarContexto }: PainelContextoProps) {
  const repositorio = useRepositorio();
  const veiculo = useVeiculoAtivo();
  const semana = useResumoEnergia('semana');
  const emAndamento = useTestes({ status: 'em-andamento', tamanhoPagina: 1 });
  const teste = emAndamento.data?.itens[0];
  const amostras = useAmostrasTelemetria(teste ? { testeId: teste.id, tamanhoPagina: 1 } : null);
  const cadeia = useCadeiaAoVivo();
  const bateria = useBateria();
  const idTitulo = useId();
  const agora = repositorio.agora();
  const horaAgora = `${String(agora.getHours()).padStart(2, '0')}:${String(agora.getMinutes()).padStart(2, '0')}`;

  /** Texto do período coberto pelo contexto escolhido. */
  function periodo(): string {
    if (contextoId === 'hoje') return `Hoje, até ${horaAgora}`;
    if (contextoId === 'semana') {
      return semana.data
        ? `${formatarDataCurta(semana.data.inicio)} a ${formatarDataCurta(semana.data.fim)}`
        : '…';
    }
    return teste?.inicio ? `Desde ${teste.inicio.slice(11, 16)}` : '…';
  }

  const pontos = cadeia.data?.pontos;
  return (
    <Card as="section" aria-labelledby={idTitulo} className="flex flex-col gap-4">
      <h2 id={idTitulo} className="text-base leading-[22px] font-semibold text-fg">
        Contexto da conversa
      </h2>
      {contextos && contextos.length > 0 ? (
        <SegmentedControl
          aria-label="Contexto"
          options={contextos.map((c) => ({ value: c.id, label: c.rotulo }))}
          value={contextoId}
          onChange={onTrocarContexto}
        />
      ) : (
        <Skeleton className="h-9 w-full" />
      )}
      <dl className="grid grid-cols-2 gap-2">
        <Item rotulo="Período">{periodo()}</Item>
        <Item rotulo="Veículo">{veiculo.data?.descricao ?? '…'}</Item>
        <Item rotulo="Teste ativo">{teste ? `${teste.codigo} · ${teste.nome}` : 'Nenhum'}</Item>
        <Item rotulo="Amostras">
          {amostras.data ? `${formatarNumero(amostras.data.total)} validadas` : '–'}
        </Item>
      </dl>
      <div className="flex flex-col gap-2 rounded-control border border-line-subtle p-3">
        <span className="font-label text-[11px] tracking-[0.06em] text-fg-muted uppercase">
          Nós de captura · ao vivo
        </span>
        <div className="grid grid-cols-4 gap-1.5">
          <No
            nome="P1 Piezo"
            valor={pontos ? formatarMedida(formatarPotencia(pontos[0].potenciaMw)) : undefined}
          />
          <No
            nome="P2 Reg."
            valor={
              pontos
                ? formatarMedida({ valor: formatarNumero(pontos[1].tensaoV, 2), unidade: 'V' })
                : undefined
            }
          />
          <No
            nome="P3 Bat."
            valor={bateria.data ? `${formatarNumero(bateria.data.cargaPercentual)}%` : undefined}
          />
          <No
            nome="P4 Saída"
            valor={pontos ? formatarMedida(formatarPotencia(pontos[3].potenciaMw)) : undefined}
          />
        </div>
      </div>
    </Card>
  );
}

export interface ConversasRecentesProps {
  conversaId: string | null;
  onAbrir: (id: string) => void;
}

/** Conversas recentes, da mais nova para a mais antiga; a aberta fica marcada. */
export function ConversasRecentes({ conversaId, onAbrir }: ConversasRecentesProps) {
  const conversas = useConversasViber();
  const idTitulo = useId();
  return (
    <Card as="section" aria-labelledby={idTitulo} className="flex flex-col gap-3">
      <h2
        id={idTitulo}
        className="flex items-center gap-2 text-base leading-[22px] font-semibold text-fg"
      >
        <MessagesSquare aria-hidden="true" className="size-4 text-fg-muted" />
        Conversas recentes
      </h2>
      <EstadoConsulta
        consulta={conversas}
        nome="as conversas"
        carregando={<Skeleton className="h-32 w-full" />}
      >
        {(lista) => (
          <ul className="flex flex-col gap-1">
            {lista.map((conversa) => {
              const aberta = conversa.id === conversaId;
              return (
                <li key={conversa.id}>
                  <button
                    type="button"
                    aria-current={aberta ? 'true' : undefined}
                    onClick={() => onAbrir(conversa.id)}
                    className={cn(
                      'flex w-full items-start gap-3 rounded-control px-3 py-2 text-left transition-colors',
                      aberta ? 'bg-accent-subtle' : 'hover:bg-hover',
                    )}
                  >
                    <ViberMark
                      size={14}
                      decorative
                      className={aberta ? 'mt-0.5 text-accent' : 'mt-0.5 text-fg-muted'}
                    />
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate text-[13px] text-fg">{conversa.titulo}</span>
                      <span className="font-mono text-[11px] text-fg-muted">
                        {`${formatarDataCurta(conversa.atualizadaEm.slice(0, 10))}, ${conversa.atualizadaEm.slice(11, 16)}`}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </EstadoConsulta>
      <p className="border-t border-line-subtle pt-3 text-[11px] text-fg-muted">
        O Viber pode errar. Confira os números na Telemetria.
      </p>
    </Card>
  );
}
