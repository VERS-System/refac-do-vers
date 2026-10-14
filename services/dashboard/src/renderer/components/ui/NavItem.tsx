/**
 * Item de navegação da sidebar do app desktop do VERS.
 *
 * Link com ícone e rótulo; o item da rota atual fica com fundo dourado sutil,
 * borda dourada e texto dourado, como no DESIGN.md.
 */

import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/cn';
import type { IconComponent } from './Button';

export interface NavItemProps {
  to: string;
  label: string;
  /** Ícone Lucide ou a marca da Viber (`ViberMark`). */
  icon: IconComponent;
  className?: string;
}

/**
 * Renderiza o link da rota usando o `NavLink` do React Router.
 *
 * O `NavLink` já marca o item ativo com `aria-current="page"`; a mesma
 * informação decide as classes de destaque.
 */
export function NavItem({ to, label, icon: Icon, className }: NavItemProps) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'flex h-11 items-center gap-3 rounded-control border px-3 text-sm font-medium transition-colors duration-150',
          isActive
            ? 'border-accent-border bg-accent-subtle text-accent'
            : 'border-transparent text-fg-secondary hover:bg-hover hover:text-fg',
          className,
        )
      }
    >
      <Icon size={18} aria-hidden="true" className="shrink-0" />
      <span className="truncate">{label}</span>
    </NavLink>
  );
}
