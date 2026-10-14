/**
 * Tela Testes de campo do app desktop (referência: design-reference/04-testes).
 *
 * Nesta fase mostra só a barra superior da tela dentro do shell. O conteúdo
 * (histórico de testes e comparação) entra na Fase 4.
 */

import { EmConstrucao } from '@/components/layout/EmConstrucao';
import { Page } from '@/components/layout/Page';

/** Renderiza a tela Testes de campo. */
export function TestesPage() {
  return (
    <Page title="Testes de campo" subtitle="Compare configurações e terrenos">
      <EmConstrucao referencia="04-testes" />
    </Page>
  );
}
