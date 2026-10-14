/**
 * Botão base do app desktop do VERS.
 *
 * Segue o DESIGN.md: pílula de 44 a 48 px de altura, com as variantes Primary
 * (dourado com texto escuro), Secondary, Ghost e Danger. O dourado é reservado
 * à ação principal de cada tela.
 */

import type { ButtonHTMLAttributes, ComponentType, SVGProps } from 'react';
import { cn } from '@/lib/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'md' | 'lg';

/** Ícone compatível com Lucide (ou qualquer SVG que aceite `size`). */
export type IconComponent = ComponentType<SVGProps<SVGSVGElement> & { size?: number | string }>;

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Ícone decorativo exibido antes do texto. */
  icon?: IconComponent;
}

const CLASSES_VARIANTE: Record<ButtonVariant, string> = {
  primary:
    'bg-accent text-fg-on-accent hover:bg-accent-hover hover:shadow-glow active:bg-accent-pressed',
  secondary: 'border border-line bg-surface-raised text-fg hover:bg-hover',
  ghost: 'text-fg-secondary hover:bg-hover hover:text-fg',
  danger: 'border border-danger/40 bg-danger-subtle text-danger hover:bg-danger hover:text-fg-on-accent',
};

const CLASSES_TAMANHO: Record<ButtonSize, string> = {
  md: 'h-11 px-5 text-sm',
  lg: 'h-12 px-6 text-[15px]',
};

/**
 * Renderiza um botão em pílula com a variante e o tamanho pedidos.
 *
 * O `type` padrão é "button" para que botões dentro de formulários não os
 * enviem por acidente; use `type="submit"` explicitamente quando for o caso.
 * A variante fica exposta em `data-variant` para estilos e testes.
 */
export function Button({
  variant = 'primary',
  size = 'md',
  icon: Icon,
  type = 'button',
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      data-variant={variant}
      className={cn(
        'inline-flex shrink-0 items-center justify-center gap-2 rounded-full font-medium whitespace-nowrap',
        'transition-[background-color,color,box-shadow] duration-150',
        'disabled:pointer-events-none disabled:opacity-50',
        CLASSES_VARIANTE[variant],
        CLASSES_TAMANHO[size],
        className,
      )}
      {...props}
    >
      {Icon && <Icon size={18} aria-hidden="true" className="shrink-0" />}
      {children}
    </button>
  );
}
