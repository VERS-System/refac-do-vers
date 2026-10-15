/**
 * Tela Energia do app desktop (referência: design-reference/03-energia).
 *
 * Balanço de energia do VERS, em quatro faixas:
 * 1. KPIs: energia recuperada, potência média em movimento, energia entregue
 *    à bateria e carga entregue ao celular;
 * 2. energia por dia (ou a curva, em Hora e Dia) e as perdas na conversão;
 * 3. estado da bateria, estimativa de economia e energia × vibração;
 * 4. resumo por dia, com exportação em CSV.
 *
 * A tela inteira segue o período da barra superior (decisão de 14/10/2026),
 * exceto a bateria e a tarifa, que são o estado atual do sistema.
 */

import { Bell, Search } from 'lucide-react';
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
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-4 gap-4">
          <CardEnergia variante="energia" />
          <CardPotenciaMedia />
          <CardEntregueBateria />
          <CardEntregueCelular />
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)_300px] gap-4">
          <CardGraficoEnergia detalhado />
          <CardPerdas />
        </div>
        <div className="grid grid-cols-[minmax(0,1.25fr)_minmax(0,0.85fr)_minmax(0,1fr)] gap-4">
          <CardEstadoBateria />
          <CardEconomia />
          <CardEnergiaVibracao />
        </div>
        <TabelaResumoDias />
      </div>
    </Page>
  );
}
