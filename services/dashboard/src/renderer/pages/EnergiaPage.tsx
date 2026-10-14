/**
 * Tela Energia do app desktop (referência: design-reference/03-energia).
 *
 * Nesta fase mostra a barra superior completa (veículo, período, busca e
 * notificações) dentro do shell. O conteúdo (energia por estágio, curva da
 * semana e resumo por dia) entra na Fase 4 do roadmap do frontend desktop.
 */

import { Bell, Search } from 'lucide-react';
import { EmConstrucao } from '@/components/layout/EmConstrucao';
import { Page } from '@/components/layout/Page';
import { PeriodSelector } from '@/components/layout/PeriodSelector';
import { IconButton } from '@/components/ui/IconButton';
import { useVeiculoAtivo } from '@/hooks/useDados';

/** Renderiza a tela Energia. */
export function EnergiaPage() {
  const { data: veiculo } = useVeiculoAtivo();
  return (
    <Page
      title="Energia"
      subtitle={veiculo?.descricao}
      controls={<PeriodSelector />}
      actions={
        <>
          <IconButton icon={Search} label="Buscar registros" />
          <IconButton icon={Bell} label="Notificações" />
        </>
      }
    >
      <EmConstrucao referencia="03-energia" />
    </Page>
  );
}
