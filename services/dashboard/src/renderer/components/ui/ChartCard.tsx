/**
 * Card de gráfico do app desktop do VERS.
 *
 * Moldura comum dos gráficos das telas: título, subtítulo, legenda das séries
 * e ações no cabeçalho, com o gráfico (Recharts) em `children`.
 */

import { useId, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Card } from './Card';

export interface ChartLegendItem {
  label: string;
  /** Cor da série (de preferência um token, como `var(--color-chart-1)`). */
  color: string;
}

export interface ChartCardProps {
  title: string;
  subtitle?: ReactNode;
  legend?: ChartLegendItem[];
  /** Controles no canto do cabeçalho, como um seletor de eixo. */
  actions?: ReactNode;
  className?: string;
  children: ReactNode;
}

/**
 * Renderiza o card como uma região nomeada pelo título.
 *
 * A legenda é uma lista nomeada "Legenda" com um marcador colorido por série;
 * o nome da série fica sempre em texto, para não depender só da cor.
 */
export function ChartCard({
  title,
  subtitle,
  legend,
  actions,
  className,
  children,
}: ChartCardProps) {
  const idTitulo = useId();
  return (
    <Card as="section" aria-labelledby={idTitulo} className={cn('flex flex-col', className)}>
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 id={idTitulo} className="text-base leading-[22px] font-semibold text-fg">
            {title}
          </h2>
          {subtitle && <p className="text-[13px] leading-[18px] text-fg-muted">{subtitle}</p>}
        </div>
        {(legend?.length || actions) && (
          <div className="flex flex-wrap items-center gap-4 sm:shrink-0">
            {legend && legend.length > 0 && (
              <ul aria-label="Legenda" className="flex flex-wrap items-center gap-x-4 gap-y-1">
                {legend.map((serie) => (
                  <li
                    key={serie.label}
                    className="flex items-center gap-2 font-label text-xs text-fg-secondary"
                  >
                    <span
                      aria-hidden="true"
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: serie.color }}
                    />
                    {serie.label}
                  </li>
                ))}
              </ul>
            )}
            {actions}
          </div>
        )}
      </header>
      <div className="mt-5 min-h-0 flex-1">{children}</div>
    </Card>
  );
}
