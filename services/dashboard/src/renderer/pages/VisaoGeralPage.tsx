/**
 * Tela Visão geral do app desktop (referência: design-reference/01-visao-geral).
 *
 * Painel inicial do VERS, em três faixas:
 * 1. quatro KPIs: energia recuperada (segue o período), potência
 *    instantânea, eficiência ponta a ponta de hoje e bateria;
 * 2. o gráfico de energia do período e o card de vibração;
 * 3. a cadeia de conversão ao vivo, do piezo ao celular.
 *
 * O seletor de período muda só a energia (card e gráfico); os demais cards
 * mostram o estado atual do sistema (decisão de 14/10/2026).
 */

import { Bell, Search } from 'lucide-react';
import { Page } from '@/components/layout/Page';
import { PeriodSelector } from '@/components/layout/PeriodSelector';
import { IconButton } from '@/components/ui/IconButton';
import { CadeiaConversao } from '@/components/visao-geral/CadeiaConversao';
import { CardEnergia } from '@/components/visao-geral/CardEnergia';
import { CardGraficoEnergia } from '@/components/visao-geral/CardGraficoEnergia';
import { CardVibracao } from '@/components/visao-geral/CardVibracao';
import { CardBateria, CardEficiencia, CardPotencia } from '@/components/visao-geral/KpisAoVivo';
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
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-4 gap-4">
          <CardEnergia />
          <CardPotencia />
          <CardEficiencia />
          <CardBateria />
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)_300px] gap-4">
          <CardGraficoEnergia />
          <CardVibracao />
        </div>
        <CadeiaConversao />
      </div>
    </Page>
  );
}
