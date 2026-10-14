/**
 * Card base do app desktop do VERS.
 *
 * Superfície `surface` com borda sutil de 1 px e raio de 20 px, como pede o
 * DESIGN.md (o render do Stitch omitiu a borda; a implementação segue o
 * DESIGN.md). Serve de base para KpiCard, ChartCard e os demais blocos das telas.
 */

import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export interface CardProps extends HTMLAttributes<HTMLElement> {
  /** Elemento HTML usado como raiz (padrão: div). */
  as?: 'div' | 'section' | 'article' | 'aside';
  /** Aplica o espaçamento interno padrão de 24 px (padrão: sim). */
  padded?: boolean;
}

/**
 * Renderiza o card com as classes base somadas às classes recebidas.
 *
 * O `as` permite usar elementos semânticos (por exemplo `section` com
 * `aria-labelledby`) sem duplicar o estilo.
 */
export function Card({ as: Elemento = 'div', padded = true, className, ...props }: CardProps) {
  return (
    <Elemento
      className={cn(
        'rounded-card border border-line-subtle bg-surface shadow-elevation-1',
        padded && 'p-6',
        className,
      )}
      {...props}
    />
  );
}
