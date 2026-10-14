/**
 * Tela Configurações do app desktop (referência: design-reference/07-configuracoes).
 *
 * Nesta fase mostra só a barra superior da tela dentro do shell. O conteúdo
 * (perfil, unidades, alertas e sessões) entra na Fase 4. Não mostra o badge
 * "Dados de exemplo" porque a tela não exibe medições.
 */

import { EmConstrucao } from '@/components/layout/EmConstrucao';
import { Page } from '@/components/layout/Page';

/** Renderiza a tela Configurações. */
export function ConfiguracoesPage() {
  return (
    <Page title="Configurações" subtitle="Perfil, unidades, alertas e sessões" sampleData={false}>
      <EmConstrucao referencia="07-configuracoes" />
    </Page>
  );
}
