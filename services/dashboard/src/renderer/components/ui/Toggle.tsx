/**
 * Interruptor liga/desliga do app desktop do VERS (usado em Configurações).
 *
 * É um botão com `role="switch"`, nomeado pelo rótulo visível e descrito pelo
 * texto auxiliar. Ligado, o trilho fica dourado.
 */

import { useId } from 'react';
import { cn } from '@/lib/cn';

export interface ToggleProps {
  label: string;
  /** Texto auxiliar abaixo do rótulo. */
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * Renderiza o rótulo à esquerda e o interruptor à direita.
 *
 * O estado é controlado por quem usa o componente: o clique (ou a barra de
 * espaço, comportamento nativo do botão) só pede o estado oposto via `onChange`.
 */
export function Toggle({
  label,
  description,
  checked,
  onChange,
  disabled,
  className,
}: ToggleProps) {
  const idRotulo = useId();
  const idDescricao = useId();
  return (
    <div className={cn('flex items-center justify-between gap-4', className)}>
      <div className="flex flex-col gap-0.5">
        <span id={idRotulo} className="text-sm font-medium text-fg">
          {label}
        </span>
        {description && (
          <span id={idDescricao} className="text-[13px] leading-[18px] text-fg-muted">
            {description}
          </span>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={idRotulo}
        aria-describedby={description ? idDescricao : undefined}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors duration-150',
          'disabled:cursor-not-allowed disabled:opacity-50',
          checked ? 'border-accent bg-accent' : 'border-line-strong bg-surface-raised',
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            'size-[18px] rounded-full transition-transform duration-150',
            checked ? 'translate-x-[22px] bg-fg-on-accent' : 'translate-x-[2px] bg-fg-secondary',
          )}
        />
      </button>
    </div>
  );
}
