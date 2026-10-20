/**
 * Bloco de carregamento (skeleton) do app desktop do VERS.
 *
 * Retângulo pulsante que ocupa o lugar de um valor ou gráfico enquanto os
 * dados chegam, para que o layout não "pule" quando eles aparecem. É um
 * `span` em bloco para poder ficar também dentro de parágrafos e títulos.
 */

import { cn } from '@/lib/cn';

export interface SkeletonProps {
  /** Tamanho e forma do bloco (ex.: `h-8 w-24`, `rounded-full`). */
  className?: string;
}

/**
 * Renderiza o bloco.
 *
 * É só visual (`aria-hidden`): quem anuncia o carregamento é o contêiner,
 * com `aria-busy` (ver `EstadoConsulta`).
 */
export function Skeleton({ className }: SkeletonProps) {
  return (
    <span
      aria-hidden="true"
      data-slot="skeleton"
      className={cn('block animate-pulse rounded-control bg-surface-raised', className)}
    />
  );
}
