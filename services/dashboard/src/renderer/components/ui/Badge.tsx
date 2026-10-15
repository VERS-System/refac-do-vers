/**
 * Badge de status do app desktop do VERS.
 *
 * Pílula com texto em Public Sans e um ponto colorido à esquerda. Os tons
 * seguem o DESIGN.md: Success (Online), Warning (Manutenção), Danger (Falha),
 * Info (Em teste), Neutral (Offline, "Dados de exemplo") e Accent (Carregando).
 */

import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export type BadgeTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'accent';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  /** Mostra o ponto colorido antes do texto (padrão: sim). */
  dot?: boolean;
}

const CLASSES_TOM: Record<BadgeTone, { badge: string; ponto: string }> = {
  success: { badge: 'border-success/30 bg-success-subtle text-success', ponto: 'bg-success' },
  warning: { badge: 'border-warning/30 bg-warning-subtle text-warning', ponto: 'bg-warning' },
  danger: { badge: 'border-danger/30 bg-danger-subtle text-danger', ponto: 'bg-danger' },
  info: { badge: 'border-info/30 bg-info-subtle text-info', ponto: 'bg-info' },
  neutral: { badge: 'border-line bg-surface-raised text-fg-secondary', ponto: 'bg-fg-muted' },
  accent: { badge: 'border-accent-border bg-accent-subtle text-accent', ponto: 'bg-accent' },
};

/**
 * Renderiza o badge com o tom pedido.
 *
 * O ponto é decorativo (`aria-hidden`): o significado está sempre no texto,
 * nunca só na cor. O tom fica exposto em `data-tone` para estilos e testes.
 */
export function Badge({ tone = 'neutral', dot = true, className, children, ...props }: BadgeProps) {
  const classes = CLASSES_TOM[tone];
  return (
    <span
      data-tone={tone}
      className={cn(
        'inline-flex h-6 items-center gap-1.5 rounded-full border px-2.5 font-label text-xs leading-4 font-medium whitespace-nowrap',
        classes.badge,
        className,
      )}
      {...props}
    >
      {dot && (
        <span
          data-slot="dot"
          aria-hidden="true"
          className={cn('size-1.5 shrink-0 rounded-full', classes.ponto)}
        />
      )}
      {children}
    </span>
  );
}
