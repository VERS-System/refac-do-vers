/**
 * Barra superior das telas internas do app desktop (64 px, como no DESIGN.md).
 *
 * Mostra o título da tela (h1) com um subtítulo curto em Geist Mono e, à
 * direita, os controles da tela, o badge "Dados de exemplo" e as ações.
 */

import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/Badge';

export interface TopBarProps {
  title: string;
  subtitle?: ReactNode;
  /** Controles exibidos antes do badge, como o seletor de período. */
  controls?: ReactNode;
  /** Ações exibidas depois do badge, como busca, notificações ou botões. */
  actions?: ReactNode;
  /**
   * Mostra o badge "Dados de exemplo" (padrão: sim). Regra de honestidade do
   * DESIGN.md: toda tela com medições avisa que os dados ainda são de exemplo.
   */
  sampleData?: boolean;
}

/**
 * Renderiza a barra com título à esquerda e controles à direita.
 *
 * A ordem controles, badge, ações segue as referências do Stitch (por
 * exemplo: período, "Dados de exemplo", busca e notificações na Visão geral).
 */
export function TopBar({ title, subtitle, controls, actions, sampleData = true }: TopBarProps) {
  return (
    <header className="flex h-16 shrink-0 items-center gap-6 border-b border-line-subtle px-8">
      <div className="flex min-w-0 items-baseline gap-3">
        <h1 className="shrink-0 text-xl leading-7 font-semibold text-fg">{title}</h1>
        {subtitle && <p className="truncate font-mono text-xs text-fg-muted">{subtitle}</p>}
      </div>
      <div className="ml-auto flex shrink-0 items-center gap-3">
        {controls}
        {sampleData && <Badge>Dados de exemplo</Badge>}
        {actions}
      </div>
    </header>
  );
}
