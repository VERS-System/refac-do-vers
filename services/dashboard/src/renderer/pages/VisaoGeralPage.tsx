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

import { Page } from '@/components/layout/Page';
import { PeriodSelector } from '@/components/layout/PeriodSelector';
import { CadeiaConversao } from '@/components/visao-geral/CadeiaConversao';
import { CardEnergia } from '@/components/energia/CardEnergia';
import { CardGraficoEnergia } from '@/components/energia/CardGraficoEnergia';
import { CardVibracao } from '@/components/visao-geral/CardVibracao';
import { CardBateria, CardEficiencia, CardPotencia } from '@/components/visao-geral/KpisAoVivo';
import { useVeiculoAtivo } from '@/hooks/useDados';
import { useRepositorio } from '@/data/repositorio';
import { PainelEnergiaReal, DemonstracaoMedicoes } from '@/components/energia/PainelEnergiaReal';

/** Renderiza a tela Visão geral. */
export function VisaoGeralPage() {
  const { data: veiculo } = useVeiculoAtivo();
  const { obterEnergiaInstalacao } = useRepositorio();
  const demonstracao = (
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <CardEnergia />
          <CardPotencia />
          <CardEficiencia />
          <CardBateria />
        </div>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
          <CardGraficoEnergia />
          <CardVibracao />
        </div>
        <CadeiaConversao />
      </div>
  );
  return <Page title="Visão geral" subtitle={veiculo === null ? 'Nenhum veículo principal definido' : veiculo?.descricao} controls={<PeriodSelector />}>
    {obterEnergiaInstalacao ? <><PainelEnergiaReal /><DemonstracaoMedicoes>{demonstracao}</DemonstracaoMedicoes></> : demonstracao}
  </Page>;
}
