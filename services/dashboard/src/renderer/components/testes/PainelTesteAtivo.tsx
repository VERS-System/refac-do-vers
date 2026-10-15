/**
 * Painel do teste em andamento da tela Testes.
 *
 * Mostra só o que o VERS mede (decisão de 14/10/2026): tempo decorrido,
 * energia recuperada e potência instantânea (da última amostra da
 * telemetria), piezos, configuração e bateria, com "Finalizar teste" e
 * "Cancelar teste". Velocidade, rotação e inclinação não são medidas: são
 * informadas ao finalizar. Sem teste em andamento, oferece iniciar o próximo
 * planejado.
 */

import { useId, type ReactNode } from 'react';
import { CircleStop, Play, X } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EstadoConsulta } from '@/components/ui/EstadoConsulta';
import { Skeleton } from '@/components/ui/Skeleton';
import type { TesteCampo } from '@/data/tipos';
import { useAmostrasTelemetria, useBateria, useTestes } from '@/hooks/useDados';
import { formatarEnergia, formatarNumero, formatarPotencia } from '@/lib/format';
import { rotuloUnidade } from '@/lib/unidades';
import { formatarCronometro, segundosEntre } from './rotulos';

/** Intervalo da atualização ao vivo (o das amostras do ESP32). */
const INTERVALO_AO_VIVO_MS = 10_000;

export interface PainelTesteAtivoProps {
  /** Relógio do repositório, para o tempo decorrido. */
  agora: string;
  onFinalizar: (teste: TesteCampo) => void;
  onCancelar: (teste: TesteCampo) => void;
  onIniciar: (teste: TesteCampo) => void;
}

/** Bloco de uma medida: rótulo pequeno, valor em destaque e unidade. */
function Medida({
  rotulo,
  valor,
  unidade,
}: {
  rotulo: string;
  valor: ReactNode;
  unidade?: string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-control bg-inset px-3 py-3">
      <span className="text-xs text-fg-muted">{rotulo}</span>
      <span className="flex items-baseline gap-1 font-mono">
        <span className="tabular text-xl font-medium text-fg">{valor}</span>
        {unidade && <span className="text-xs text-fg-muted">{unidade}</span>}
      </span>
    </div>
  );
}

/** Conteúdo com o teste em andamento e as leituras ao vivo. */
function TesteEmAndamento({
  teste,
  agora,
  onFinalizar,
  onCancelar,
}: { teste: TesteCampo } & PainelTesteAtivoProps) {
  const leitura = useAmostrasTelemetria(
    { testeId: teste.id, tamanhoPagina: 1 },
    { intervaloMs: INTERVALO_AO_VIVO_MS },
  );
  const bateria = useBateria();
  const ultima = leitura.data?.itens[0];
  const decorrido = teste.inicio ? segundosEntre(teste.inicio, agora) : 0;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[15px] font-semibold text-fg">{`${teste.codigo} · ${teste.nome}`}</p>
      <div className="grid grid-cols-2 gap-2">
        <Medida rotulo="Tempo decorrido" valor={formatarCronometro(decorrido)} />
        <Medida
          rotulo="Recuperado"
          valor={formatarEnergia(ultima?.energiaAcumuladaMwh, { unidade: 'mWh' }).valor}
          unidade={rotuloUnidade('energia')}
        />
        <Medida
          rotulo="Potência instantânea"
          valor={formatarPotencia(ultima?.potenciaMw).valor}
          unidade={rotuloUnidade('potencia')}
        />
        <Medida
          rotulo="Piezos ativos"
          valor={
            ultima
              ? `${ultima.piezosAtivos ?? '–'}/${ultima.piezosTotal}`
              : String(teste.piezosAtivos)
          }
        />
      </div>
      <div className="flex items-center justify-between gap-3 rounded-control border border-line-subtle px-3 py-2 font-mono text-xs">
        <span className="text-fg-secondary">{`Config v${teste.versaoConfiguracao} · ${teste.piezosAtivos} piezos`}</span>
        {bateria.data && (
          <span className="text-success">{`Bateria ${formatarNumero(bateria.data.cargaPercentual)}%`}</span>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <Button variant="danger" icon={CircleStop} onClick={() => onFinalizar(teste)}>
          Finalizar teste
        </Button>
        <Button variant="secondary" icon={X} onClick={() => onCancelar(teste)}>
          Cancelar teste
        </Button>
      </div>
    </div>
  );
}

/** Sem teste em andamento: o próximo planejado, se houver, com "Iniciar teste". */
function SemTesteEmAndamento({ onIniciar }: Pick<PainelTesteAtivoProps, 'onIniciar'>) {
  const planejados = useTestes({ status: 'planejado', tamanhoPagina: 1 });
  const proximo = planejados.data?.itens[0];
  return (
    <div className="flex flex-col gap-4">
      <p className="text-[15px] font-semibold text-fg">Nenhum teste em andamento</p>
      {proximo ? (
        <>
          <p className="text-[13px] text-fg-secondary">{`Próximo planejado: ${proximo.codigo} · ${proximo.nome}`}</p>
          <Button icon={Play} onClick={() => onIniciar(proximo)}>
            Iniciar teste
          </Button>
        </>
      ) : (
        <p className="text-[13px] text-fg-muted">
          Nenhum teste planejado. Use "Novo teste" para planejar.
        </p>
      )}
    </div>
  );
}

/** Renderiza o painel como região nomeada "Teste em andamento". */
export function PainelTesteAtivo(props: PainelTesteAtivoProps) {
  const emAndamento = useTestes({ status: 'em-andamento', tamanhoPagina: 1 });
  const idTitulo = useId();
  return (
    <Card as="section" aria-labelledby={idTitulo} className="flex flex-col gap-4">
      <header className="flex items-center justify-between gap-3">
        <h2 id={idTitulo} className="text-base leading-[22px] font-semibold text-fg">
          Teste em andamento
        </h2>
        {emAndamento.data?.itens[0] && <Badge tone="accent">Ao vivo</Badge>}
      </header>
      <EstadoConsulta
        consulta={emAndamento}
        nome="o teste em andamento"
        carregando={<Skeleton className="h-64 w-full" />}
      >
        {(pagina) =>
          pagina.itens[0] ? (
            <TesteEmAndamento teste={pagina.itens[0]} {...props} />
          ) : (
            <SemTesteEmAndamento onIniciar={props.onIniciar} />
          )
        }
      </EstadoConsulta>
    </Card>
  );
}
