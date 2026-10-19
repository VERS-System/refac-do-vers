/**
 * Card "Instalação" da tela Veículo e instalação.
 *
 * Instalação do VERS no veículo principal: status, modelo, data, topologia
 * dos piezos, circuito (versão da configuração e conversor), capacidade em
 * operação, associação dos nós (só leitura: mudar exige o ESP32 real),
 * armazenamento, ponto de instalação e versões da configuração. Sem
 * instalação, a tela diz isso (estado do D07).
 */

import { useId } from 'react';
import { MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { EstadoConsulta } from '@/components/ui/EstadoConsulta';
import { Skeleton } from '@/components/ui/Skeleton';
import type { Configuracao, Instalacao } from '@/data/tipos';
import { useBateria, useConfiguracoes, useInstalacao, useVeiculos } from '@/hooks/useDados';
import { cn } from '@/lib/cn';
import { formatarData, formatarNumero } from '@/lib/format';
import {
  ASSOCIACOES,
  BADGE_INSTALACAO,
  DISPONIVEL_COM_A_API,
  TEXTO_ARMAZENAMENTO,
} from './rotulos';
import { TopologiaPiezos } from './TopologiaPiezos';

/**
 * Associação dos nós como grupo de rádios desativado: mostra a escolha da
 * configuração ativa, mas não permite mudar (é uma ação no hardware).
 */
function Associacao({ configuracao }: { configuracao: Configuracao }) {
  return (
    <div
      role="radiogroup"
      aria-label="Associação dos nós"
      title={DISPONIVEL_COM_A_API}
      className="flex gap-1 rounded-full border border-line-subtle bg-inset p-1"
    >
      {ASSOCIACOES.map((opcao) => {
        const marcada = configuracao.associacao === opcao.valor;
        return (
          <button
            key={opcao.valor}
            type="button"
            role="radio"
            aria-checked={marcada}
            disabled
            className={cn(
              'flex-1 cursor-not-allowed rounded-full px-3 py-1 text-xs',
              marcada ? 'bg-accent font-medium text-fg-on-accent' : 'text-fg-muted',
            )}
          >
            {opcao.rotulo}
          </button>
        );
      })}
    </div>
  );
}

/** Conteúdo com a instalação e a configuração ativa. */
function ConteudoInstalacao({
  instalacao,
  configuracoes,
}: {
  instalacao: Instalacao;
  configuracoes: Configuracao[];
}) {
  const bateria = useBateria();
  const ativa = configuracoes[0];
  const status = BADGE_INSTALACAO[instalacao.status];
  const capacidade = ativa ? Math.round((ativa.piezosAtivos / ativa.piezosTotal) * 100) : 0;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line-subtle pb-4">
        <Badge tone={status.tom}>{status.texto}</Badge>
        <span className="font-mono text-sm text-fg">{instalacao.modelo}</span>
        {instalacao.instaladaEm && (
          <span className="font-mono text-xs text-fg-muted">{`Instalada em ${formatarData(instalacao.instaladaEm)}`}</span>
        )}
      </div>
      {ativa && (
        <>
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-[15px] font-semibold text-fg">Topologia piezoelétrica do chassi</h3>
            <span className="font-mono text-xs text-accent">{`${ativa.piezosAtivos} de ${ativa.piezosTotal} piezos captando`}</span>
          </div>
          <TopologiaPiezos total={ativa.piezosTotal} inativos={ativa.piezosInativos} />
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-3 text-[13px]">
              <span className="font-semibold text-fg">{`Configuração de circuito · ${ativa.nome}`}</span>
              <span className="font-mono text-xs text-fg-muted">Harvester LTC3588</span>
            </div>
            <div className="flex items-center justify-between font-mono text-xs">
              <span className="text-fg-secondary">Capacidade instalada</span>
              <span className="text-accent">{`${capacidade}% em operação`}</span>
            </div>
            <div
              aria-hidden="true"
              className="h-1.5 overflow-hidden rounded-full bg-surface-raised"
            >
              <div className="h-full rounded-full bg-accent" style={{ width: `${capacidade}%` }} />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 min-[1440px]:grid-cols-2">
            <div className="flex flex-col gap-2 rounded-control border border-line-subtle p-3">
              <span className="font-label text-[11px] tracking-[0.06em] text-fg-muted uppercase">
                Associação dos nós
              </span>
              <Associacao configuracao={ativa} />
            </div>
            <div className="flex flex-col gap-1 rounded-control border border-line-subtle p-3">
              <span className="font-label text-[11px] tracking-[0.06em] text-fg-muted uppercase">
                Armazenamento
              </span>
              <span className="text-[13px] font-medium text-fg">{`${TEXTO_ARMAZENAMENTO[ativa.armazenamento]} · TP4056`}</span>
              {bateria.data && (
                <span className="font-mono text-xs text-fg-muted">
                  {`${bateria.data.quimica} ${formatarNumero(bateria.data.tensaoNominalV, 1)} V · ${bateria.data.capacidadeMah} mAh`}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-control border border-line-subtle p-3">
            <MapPin aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-accent" />
            <div className="flex flex-col gap-1">
              <span className="text-[13px] font-semibold text-fg">Ponto de instalação</span>
              <span className="text-xs text-fg-muted">{ativa.pontoInstalacao}</span>
            </div>
          </div>
          <ul aria-label="Versões da configuração" className="flex flex-wrap gap-2">
            {configuracoes.map((configuracao, i) => (
              <li
                key={configuracao.id}
                title={`${formatarData(configuracao.criadaEm.slice(0, 10))}${configuracao.observacoes ? ` · ${configuracao.observacoes}` : ''}`}
                className={cn(
                  'rounded-full border px-2.5 py-0.5 font-mono text-xs',
                  i === 0 ? 'border-accent-border text-accent' : 'border-line-subtle text-fg-muted',
                )}
              >
                {i === 0 ? `v${configuracao.versao} (ativa)` : `v${configuracao.versao}`}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

/** Carrega as versões da configuração da instalação e desenha o conteúdo. */
function InstalacaoComConfiguracoes({ instalacao }: { instalacao: Instalacao }) {
  const configuracoes = useConfiguracoes(instalacao.id);
  return (
    <EstadoConsulta
      consulta={configuracoes}
      nome="a configuração"
      carregando={<Skeleton className="h-96 w-full" />}
    >
      {(lista) => <ConteudoInstalacao instalacao={instalacao} configuracoes={lista} />}
    </EstadoConsulta>
  );
}

/** Renderiza o card como região "Instalação" do veículo principal. */
export function CardInstalacao() {
  const veiculos = useVeiculos();
  const principal = veiculos.data?.find((v) => v.principal) ?? veiculos.data?.[0];
  const instalacao = useInstalacao(principal?.id ?? null);
  const idTitulo = useId();
  return (
    <Card as="section" aria-labelledby={idTitulo} className="flex flex-col gap-4">
      <h2
        id={idTitulo}
        className="font-label text-xs font-semibold tracking-[0.08em] text-fg-muted uppercase"
      >
        Instalação
      </h2>
      <EstadoConsulta
        consulta={instalacao}
        nome="a instalação"
        carregando={<Skeleton className="h-96 w-full" />}
      >
        {(dados) =>
          dados ? (
            <InstalacaoComConfiguracoes instalacao={dados} />
          ) : (
            <p className="text-[13px] text-fg-muted">Nenhuma instalação neste veículo.</p>
          )
        }
      </EstadoConsulta>
    </Card>
  );
}
