/**
 * Lista "Seus veículos" da tela Veículos.
 *
 * Tabela com os carros da conta: nome e placa, ID curto (o completo fica nos
 * detalhes), chassi, relação e o selo do principal. O nome é um botão que
 * mostra os detalhes do carro; o selecionado fica destacado.
 */

import { useId } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { EstadoConsulta } from '@/components/ui/EstadoConsulta';
import { Skeleton } from '@/components/ui/Skeleton';
import { Table, type TableColumn } from '@/components/ui/Table';
import { TEXTO_RELACAO } from '@/components/veiculo/rotulos';
import { nomearVeiculo } from '@/data/calculos';
import type { Veiculo } from '@/data/tipos';
import { useVeiculos } from '@/hooks/useDados';
import { cn } from '@/lib/cn';

/** Nome de exibição do carro ("Honda Civic 2026"), com a placa quando não há outros dados. */
export function nomeDoVeiculo(veiculo: Veiculo): string {
  return nomearVeiculo(veiculo) || veiculo.placa;
}

/** Os 8 primeiros caracteres do ID, para caber na tabela. */
function idCurto(id: string): string {
  return id.slice(0, 8);
}

export interface ListaVeiculosProps {
  selecionadoId: string | null;
  onSelecionar: (veiculo: Veiculo) => void;
}

/** Colunas da tabela, com o botão de seleção na primeira. */
function colunas({ selecionadoId, onSelecionar }: ListaVeiculosProps): TableColumn<Veiculo>[] {
  return [
    {
      key: 'veiculo',
      header: 'Veículo',
      render: (veiculo) => {
        const nome = nomeDoVeiculo(veiculo);
        const ativo = veiculo.id === selecionadoId;
        return (
          <button
            type="button"
            aria-label={`Ver ${nome}`}
            aria-pressed={ativo}
            onClick={() => onSelecionar(veiculo)}
            className={cn(
              'flex flex-col items-start rounded-control px-2 py-1 text-left transition-colors',
              ativo ? 'bg-accent-subtle' : 'hover:bg-hover',
            )}
          >
            <span className={cn('text-sm font-medium', ativo ? 'text-accent' : 'text-fg')}>
              {nome}
            </span>
            <span className="font-mono text-xs text-fg-muted">{veiculo.placa}</span>
          </button>
        );
      },
    },
    {
      key: 'id',
      header: 'ID',
      render: (veiculo) => (
        <span className="font-mono text-xs text-fg-secondary" title={veiculo.id}>
          {idCurto(veiculo.id)}
        </span>
      ),
    },
    {
      key: 'chassi',
      header: 'Chassi',
      render: (veiculo) => (
        <span className="font-mono text-xs text-fg-secondary">{veiculo.chassi ?? '–'}</span>
      ),
    },
    {
      key: 'relacao',
      header: 'Relação',
      render: (veiculo) => TEXTO_RELACAO[veiculo.relacao],
    },
    {
      key: 'principal',
      header: <span className="sr-only">Situação</span>,
      render: (veiculo) => (veiculo.principal ? <Badge tone="accent">Principal</Badge> : null),
    },
  ];
}

/** Renderiza o card com a tabela dos veículos. */
export function ListaVeiculos(props: ListaVeiculosProps) {
  const veiculos = useVeiculos();
  const idTitulo = useId();
  return (
    <Card as="section" aria-labelledby={idTitulo} className="flex flex-col">
      <header className="mb-4 flex items-baseline justify-between gap-3">
        <h2 id={idTitulo} className="text-base leading-[22px] font-semibold text-fg">
          Seus veículos
        </h2>
        {veiculos.data && (
          <span className="font-mono text-xs text-fg-muted">
            {veiculos.data.length === 1 ? '1 veículo' : `${veiculos.data.length} veículos`}
          </span>
        )}
      </header>
      <EstadoConsulta
        consulta={veiculos}
        nome="os veículos"
        carregando={<Skeleton className="h-40 w-full" />}
      >
        {(dados) => (
          <Table
            caption="Seus veículos"
            columns={colunas(props)}
            rows={dados}
            getRowKey={(veiculo) => veiculo.id}
            emptyMessage="Nenhum veículo cadastrado. Use “Novo veículo” para começar."
            densa
          />
        )}
      </EstadoConsulta>
    </Card>
  );
}
