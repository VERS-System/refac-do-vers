/**
 * KPIs da Visão geral que não seguem o período da barra superior.
 *
 * Potência instantânea (ponto 1 da cadeia, ao vivo), eficiência ponta a
 * ponta de hoje e bateria do sistema. Mostram o estado atual do sistema, por
 * isso continuam iguais em Hora, Dia, Semana ou Mês.
 */

import { Zap } from 'lucide-react';
import { BarraSegmentos } from '@/components/charts/BarraSegmentos';
import { MedidorAnel } from '@/components/charts/MedidorAnel';
import { ESTADOS_BATERIA } from '@/components/energia/estadoBateria';
import { Badge } from '@/components/ui/Badge';
import { KpiConsulta } from '@/components/ui/KpiConsulta';
import { useBateria, useCadeiaAoVivo, useResumoEnergia } from '@/hooks/useDados';
import { formatarNumero, formatarPercentual, formatarPotencia } from '@/lib/format';

/** Topo da escala do medidor de potência, igual ao eixo do gráfico do dia. */
const POTENCIA_MAXIMA_MW = 400;

/** Potência medida agora no nó piezoelétrico (ponto 1 da cadeia). */
export function CardPotencia() {
  const cadeia = useCadeiaAoVivo();
  return (
    <KpiConsulta
      label="Potência instantânea"
      consulta={cadeia}
      nome="a potência ao vivo"
      badge={<Badge tone="accent">Ao vivo</Badge>}
    >
      {(dados) => {
        const potenciaMw = dados.pontos[0]?.potenciaMw ?? 0;
        return {
          value: formatarPotencia(potenciaMw).valor,
          unit: formatarPotencia(potenciaMw).unidade,
          children: (
            <BarraSegmentos
              valor={potenciaMw}
              maximo={POTENCIA_MAXIMA_MW}
              rotulo="Nível de potência"
            />
          ),
        };
      }}
    </KpiConsulta>
  );
}

/**
 * Eficiência ponta a ponta de hoje (P4 / P1, do piezo à USB).
 *
 * Usa o resumo fixo do dia, como a referência ("Piezo → USB · hoje"), e não
 * a leitura instantânea, que oscila a cada amostra.
 */
export function CardEficiencia() {
  const hoje = useResumoEnergia('dia');
  return (
    <KpiConsulta label="Eficiência ponta a ponta" consulta={hoje} nome="a eficiência de hoje">
      {(dados) => ({
        value: formatarPercentual(dados.eficienciaPercentual).valor,
        unit: '%',
        badge: <MedidorAnel percentual={dados.eficienciaPercentual} simbolo="η" />,
        children: <p className="font-mono text-xs text-fg-muted">Piezo → USB · hoje</p>,
      })}
    </KpiConsulta>
  );
}

/** Carga da bateria do sistema, com estado e barra de nível. */
export function CardBateria() {
  const bateria = useBateria();
  return (
    <KpiConsulta label="Bateria do sistema" consulta={bateria} nome="a bateria">
      {(dados) => {
        const estado = ESTADOS_BATERIA[dados.estado];
        return {
          value: formatarNumero(dados.cargaPercentual),
          unit: '%',
          badge: (
            <Badge tone={estado.tom} dot={false}>
              {dados.estado === 'carregando' && <Zap aria-hidden="true" className="size-3" />}
              {estado.texto}
            </Badge>
          ),
          children: (
            <div aria-hidden="true" className="h-2 overflow-hidden rounded-full bg-surface-raised">
              <div
                className="h-full rounded-full bg-accent"
                style={{ width: `${dados.cargaPercentual}%` }}
              />
            </div>
          ),
        };
      }}
    </KpiConsulta>
  );
}
