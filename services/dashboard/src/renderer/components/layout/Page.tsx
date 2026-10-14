/**
 * Estrutura comum das telas internas: barra superior fixa e conteúdo rolável.
 *
 * Cada tela usa `Page` com seu título e controles; só a área de conteúdo
 * rola, mantendo a barra superior sempre visível.
 */

import type { ReactNode } from 'react';
import { TopBar, type TopBarProps } from './TopBar';

export interface PageProps extends TopBarProps {
  children: ReactNode;
}

/** Renderiza a `TopBar` e, abaixo, o conteúdo com o espaçamento de 32 px. */
export function Page({ children, ...topBar }: PageProps) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <TopBar {...topBar} />
      <div className="min-h-0 flex-1 overflow-auto p-8">{children}</div>
    </div>
  );
}
