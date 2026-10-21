/**
 * Card "Histórico de testes" da tela Testes.
 *
 * Abas por status do contrato (com a contagem de cada uma), a tabela com a
 * seleção para comparar, o início, a duração, a energia, a potência e a
 * situação de cada teste, e a paginação. A energia e a potência vêm do
 * resumo do teste encerrado ou, no teste em andamento, da última amostra da
 * telemetria. Busca por texto e terreno não existem no contrato e ficaram
 * como pedido ao backend.
 *
 * As abas seguem o padrão de abas do WAI-ARIA (Fase 5): só a escolhida entra
 * na ordem do Tab, setas, Home e End trocam de aba e a tabela fica num
 * painel nomeado pela aba escolhida.
 */

import { useId, type KeyboardEvent } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EstadoConsulta } from '@/components/ui/EstadoConsulta';
import { Paginacao } from '@/components/ui/Paginacao';
import { Skeleton } from '@/components/ui/Skeleton';
import { Table, type TableColumn } from '@/components/ui/Table';
import type { StatusTeste, TesteCampo } from '@/data/tipos';
import { useRepositorio } from '@/data/repositorio';
import { useAmostrasTelemetria, useResumoTeste, useTestes } from '@/hooks/useDados';
import { cn } from '@/lib/cn';
import {
  formatarDataCurta,
  formatarHorarioCaptura,
  formatarEnergia,
  formatarPotencia,
} from '@/lib/format';
import { rotuloUnidade } from '@/lib/unidades';
import { ABAS, badgeDoTeste, comparavel, segundosEntre, TEXTO_TERRENO } from './rotulos';

/** Itens por página do histórico. */
export const TAMANHO_PAGINA_HISTORICO = 10;
/** Máximo de testes numa comparação (contrato do backend). */
export const MAXIMO_SELECIONADOS = 5;

export interface TabelaHistoricoProps {
  onIniciar: (teste: TesteCampo) => void;
  onFinalizar: (teste: TesteCampo) => void;
  onCancelar: (teste: TesteCampo) => void;
  aba: StatusTeste | 'todos';
  onTrocarAba: (aba: StatusTeste | 'todos') => void;
  pagina: number;
  onTrocarPagina: (pagina: number) => void;
  /** Testes marcados para comparar. */
  selecionados: ReadonlyMap<string, TesteCampo>;
  onAlternarSelecao: (teste: TesteCampo) => void;
  /** Relógio do repositório, para a duração do teste em andamento. */
  agora: string;
  /** Teste aberto pela busca geral, destacado na tabela. */
  destacadoId?: string | null;
}

/** Aba com a contagem do status (consulta só o total, com página de 1 item). */
function Aba({
  id,
  idPainel,
  valor,
  rotulo,
  ativa,
  onEscolher,
}: {
  id: string;
  idPainel: string;
  valor: StatusTeste | 'todos';
  rotulo: string;
  ativa: boolean;
  onEscolher: () => void;
}) {
  const contagem = useTestes({ status: valor === 'todos' ? undefined : valor, tamanhoPagina: 1 });
  const total = contagem.data?.total;
  return (
    <button
      type="button"
      role="tab"
      id={id}
      aria-selected={ativa}
      aria-controls={idPainel}
      tabIndex={ativa ? 0 : -1}
      onClick={onEscolher}
      className={cn(
        'flex h-7 items-center rounded-full px-2.5 text-xs whitespace-nowrap transition-colors',
        ativa
          ? 'bg-accent font-medium text-fg-on-accent'
          : 'text-fg-secondary hover:bg-hover hover:text-fg',
      )}
    >
      {total === undefined ? rotulo : `${rotulo} (${total})`}
    </button>
  );
}

/** Última amostra do teste em andamento (energia acumulada e potência ao vivo). */
function useUltimaAmostra(teste: TesteCampo) {
  const emAndamento = teste.estado === 'em-andamento';
  const consulta = useAmostrasTelemetria(
    emAndamento ? { testeId: teste.id, tamanhoPagina: 1 } : null,
  );
  return consulta.data?.itens[0];
}

