/**
 * Card "Estimativa de economia" da tela Energia.
 *
 * A economia em reais depende de uma tarifa de energia, cadastrada nas
 * Configurações. Pela regra de honestidade dos dados, sem tarifa o card não
 * mostra nenhum valor: fica bloqueado e leva às Configurações. Com tarifa,
 * mostra a economia do período escolhido e o ritmo anual, projetado a partir
 * da última semana completa (a premissa fica escrita no card).
 */

import { useId } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useResumoEnergia } from '@/hooks/useDados';
import { formatarDataCurta, formatarMoeda } from '@/lib/format';
import { ROTAS } from '@/routes/navegacao';
import { usePreferencias } from '@/stores/preferencias';

/** mWh em um kWh. */
const MWH_POR_KWH = 1_000_000;
/** Dias do ano, para projetar o ritmo semanal. */
const DIAS_POR_ANO = 365;

/** Valor em reais de uma energia em mWh, pela tarifa em R$/kWh. */
function emReais(mWh: number, tarifaPorKwh: number): number {
  return (mWh / MWH_POR_KWH) * tarifaPorKwh;
}

/** Conteúdo com a tarifa: economia do período, ritmo anual e a premissa. */
function Estimativa({ tarifaPorKwh }: { tarifaPorKwh: number }) {
  const periodo = useResumoEnergia();
  const semana = useResumoEnergia('semana');
  const anual =
    semana.data && semana.data.diasComDados > 0
      ? emReais(
          (semana.data.energiaRecuperadaMwh / semana.data.diasComDados) * DIAS_POR_ANO,
          tarifaPorKwh,
        )
      : null;

  return (
    <div className="flex flex-1 flex-col justify-center gap-4 py-4">
      <div className="flex flex-col gap-1">
        <span className="text-xs text-fg-muted">Economia no período</span>
        <span className="font-mono text-2xl font-medium text-success">
          {periodo.data
            ? formatarMoeda(emReais(periodo.data.energiaRecuperadaMwh, tarifaPorKwh))
            : '–'}
        </span>
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-xs text-fg-muted">
          {semana.data
            ? `Ritmo anual (semana de ${formatarDataCurta(semana.data.inicio)} a ${formatarDataCurta(semana.data.fim)})`
            : 'Ritmo anual'}
        </span>
        <span className="font-mono text-lg text-fg">{formatarMoeda(anual, 2)}</span>
      </div>
      <p className="font-mono text-[11px] text-fg-muted">{`Tarifa: ${formatarMoeda(tarifaPorKwh, 2)}/kWh`}</p>
    </div>
  );
}

/** Renderiza o card bloqueado (sem tarifa) ou com a estimativa. */
export function CardEconomia() {
  const navegar = useNavigate();
  const idTitulo = useId();
  const tarifaPorKwh = usePreferencias((estado) => estado.tarifaPorKwh);
  return (
    <Card as="section" aria-labelledby={idTitulo} className="flex flex-col">
      <h2 id={idTitulo} className="text-base leading-[22px] font-semibold text-fg">
        Estimativa de economia
      </h2>
      <p className="mt-1 font-mono text-xs text-fg-muted">Métrica financeira de retorno</p>
      {tarifaPorKwh === null ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 py-6 text-center">
          <span className="grid size-11 place-items-center rounded-full bg-inset">
            <Lock aria-hidden="true" className="size-5 text-fg-muted" />
          </span>
          <p className="max-w-56 text-[13px] leading-5 text-fg-muted">
            Cadastre uma tarifa de energia para estimar a economia. Nenhum valor é calculado sem
            premissas registradas.
          </p>
        </div>
      ) : (
        <Estimativa tarifaPorKwh={tarifaPorKwh} />
      )}
      <Button
        variant="secondary"
        icon={SlidersHorizontal}
        onClick={() => navegar(ROTAS.configuracoes)}
      >
        {tarifaPorKwh === null ? 'Configurar tarifa' : 'Alterar tarifa'}
      </Button>
    </Card>
  );
}
