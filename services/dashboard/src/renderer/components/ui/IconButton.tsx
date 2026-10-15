/**
 * Botão circular só com ícone, usado na barra superior (busca, notificações).
 *
 * Como não tem texto visível, o rótulo é obrigatório: vira o nome acessível e
 * a dica exibida ao passar o mouse.
 */

import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';
import type { IconComponent } from './Button';

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  icon: IconComponent;
  /** Nome acessível e dica do botão. */
  label: string;
  /** Mostra um ponto dourado de novidade (ex.: notificações não lidas). */
  indicator?: boolean;
}

/**
 * Renderiza o botão de 36 px com o ícone centralizado.
 *
 * O ponto de novidade é decorativo; quem usa o componente deve refletir a
 * novidade no `label` (por exemplo "Notificações, há novas").
 */
export function IconButton({
  icon: Icon,
  label,
  indicator,
  type = 'button',
  className,
  ...props
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        'relative grid size-9 shrink-0 place-items-center rounded-full border border-line text-fg-secondary',
        'transition-colors duration-150 hover:bg-hover hover:text-fg disabled:pointer-events-none disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <Icon size={17} aria-hidden="true" />
      {indicator && (
        <span
          data-slot="indicator"
          aria-hidden="true"
          className="absolute top-1.5 right-1.5 size-2 rounded-full bg-accent ring-2 ring-canvas"
        />
      )}
    </button>
  );
}
