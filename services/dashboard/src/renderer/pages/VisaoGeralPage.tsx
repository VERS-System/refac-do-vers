/**
 * Tela Visão geral do app desktop (referência: design-reference/01-visao-geral).
 *
 * Nesta fase mostra a barra superior completa (veículo, período, busca e
 * notificações) dentro do shell. O conteúdo (KPIs, gráfico do dia, vibração
 * e cadeia de conversão) entra na Fase 4 do roadmap do frontend desktop.
 */

import { Bell, Search } from 'lucide-react';
import { EmConstrucao } from '@/components/layout/EmConstrucao';
import { Page } from '@/components/layout/Page';
import { PeriodSelector } from '@/components/layout/PeriodSelector';
import { IconButton } from '@/components/ui/IconButton';
import { useVeiculoAtivo } from '@/hooks/useDados';

/** Renderiza a tela Visão geral. */
export function VisaoGeralPage() {
  const { data: veiculo } = useVeiculoAtivo();
  return (
    <Page
      title="Visão geral"
      subtitle={veiculo?.descricao}
      controls={<PeriodSelector />}
      actions={
        <>
          <IconButton icon={Search} label="Buscar registros" />
          <IconButton icon={Bell} label="Notificações" />
        </>
      }
    >
      <EmConstrucao referencia="01-visao-geral" />
    </Page>
  );
}
