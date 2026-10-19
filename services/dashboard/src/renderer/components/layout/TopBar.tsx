/**
 * Barra superior das telas internas do app desktop (64 px, como no DESIGN.md).
 *
 * Mostra o título da tela (h1) com um subtítulo curto em Geist Mono e, à
 * direita, os controles da tela, o badge "Dados de exemplo", as ações da tela
 * e, por último, as ações globais do shell (busca e notificações).
 */

import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/Badge';
import { useAcoesGlobais, useInicioBarra } from './AcoesGlobais';

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
 *
 * Responsiva: a partir de 1024 px, uma linha de 64 px como no Stitch.
 * Abaixo disso, a primeira linha tem o botão de menu (do shell), o título e
 * as ações globais (busca e notificações); os controles (como o seletor de
 * período), o badge e as ações da tela descem para uma segunda linha, que
 * quebra se precisar. O subtítulo some no celular e o badge vira "Exemplo".
 */
export function TopBar({ title, subtitle, controls, actions, sampleData = true }: TopBarProps) {
  const globais = useAcoesGlobais();
  const inicio = useInicioBarra();
  return (
    <header className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-3 border-b border-line-subtle px-4 py-3 sm:px-6 lg:h-16 lg:flex-nowrap lg:px-8 lg:py-0">
      {inicio}
      <div className="flex min-w-0 flex-1 items-baseline gap-3">
        <h1 className="truncate text-lg leading-7 font-semibold text-fg sm:text-xl">{title}</h1>
        {subtitle && (
          <p className="hidden truncate font-mono text-xs text-fg-muted md:block">{subtitle}</p>
        )}
      </div>
      <div className="order-last flex w-full flex-wrap items-center gap-2 empty:hidden sm:gap-3 lg:order-none lg:w-auto lg:shrink-0 lg:flex-nowrap">
        {controls}
        {sampleData && (
          <Badge>
            <span className="sm:hidden">Exemplo</span>
            <span className="hidden sm:inline">Dados de exemplo</span>
          </Badge>
        )}
        {actions}
      </div>
      {globais && <div className="flex shrink-0 items-center gap-2 sm:gap-3">{globais}</div>}
    </header>
  );
}
