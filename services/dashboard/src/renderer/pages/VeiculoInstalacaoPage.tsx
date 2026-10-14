/**
 * Tela Veículo e instalação do app desktop (referência: design-reference/05-veiculo-instalacao).
 *
 * Nesta fase mostra só a barra superior da tela dentro do shell. O conteúdo
 * (veículo, posição dos piezos e dispositivo) entra na Fase 4.
 */

import { EmConstrucao } from '@/components/layout/EmConstrucao';
import { Page } from '@/components/layout/Page';

/** Renderiza a tela Veículo e instalação. */
export function VeiculoInstalacaoPage() {
  return (
    <Page title="Veículo e instalação" subtitle="Cadastro, configuração dos piezos e dispositivo">
      <EmConstrucao referencia="05-veiculo-instalacao" />
    </Page>
  );
}
