/**
 * Testes da tabela de dados (telemetria, resumo por dia, histórico de testes).
 */

import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { Table, type TableColumn } from './Table';

interface Linha {
  dia: string;
  energia: number;
}

const COLUNAS: TableColumn<Linha>[] = [
  { key: 'dia', header: 'Dia', render: (linha) => linha.dia },
  {
    key: 'energia',
    header: 'Energia (mWh)',
    align: 'right',
    numeric: true,
    render: (linha) => linha.energia,
  },
];

const LINHAS: Linha[] = [
  { dia: 'Seg 28/09', energia: 258 },
  { dia: 'Ter 29/09', energia: 178 },
];

describe('Table', () => {
  /** Tabela nomeada pela legenda, com cabeçalhos de coluna. */
  it('renderiza legenda e cabeçalhos', () => {
    render(
      <Table caption="Resumo por dia" columns={COLUNAS} rows={LINHAS} getRowKey={(l) => l.dia} />,
    );

    const tabela = screen.getByRole('table', { name: 'Resumo por dia' });
    expect(within(tabela).getByRole('columnheader', { name: 'Dia' })).toBeInTheDocument();
    expect(within(tabela).getByRole('columnheader', { name: 'Energia (mWh)' })).toBeInTheDocument();
  });

  /** Cada linha de dados vira uma linha da tabela com suas células. */
  it('renderiza as linhas de dados', () => {
    render(
      <Table caption="Resumo por dia" columns={COLUNAS} rows={LINHAS} getRowKey={(l) => l.dia} />,
    );

    const linhas = screen.getAllByRole('row');
    expect(linhas).toHaveLength(3);
    expect(within(linhas[1]).getByRole('cell', { name: 'Seg 28/09' })).toBeInTheDocument();
    expect(within(linhas[2]).getByRole('cell', { name: '178' })).toBeInTheDocument();
  });

  /** Colunas numéricas ficam alinhadas à direita com algarismos tabulares. */
  it('alinha colunas numéricas à direita', () => {
    render(
      <Table caption="Resumo por dia" columns={COLUNAS} rows={LINHAS} getRowKey={(l) => l.dia} />,
    );

    const celula = screen.getByRole('cell', { name: '258' });
    expect(celula).toHaveClass('text-right');
    expect(celula).toHaveClass('tabular');
  });

  /** Sem linhas, mostra a mensagem de vazio ocupando todas as colunas. */
  it('mostra a mensagem de vazio', () => {
    render(
      <Table
        caption="Resumo por dia"
        columns={COLUNAS}
        rows={[]}
        getRowKey={(l) => l.dia}
        emptyMessage="Nenhuma medição no período"
      />,
    );

    const celula = screen.getByRole('cell', { name: 'Nenhuma medição no período' });
    expect(celula).toHaveAttribute('colspan', '2');
  });

  /** Densa: menos espaço lateral nas células, para tabelas com muitas colunas. */
  it('aceita a variante densa', () => {
    const { rerender } = render(
      <Table caption="Resumo por dia" columns={COLUNAS} rows={LINHAS} getRowKey={(l) => l.dia} />,
    );
    expect(screen.getByRole('cell', { name: '258' })).toHaveClass('px-4');

    rerender(
      <Table
        caption="Resumo por dia"
        columns={COLUNAS}
        rows={LINHAS}
        getRowKey={(l) => l.dia}
        densa
      />,
    );
    expect(screen.getByRole('cell', { name: '258' })).toHaveClass('px-2.5');
    expect(screen.getByRole('cell', { name: '258' })).not.toHaveClass('px-4');
    expect(screen.getAllByRole('columnheader')[0]).toHaveClass('px-2.5');
  });
});
