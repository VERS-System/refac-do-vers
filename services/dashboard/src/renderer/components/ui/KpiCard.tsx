/**
 * Card de KPI das telas do VERS (por exemplo "Potência instantânea 212 mW").
 *
 * Mostra um rótulo, um badge opcional, o valor em Geist Mono com algarismos
 * tabulares e a unidade menor e esmaecida ao lado, como pede o DESIGN.md.
 * Um conteúdo extra (minigráfico, barra de nível) pode vir em `children`.
 * O spotlight e o CountUp do DESIGN.md entram na Fase 5 (movimento).
 */

import { useId, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Card } from './Card';

export interface KpiCardProps {
  label: string;
  /** Valor já formatado (use os formatadores de `@/lib/format`). */
  value: ReactNode;
  unit?: string;
  /** Badge ou indicador exibido à direita do rótulo. */
  badge?: ReactNode;
  className?: string;
  /** Conteúdo abaixo do valor, como um minigráfico ou rodapé. */
  children?: ReactNode;
}

/**
 * Renderiza o KPI como uma região nomeada pelo rótulo.
 *
 * Usar `section` com `aria-labelledby` permite que leitores de tela e testes
 * encontrem cada KPI pelo nome ("Potência instantânea").
 */
export function KpiCard({ label, value, unit, badge, className, children }: KpiCardProps) {
  const idRotulo = useId();
  return (
    <Card as="section" aria-labelledby={idRotulo} className={cn('flex flex-col', className)}>
      <div className="flex items-start justify-between gap-3">
        <h3 id={idRotulo} className="text-[13px] leading-[18px] font-medium text-fg-secondary">
          {label}
        </h3>
        {badge}
      </div>
      <p className="mt-4 flex items-baseline gap-1.5 font-mono">
        <span className="tabular text-[32px] leading-[38px] font-medium tracking-[-0.5px] text-fg">{value}</span>
        {unit && <span className="text-sm text-fg-muted">{unit}</span>}
      </p>
      {children && <div className="mt-auto pt-4">{children}</div>}
    </Card>
  );
}
