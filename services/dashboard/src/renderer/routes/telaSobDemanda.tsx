/**
 * Tela carregada sob demanda, para dividir o app por tela (Fase 5).
 *
 * Envolve o `React.lazy`: o código da tela só é baixado quando ela é aberta
 * pela primeira vez, e o `Suspense` acima mostra o carregamento enquanto
 * isso. Depois de carregada (ou pré-carregada com `precarregar`), a tela
 * aparece direto na renderização, sem passar de novo pelo `Suspense`. Os
 * testes usam o pré-carregamento para que a tela apareça na primeira
 * renderização, como antes da divisão. Plano em
 * `.AIs/docs/plans/desktop-frontend-fase-5.md`.
 */

import { lazy, type ComponentType } from 'react';

export type TelaSobDemanda = ComponentType & { precarregar: () => Promise<void> };

/** Cria a tela a partir de quem carrega o módulo dela (com a tela como export padrão). */
export function telaSobDemanda(
  carregar: () => Promise<{ default: ComponentType }>,
): TelaSobDemanda {
  let carregada: ComponentType | null = null;

  /** Carrega o módulo uma vez e guarda o componente para as próximas renderizações. */
  const buscar = async () => {
    const modulo = await carregar();
    carregada = modulo.default;
    return modulo;
  };
  const Preguicosa = lazy(buscar);

  /** Já carregada, renderiza a tela; senão, deixa o `lazy` suspender até ela chegar. */
  function Tela() {
    const Componente = carregada ?? Preguicosa;
    return <Componente />;
  }

  return Object.assign(Tela, {
    precarregar: async () => {
      await buscar();
    },
  });
}
