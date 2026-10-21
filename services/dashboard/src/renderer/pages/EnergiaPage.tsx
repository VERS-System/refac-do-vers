/**
 * Tela Energia do app desktop (referência: design-reference/03-energia).
 *
 * Balanço de energia do VERS, em quatro faixas:
 * 1. KPIs: energia recuperada, potência média em movimento e quanto do
 *    recuperado foi para a bateria e para o celular (em %);
 * 2. energia por dia (ou a curva, em Hora e Dia) e as perdas na conversão;
 * 3. estado da bateria, estimativa de economia e energia × vibração;
 * 4. resumo por dia, com exportação em CSV.
 *
 * A tela inteira segue o período da barra superior (decisão de 14/10/2026),
 * exceto a bateria e a tarifa, que são o estado atual do sistema.
 */

import { CardEconomia } from '@/components/energia/CardEconomia';
import { CardEnergia } from '@/components/energia/CardEnergia';
import { CardEnergiaVibracao } from '@/components/energia/CardEnergiaVibracao';
import { CardEstadoBateria } from '@/components/energia/CardEstadoBateria';
import { CardGraficoEnergia } from '@/components/energia/CardGraficoEnergia';
import { CardPerdas } from '@/components/energia/CardPerdas';
import {
  CardEntregueBateria,
  CardEntregueCelular,
  CardPotenciaMedia,
} from '@/components/energia/KpisEnergia';
import { TabelaResumoDias } from '@/components/energia/TabelaResumoDias';
import { Page } from '@/components/layout/Page';
import { PeriodSelector } from '@/components/layout/PeriodSelector';
import { useVeiculoAtivo } from '@/hooks/useDados';
import { useRepositorio } from '@/data/repositorio';
import { PainelEnergiaReal, DemonstracaoMedicoes } from '@/components/energia/PainelEnergiaReal';

/** Renderiza a tela Energia. */
export function EnergiaPage() {
  const { data: veiculo } = useVeiculoAtivo();
  const { obterEnergiaInstalacao } = useRepositorio();
  const demonstracao = (
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <CardEnergia variante="energia" />
          <CardPotenciaMedia />
          <CardEntregueBateria />
          <CardEntregueCelular />
        </div>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
          <CardGraficoEnergia detalhado />
          <CardPerdas />
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:[&>*:last-child]:col-span-2 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,0.85fr)_minmax(0,1fr)] xl:[&>*:last-child]:col-span-1">
          <CardEstadoBateria />
          <CardEconomia />
          <CardEnergiaVibracao />
        </div>
        <TabelaResumoDias />
      </div>
  );
  return <Page title="Energia" subtitle={veiculo === null ? 'Nenhum veículo principal definido' : veiculo?.descricao} controls={<PeriodSelector />}>
    {obterEnergiaInstalacao ? <><PainelEnergiaReal /><DemonstracaoMedicoes>{demonstracao}</DemonstracaoMedicoes></> : demonstracao}
  </Page>;
}
