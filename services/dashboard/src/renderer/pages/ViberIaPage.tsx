/**
 * Tela Viber do app desktop (referência: design-reference/06-viber-ia).
 *
 * Nesta fase mostra só a barra superior da tela dentro do shell. O conteúdo
 * (conversa, contexto e conversas recentes) entra na Fase 4.
 */

import { EmConstrucao } from '@/components/layout/EmConstrucao';
import { Page } from '@/components/layout/Page';

/** Renderiza a tela Viber. */
export function ViberIaPage() {
  return (
    <Page title="Viber" subtitle="Assistente que interpreta seus dados. Os cálculos vêm do backend, não da IA.">
      <EmConstrucao referencia="06-viber-ia" />
    </Page>
  );
}
