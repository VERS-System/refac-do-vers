/**
 * Botão base do app desktop do VERS.
 *
 * Segue o DESIGN.md: pílula de 44 a 48 px de altura, com as variantes Primary
 * (dourado com texto escuro), Secondary, Ghost e Danger. O dourado é reservado
 * à ação principal de cada tela; no hover, uma faixa de luz atravessa o
 * primário (GlareHover, Fase 5).
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
  // `reflexo`: o GlareHover do DESIGN.md (faixa de luz que atravessa no hover).
  primary:
    'reflexo bg-accent text-fg-on-accent hover:bg-accent-hover hover:shadow-glow active:bg-accent-pressed',
  secondary: 'border border-line bg-surface-raised text-fg hover:bg-hover',
  ghost: 'text-fg-secondary hover:bg-hover hover:text-fg',
  danger:
    'border border-danger/40 bg-danger-subtle text-danger hover:bg-danger hover:text-fg-on-accent',
};

const CLASSES_TAMANHO: Record<ButtonSize, string> = {
  md: 'h-11 px-5 text-sm',
  lg: 'h-12 px-6 text-[15px]',
};

/**
 * Classes da pílula para a variante e o tamanho pedidos. Exposta para links
 * que fazem papel de botão (um `<Link>` não pode ser um `<button>`), para que
 * fiquem iguais ao botão, inclusive no reflexo do primário.
 */
export function classesDoBotao({
  variant = 'primary',
  size = 'md',
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
} = {}): string {
  return cn(
    'inline-flex shrink-0 items-center justify-center gap-2 rounded-full font-medium whitespace-nowrap',
    // Afunda levemente ao pressionar (Fase 5).
    'transition-[background-color,color,box-shadow,transform] duration-150 active:scale-[0.97]',
    'disabled:pointer-events-none disabled:opacity-50',
    CLASSES_VARIANTE[variant],
    CLASSES_TAMANHO[size],
  );
}

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
      className={cn(classesDoBotao({ variant, size }), className)}
      {...props}
    >
      {Icon && <Icon size={18} aria-hidden="true" className="shrink-0" />}
      {children}
    </button>
  );
}
