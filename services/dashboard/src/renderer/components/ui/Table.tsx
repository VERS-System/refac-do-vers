/**
 * Tabela de dados do app desktop do VERS (telemetria, resumo por dia, testes).
 *
 * Recebe a definição das colunas e as linhas; colunas numéricas ficam em
 * Geist Mono, alinhadas à direita e com algarismos tabulares, para que os
 * valores fiquem alinhados pela casa decimal.
 */

import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface TableColumn<T> {
  /** Identificador único da coluna (também usado como chave do React). */
  key: string;
  header: ReactNode;
  /** Conteúdo da célula para uma linha. */
  render: (row: T) => ReactNode;
  align?: 'left' | 'center' | 'right';
  /** Coluna de números: Geist Mono, tabular e alinhada à direita por padrão. */
  numeric?: boolean;
  className?: string;
}

export interface TableProps<T> {
  /** Nome acessível da tabela. */
  caption: string;
  /** Mostra a legenda na tela (padrão: não, o título costuma estar no card). */
  showCaption?: boolean;
  columns: TableColumn<T>[];
  rows: readonly T[];
  getRowKey: (row: T) => string;
  /** Mensagem exibida quando não há linhas. */
  emptyMessage?: string;
  className?: string;
}

const CLASSES_ALINHAMENTO = { left: 'text-left', center: 'text-center', right: 'text-right' } as const;

/**
 * Classes de alinhamento de uma coluna, compartilhadas por cabeçalho e células.
 *
 * Colunas numéricas alinham à direita por padrão; nas células elas também
 * usam Geist Mono tabular, enquanto o cabeçalho mantém a fonte de rótulo.
 */
function classesDaColuna<T>(coluna: TableColumn<T>, celula: boolean): string {
  const alinhamento = coluna.align ?? (coluna.numeric ? 'right' : 'left');
  return cn(CLASSES_ALINHAMENTO[alinhamento], celula && coluna.numeric && 'tabular font-mono', coluna.className);
}

/**
 * Renderiza a tabela com cabeçalho, linhas e estado vazio.
 *
 * A legenda (`caption`) nomeia a tabela para leitores de tela mesmo quando
 * fica oculta. Sem linhas, uma única célula com `colSpan` mostra a mensagem
 * de vazio no lugar dos dados.
 */
export function Table<T>({
  caption,
  showCaption = false,
  columns,
  rows,
  getRowKey,
  emptyMessage = 'Nenhum registro encontrado',
  className,
}: TableProps<T>) {
  return (
    <div className={cn('overflow-x-auto', className)}>
      <table className="w-full border-collapse text-sm">
        <caption className={cn(showCaption ? 'mb-3 text-left text-base font-semibold' : 'sr-only')}>
          {caption}
        </caption>
        <thead>
          <tr className="border-b border-line-subtle">
            {columns.map((coluna) => (
              <th
                key={coluna.key}
                scope="col"
                className={cn(
                  'h-10 px-4 font-label text-xs font-medium whitespace-nowrap text-fg-muted',
                  classesDaColuna(coluna, false),
                )}
              >
                {coluna.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="h-24 px-4 text-center text-fg-muted">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((linha) => (
              <tr
                key={getRowKey(linha)}
                className="h-12 border-b border-line-subtle transition-colors last:border-0 hover:bg-hover/40"
              >
                {columns.map((coluna) => (
                  <td key={coluna.key} className={cn('px-4 text-fg', classesDaColuna(coluna, true))}>
                    {coluna.render(linha)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
