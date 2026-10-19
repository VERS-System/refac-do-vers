/**
 * Campo de texto do app desktop do VERS (Login, Criar conta, Configurações).
 *
 * Segue o DESIGN.md: rótulo em Public Sans acima, pílula com fundo `inset` e
 * ícone Lucide à esquerda, texto de ajuda abaixo. Com erro, a borda fica
 * vermelha e a mensagem substitui a ajuda.
 */

import { useId, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import type { IconComponent } from './Button';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  /** Ícone decorativo à esquerda. */
  icon?: IconComponent;
  /** Texto de ajuda abaixo do campo. */
  helper?: string;
  /** Mensagem de erro; quando presente, marca o campo como inválido. */
  error?: string;
  /** Elemento à direita dentro da pílula, como o botão de mostrar senha. */
  trailing?: ReactNode;
}

/**
 * Renderiza rótulo, campo e ajuda/erro ligados por `id`.
 *
 * O `id` do campo vem das props ou de `useId`, e o texto exibido abaixo é
 * associado via `aria-describedby`, para que leitores de tela leiam a ajuda
 * ou o erro junto com o campo.
 */
export function Input({
  label,
  icon: Icon,
  helper,
  error,
  trailing,
  id,
  className,
  ...props
}: InputProps) {
  const idGerado = useId();
  const idCampo = id ?? idGerado;
  const idApoio = `${idCampo}-apoio`;
  const apoio = error ?? helper;

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label
        htmlFor={idCampo}
        className="font-label text-xs leading-4 font-medium text-fg-secondary"
      >
        {label}
      </label>
      <div className="relative flex items-center">
        {Icon && (
          <Icon
            size={18}
            aria-hidden="true"
            className="pointer-events-none absolute left-4 text-fg-muted"
          />
        )}
        <input
          id={idCampo}
          aria-invalid={error ? true : undefined}
          aria-describedby={apoio ? idApoio : undefined}
          className={cn(
            'h-11 w-full rounded-full border bg-inset text-sm text-fg placeholder:text-fg-muted',
            'transition-colors duration-150 focus-visible:border-accent-border',
            Icon ? 'pl-11' : 'pl-4',
            trailing ? 'pr-12' : 'pr-4',
            error ? 'border-danger' : 'border-line',
          )}
          {...props}
        />
        {trailing && <div className="absolute right-2 flex items-center">{trailing}</div>}
      </div>
      {apoio && (
        <p
          id={idApoio}
          className={cn('text-xs leading-4', error ? 'text-danger' : 'text-fg-muted')}
        >
          {apoio}
        </p>
      )}
    </div>
  );
}
