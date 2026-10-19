/**
 * Área de texto do app desktop do VERS (observações dos testes, motivos,
 * mensagens).
 *
 * Mesmo visual do `Input`, com cantos de controle (12 px) em vez de pílula,
 * porque o texto ocupa várias linhas.
 */

import { useId, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  /** Texto de ajuda abaixo do campo. */
  helper?: string;
  /** Mensagem de erro; quando presente, marca o campo como inválido. */
  error?: string;
}

/** Renderiza rótulo, área de texto e ajuda/erro ligados por `id`. */
export function Textarea({
  label,
  helper,
  error,
  id,
  className,
  rows = 3,
  ...props
}: TextareaProps) {
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
      <textarea
        id={idCampo}
        rows={rows}
        aria-invalid={error ? true : undefined}
        aria-describedby={apoio ? idApoio : undefined}
        className={cn(
          'w-full resize-y rounded-control border bg-inset px-4 py-3 text-sm text-fg placeholder:text-fg-muted',
          'transition-colors duration-150 focus-visible:border-accent-border',
          error ? 'border-danger' : 'border-line',
        )}
        {...props}
      />
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