/** Célula de energia: resumo do teste encerrado ou acumulada ao vivo. */
function CelulaEnergia({ teste }: { teste: TesteCampo }) {
  const { ensaiosReais } = useRepositorio();
  const resumo = useResumoTeste(comparavel(teste) ? teste.id : null);
  const ultima = useUltimaAmostra(teste);
  const energia = comparavel(teste)
    ? resumo.data?.energiaRecuperadaMwh
    : ensaiosReais ? null : ultima?.energiaAcumuladaMwh;
  if (resumo.isError) return <>Indisponível</>;
  if (resumo.data?.qualidade === 'invalida') return <>Inválida</>;
  return <><span>{formatarEnergia(energia, { unidade: 'mWh' }).valor}</span>{resumo.data?.qualidade === 'parcial' && <span className="text-fg-muted"> (parcial)</span>}</>;
}

/** Célula de potência: média do teste encerrado ou instantânea ao vivo (em destaque). */
function CelulaPotencia({ teste }: { teste: TesteCampo }) {
  const resumo = useResumoTeste(comparavel(teste) ? teste.id : null);
  const ultima = useUltimaAmostra(teste);
  if (resumo.isError) return <>Indisponível</>;
  if (resumo.data?.qualidade === 'invalida') return <>Inválida</>;
  if (teste.estado === 'em-andamento') {
    return (
      <span className="font-medium text-accent">{formatarPotencia(ultima?.potenciaMw).valor}</span>
    );
  }
  return <><span>{formatarPotencia(comparavel(teste) ? resumo.data?.potenciaMediaMw : null).valor}</span>{resumo.data?.qualidade === 'parcial' && <span className="text-fg-muted"> (parcial)</span>}</>;
}

/** Cabeçalho em duas linhas (nome e unidade), para a tabela caber em 1280 px. */
function CabecalhoComUnidade({ nome, unidade }: { nome: string; unidade: string }) {
  return (
    <span className="inline-flex flex-col leading-4">
      <span>{nome}</span>
      <span className="text-fg-muted/80">{`(${unidade})`}</span>
    </span>
  );
}

/** Colunas da tabela, com a seleção para comparar na primeira. */
function colunas(props: TabelaHistoricoProps): TableColumn<TesteCampo>[] {
  const cheio = props.selecionados.size >= MAXIMO_SELECIONADOS;
  return [
    {
      key: 'acoes',
      header: 'Ações',
      render: (teste) => <div className="flex gap-1">
        {teste.estado === 'planejado' && <Button variant="ghost" aria-label={`Iniciar ${teste.codigo}`} onClick={() => props.onIniciar(teste)}>Iniciar</Button>}
        {teste.estado === 'em-andamento' && <Button variant="ghost" aria-label={`Finalizar ${teste.codigo}`} onClick={() => props.onFinalizar(teste)}>Finalizar</Button>}
        {['planejado', 'em-andamento'].includes(teste.estado) && <Button variant="ghost" aria-label={`Cancelar ${teste.codigo}`} onClick={() => props.onCancelar(teste)}>Cancelar</Button>}
      </div>,
    },
    {
      key: 'selecao',
      header: <span className="sr-only">Comparar</span>,
      render: (teste) =>
        comparavel(teste) ? (
          <input
            type="checkbox"
            aria-label={`Selecionar ${teste.codigo} para comparar`}
            checked={props.selecionados.has(teste.id)}
            disabled={cheio && !props.selecionados.has(teste.id)}
            onChange={() => props.onAlternarSelecao(teste)}
            className="size-4 cursor-pointer accent-[var(--color-accent)] disabled:cursor-not-allowed"
          />
        ) : null,
    },
    {
      key: 'teste',
      header: 'Teste / Nome',
      render: (teste) => (
        <div className="flex flex-col gap-1 py-2">
          <span className="flex items-center gap-2">
            <span className="font-mono text-[13px] font-medium text-accent">{teste.codigo}</span>
            <Badge tone="neutral" dot={false}>
              {TEXTO_TERRENO[teste.terreno]}
            </Badge>
          </span>
          <span
            className="block max-w-36 truncate text-[13px] text-fg-secondary"
            title={`${teste.nome} · ${teste.local}`}
          >
            {teste.nome}
          </span>
        </div>
      ),
    },
    {
      key: 'inicio',
      header: 'Início',
      render: (teste) => {
        const data = teste.inicio ?? teste.criadoEm;
        return (
          <span className="flex flex-col font-mono text-xs">
            <span className="text-fg">{formatarDataCurta(data.slice(0, 10))}</span>
            <span className="text-fg-muted">
              {teste.inicio ? formatarHorarioCaptura(teste.inicio).slice(0, 5) : 'criado'}
            </span>
          </span>
        );
      },
    },
    {
      key: 'duracao',
      header: 'Duração',
      numeric: true,
      render: (teste) => {
        if (!teste.inicio) return '–';
        const fim = teste.fim ?? (teste.estado === 'em-andamento' ? props.agora : null);
        return fim ? (
          <span className="whitespace-nowrap">{`${Math.round(segundosEntre(teste.inicio, fim) / 60)} min`}</span>
        ) : (
          '–'
        );
      },
    },
    {
      key: 'energia',
      header: <CabecalhoComUnidade nome="Energia" unidade={rotuloUnidade('energia')} />,
      numeric: true,
      render: (teste) => <CelulaEnergia teste={teste} />,
    },
    {
      key: 'potencia',
      header: <CabecalhoComUnidade nome="Potência" unidade={rotuloUnidade('potencia')} />,
      numeric: true,
      render: (teste) => <CelulaPotencia teste={teste} />,
    },
    {
      key: 'situacao',
      header: 'Resultado',
      align: 'right',
      render: (teste) => {
        const badge = badgeDoTeste(teste);
        return (
          <Badge tone={badge.tom} title={teste.observacoes ?? undefined}>
            {badge.texto}
          </Badge>
        );
      },
    },
  ];
}

