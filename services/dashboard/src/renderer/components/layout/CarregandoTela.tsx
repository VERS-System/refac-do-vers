/**
 * Carregamento de uma tela sob demanda (Fase 5): o esqueleto da barra
 * superior e do conteúdo enquanto o código da tela chega. Anunciado ao
 * leitor de tela como "Carregando a tela".
 */

import { Skeleton } from '@/components/ui/Skeleton';

/** Esqueleto da tela, do tamanho da área de conteúdo. */
export function CarregandoTela() {
  return (
    <div role="status" className="flex flex-1 flex-col">
      <span className="sr-only">Carregando a tela</span>
      <div
        aria-hidden="true"
        className="flex h-16 items-center border-b border-line-subtle px-4 sm:px-6 lg:px-8"
      >
        <Skeleton className="h-6 w-40" />
      </div>
      <div
        aria-hidden="true"
        className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 sm:p-6 lg:p-8 xl:grid-cols-4"
      >
        <Skeleton className="h-36" />
        <Skeleton className="h-36" />
        <Skeleton className="h-36" />
        <Skeleton className="h-36" />
        <Skeleton className="h-72 sm:col-span-2 xl:col-span-4" />
      </div>
    </div>
  );
}
