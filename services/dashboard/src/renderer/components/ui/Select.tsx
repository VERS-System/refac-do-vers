/**
 * Campo de seleção do app desktop do VERS (formulários de testes, veículo e
 * configurações).
 *
 * Mesmo visual do `Input` (rótulo em Public Sans acima, pílula `inset`,
 * ajuda ou erro abaixo), sobre um `select` nativo: o sistema cuida do teclado
 * e dos leitores de tela.
 */

import { useId, type SelectHTMLAttributes } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/cn';

/** Uma opção: o valor enviado e o texto exibido. */
export interface OpcaoSelect {
  valor: string;
  rotulo: string;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  opcoes: readonly OpcaoSelect[];
  /** Texto de ajuda abaixo do campo. */
  helper?: string;
  /** Mensagem de erro; quando presente, marca o campo como inválido. */
  error?: string;
}

/**
 * Renderiza rótulo, seleção e ajuda/erro ligados por `id`, como o `Input`:
 * a ajuda ou o erro descrevem o campo via `aria-describedby`.
 */
export function Select({ label, opcoes, helper, error, id, className, ...props }: SelectProps) {
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
        <select
          id={idCampo}
          aria-invalid={error ? true : undefined}
          aria-describedby={apoio ? idApoio : undefined}
          className={cn(
            'h-11 w-full cursor-pointer appearance-none rounded-full border bg-inset pr-10 pl-4 text-sm text-fg',
            'transition-colors duration-150 focus-visible:border-accent-border',
            error ? 'border-danger' : 'border-line',
          )}
          {...props}
        >
          {opcoes.map((opcao) => (
            <option key={opcao.valor} value={opcao.valor}>
              {opcao.rotulo}
            </option>
          ))}
        </select>
        <ChevronDown
          aria-hidden="true"
          className="pointer-events-none absolute right-4 size-4 text-fg-muted"
        />
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