/** Renderiza o card como região nomeada "Histórico de testes". */
export function TabelaHistorico(props: TabelaHistoricoProps) {
  const idTitulo = useId();
  const status = props.aba === 'todos' ? undefined : props.aba;
  const lista = useTestes({
    status,
    pagina: props.pagina,
    tamanhoPagina: TAMANHO_PAGINA_HISTORICO,
  });
  const todos = useTestes({ tamanhoPagina: 1 });
  const idAbas = useId();
  const idPainel = `${idAbas}-painel`;
  const idDaAba = (valor: StatusTeste | 'todos') => `${idAbas}-aba-${valor}`;

  /** Setas andam em roda; Home e End vão às pontas. A aba nova é escolhida e focada. */
  function navegarAbas(evento: KeyboardEvent<HTMLDivElement>) {
    const atual = ABAS.findIndex((aba) => aba.valor === props.aba);
    const destinos: Record<string, number> = {
      ArrowRight: (atual + 1) % ABAS.length,
      ArrowLeft: (atual - 1 + ABAS.length) % ABAS.length,
      Home: 0,
      End: ABAS.length - 1,
    };
    const destino = destinos[evento.key];
    if (destino === undefined) return;
    evento.preventDefault();
    props.onTrocarAba(ABAS[destino].valor);
    document.getElementById(idDaAba(ABAS[destino].valor))?.focus();
  }

  return (
    <Card as="section" aria-labelledby={idTitulo} className="flex flex-col">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h2 id={idTitulo} className="text-base leading-[22px] font-semibold text-fg">
            Histórico de testes
          </h2>
          {todos.data && <Badge tone="neutral" dot={false}>{`${todos.data.total} total`}</Badge>}
        </div>
        <div
          role="tablist"
          aria-label="Status dos testes"
          onKeyDown={navegarAbas}
          className="flex flex-wrap items-center gap-0.5 rounded-full border border-line p-1"
        >
          {ABAS.map((aba) => (
            <Aba
              key={aba.valor}
              id={idDaAba(aba.valor)}
              idPainel={idPainel}
              valor={aba.valor}
              rotulo={aba.rotulo}
              ativa={props.aba === aba.valor}
              onEscolher={() => props.onTrocarAba(aba.valor)}
            />
          ))}
        </div>
      </header>
      <div
        role="tabpanel"
        id={idPainel}
        aria-labelledby={idDaAba(props.aba)}
        className="mt-4 flex-1"
      >
        <EstadoConsulta
          consulta={lista}
          nome="os testes"
          carregando={<Skeleton className="h-96 w-full" />}
        >
          {(pagina) => (
            <>
              <Table
                caption="Histórico de testes"
                columns={colunas(props)}
                rows={pagina.itens}
                getRowKey={(teste) => teste.id}
                emptyMessage="Nenhum teste neste status."
                densa
                isRowCurrent={(teste) => teste.id === props.destacadoId}
              />
              <Paginacao
                pagina={pagina.pagina}
                tamanho={pagina.tamanhoPagina}
                total={pagina.total}
                unidade="testes"
                onTrocar={props.onTrocarPagina}
              />
            </>
          )}
        </EstadoConsulta>
      </div>
    </Card>
  );
}
