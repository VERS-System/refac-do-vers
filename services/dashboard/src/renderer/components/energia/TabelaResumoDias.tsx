/**
 * Card "Resumo por dia" da tela Energia.
 *
 * Tabela com as métricas de cada dia do período (do mais recente ao mais
 * antigo) e o botão "Exportar CSV", que baixa os mesmos dados num arquivo
 * que o Excel em português abre direto. Na Hora não há resumo por dia (é
 * só um trecho da curva de hoje), e a tabela diz isso.
 */

import { useId } from 'react';
import { Download } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EstadoConsulta } from '@/components/ui/EstadoConsulta';
import { Skeleton } from '@/components/ui/Skeleton';
import { Table, type TableColumn } from '@/components/ui/Table';
import { csvResumoPorDia, nomeArquivoResumoPorDia, qualidadeDoDia } from '@/data/exportacao';
import type { ResumoDia } from '@/data/tipos';
import { useDiasDoPeriodo } from '@/hooks/useDados';
import { baixarArquivo } from '@/lib/download';
import {
  formatarDataCurta,
  formatarDiaSemanaCurto,
  formatarEnergia,
  formatarNumero,
  formatarPercentual,
  formatarPotencia,
} from '@/lib/format';
import { rotuloUnidade } from '@/lib/unidades';
import { usePeriodoStore } from '@/stores/periodo';

const TITULO = 'Resumo por dia';
const SEM_RESUMO_NA_HORA = 'O resumo por dia não se aplica à última hora.';

/** Colunas da tabela, na ordem da referência. */
/** Colunas da tabela, com as unidades escolhidas nas Configurações. */
function colunas(): TableColumn<ResumoDia>[] {
  return [
    {
      key: 'data',
      header: 'Data',
      render: (dia) => (
        <span className="font-mono">
          <span className="font-medium text-fg">{formatarDataCurta(dia.data)}</span>{' '}
          <span className="text-xs text-fg-muted">{formatarDiaSemanaCurto(dia.data)}</span>
        </span>
      ),
    },
    {
      key: 'movimento',
      header: 'Em movimento (h)',
      numeric: true,
      render: (dia) => formatarNumero(dia.horasMovimento, 1),
    },
    {
      key: 'energia',
      header: `Energia recuperada (${rotuloUnidade('energia')})`,
      numeric: true,
      render: (dia) => (
        <span className="font-medium text-accent">
          {formatarEnergia(dia.energia.p1, { unidade: 'mWh' }).valor}
        </span>
      ),
    },
    {
      key: 'potencia',
      header: `Potência média (${rotuloUnidade('potencia')})`,
      numeric: true,
      render: (dia) => formatarPotencia(dia.potenciaMediaMw).valor,
    },
    {
      key: 'pico',
      header: `Pico (${rotuloUnidade('potencia')})`,
      numeric: true,
      render: (dia) => (
        <span className="text-fg-muted">{formatarPotencia(dia.pico.potenciaMw).valor}</span>
      ),
    },
    {
      key: 'eficiencia',
      header: 'Eficiência (%)',
      numeric: true,
      render: (dia) => (
        <span className="text-success">{`${formatarPercentual(dia.eficienciaPercentual).valor}%`}</span>
      ),
    },
    {
      key: 'qualidade',
      header: 'Qualidade dos dados',
      align: 'center',
      render: (dia) => (
        <Badge tone={dia.lacunasPercentual > 0 ? 'warning' : 'success'}>
          {qualidadeDoDia(dia)}
        </Badge>
      ),
    },
  ];
}

/** Ordena do dia mais recente ao mais antigo, como na referência. */
function maisRecentesPrimeiro(dias: readonly ResumoDia[]): ResumoDia[] {
  return [...dias].sort((a, b) => b.data.localeCompare(a.data));
}

/**
 * Baixa o CSV dos dias exibidos, com o intervalo no nome do arquivo.
 *
 * Os dias chegam em ordem cronológica do repositório: o primeiro é o início
 * e o último, o fim do período.
 */
function exportar(dias: readonly ResumoDia[]) {
  if (dias.length === 0) return;
  const nome = nomeArquivoResumoPorDia(dias[0].data, dias[dias.length - 1].data);
  baixarArquivo(nome, csvResumoPorDia(dias), 'text/csv;charset=utf-8');
}

/** Renderiza o card com a tabela e a exportação do período global. */
export function TabelaResumoDias() {
  const periodo = usePeriodoStore((estado) => estado.periodo);
  const naHora = periodo === 'hora';
  const dias = useDiasDoPeriodo(naHora ? null : periodo);
  const idTitulo = useId();

  return (
    <Card as="section" aria-labelledby={idTitulo}>
      <header className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 id={idTitulo} className="text-base leading-[22px] font-semibold text-fg">
            {TITULO}
          </h2>
          <p className="font-mono text-xs text-fg-muted">
            Métricas consolidadas de captação e eficiência por ciclo diário
          </p>
        </div>
        <Button
          variant="secondary"
          icon={Download}
          disabled={naHora || !dias.data?.length}
          onClick={() => dias.data && exportar(dias.data)}
        >
          Exportar CSV
        </Button>
      </header>
      <div className="mt-5">
        {naHora ? (
          <Table
            caption={TITULO}
            columns={colunas()}
            rows={[]}
            getRowKey={(dia) => dia.data}
            emptyMessage={SEM_RESUMO_NA_HORA}
          />
        ) : (
          <EstadoConsulta
            consulta={dias}
            nome="o resumo por dia"
            carregando={<Skeleton className="h-64 w-full" />}
          >
            {(lista) => (
              <Table
                caption={TITULO}
                columns={colunas()}
                rows={maisRecentesPrimeiro(lista)}
                getRowKey={(dia) => dia.data}
                emptyMessage="Sem medições neste período."
              />
            )}
          </EstadoConsulta>
        )}
      </div>
    </Card>
  );
}
