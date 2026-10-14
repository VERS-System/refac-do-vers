/**
 * Tela Telemetria do app desktop (referência: design-reference/02-telemetria).
 *
 * Nesta fase mostra só a barra superior da tela dentro do shell. O conteúdo
 * (feed ao vivo, tabela de amostras e exportação CSV) entra na Fase 4.
 */

import { EmConstrucao } from '@/components/layout/EmConstrucao';
import { Page } from '@/components/layout/Page';

/** Renderiza a tela Telemetria. */
export function TelemetriaPage() {
  return (
    <Page title="Telemetria" subtitle="Amostras validadas do ESP32 · intervalo 10 s">
      <EmConstrucao referencia="02-telemetria" />
    </Page>
  );
}
