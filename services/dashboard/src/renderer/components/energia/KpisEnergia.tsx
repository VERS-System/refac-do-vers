/**
 * KPIs da tela Energia além da energia recuperada: potência média em
 * movimento, energia entregue à bateria e carga entregue ao celular.
 *
 * Todos seguem o período da barra superior (decisão de 14/10/2026). Na Hora
 * só existe a curva do nó piezoelétrico (P1), então os KPIs que dependem dos
 * pontos 3 e 4 dizem que não há detalhe, em vez de inventar um valor.
 */

import { BatteryCharging, Gauge, Smartphone } from 'lucide-react';
import type { ReactNode } from 'react';
import { KpiConsulta, type ConteudoKpi } from '@/components/ui/KpiConsulta';
import { eficiencia } from '@/data/calculos';
import { CAPACIDADE_CELULAR_MWH } from '@/data/referencias';
import type { PicoPotencia, ResumoEnergia } from '@/data/tipos';
import { useResumoEnergia } from '@/hooks/useDados';
import {
  formatarDataCurta,
  formatarDiaSemanaCurto,
  formatarEnergia,
  formatarPercentual,
  formatarMedida,
  formatarPotencia,
} from '@/lib/format';

/** Aviso dos KPIs por ponto no período Hora. */
export const SEM_DETALHE_POR_PONTO = 'Sem detalhe por ponto na última hora.';

/** Ícone no canto do KPI, como na referência. */
function Icone({ icone: IconeLucide }: { icone: typeof Gauge }) {
  return <IconeLucide aria-hidden="true" className="size-5 shrink-0 text-fg-muted" />;
}

/** Rodapé discreto do KPI, com o marcador redondo da referência. */
function Rodape({ children, destaque = false }: { children: ReactNode; destaque?: boolean }) {
  return (
    <p className="flex items-center gap-2 font-mono text-xs text-fg-muted">
      <span
        aria-hidden="true"
        className={destaque ? 'size-1.5 rounded-full bg-info' : 'size-1.5 rounded-full bg-fg-muted'}
      />
      <span className={destaque ? 'text-info' : undefined}>{children}</span>
    </p>
  );
}

/**
 * Quando foi o pico: "hoje 17:42" em Hora e Dia; nos demais, o dia da
 * semana e o horário ("qui 17:42") ou, sem horário registrado, a data.
 */
export function quandoFoiOPico(pico: PicoPotencia, resumo: ResumoEnergia): string {
  const doDiaDeHoje = resumo.periodo === 'hora' || resumo.periodo === 'dia';
  const dia = doDiaDeHoje ? 'hoje' : formatarDiaSemanaCurto(pico.data).toLowerCase();
  return `${dia} ${pico.horario ?? formatarDataCurta(pico.data)}`;
}

/** Valor e unidade de uma energia, para o KPI. */
function energiaDoKpi(mWh: number): Pick<ConteudoKpi, 'value' | 'unit'> {
  const energia = formatarEnergia(mWh);
  return { value: energia.valor, unit: energia.unidade };
}

/** Potência média em movimento do período, com o pico e quando ele ocorreu. */
export function CardPotenciaMedia() {
  const resumo = useResumoEnergia();
  return (
    <KpiConsulta
      label="Potência média em movimento"
      consulta={resumo}
      nome="a potência média"
      badge={<Icone icone={Gauge} />}
    >
      {(dados) => ({
        value: formatarPotencia(dados.potenciaMediaMw).valor,
        unit: formatarPotencia(dados.potenciaMediaMw).unidade,
        children: dados.pico && (
          <Rodape>{`Pico ${formatarMedida(formatarPotencia(dados.pico.potenciaMw))} · ${quandoFoiOPico(dados.pico, dados)}`}</Rodape>
        ),
      })}
    </KpiConsulta>
  );
}

/** Energia que chegou à bateria (P3) e a fração do recuperado que ela representa. */
export function CardEntregueBateria() {
  const resumo = useResumoEnergia();
  return (
    <KpiConsulta
      label="Energia entregue à bateria"
      consulta={resumo}
      nome="a energia entregue à bateria"
      badge={<Icone icone={BatteryCharging} />}
    >
      {(dados) => {
        if (!dados.porPonto)
          return { children: <p className="text-[13px] text-fg-muted">{SEM_DETALHE_POR_PONTO}</p> };
        const fracao = eficiencia(dados.porPonto.p3, dados.porPonto.p1);
        return {
          ...energiaDoKpi(dados.porPonto.p3),
          children: (
            <Rodape destaque>{`${formatarPercentual(fracao).valor}% do recuperado`}</Rodape>
          ),
        };
      }}
    </KpiConsulta>
  );
}

/**
 * Energia entregue ao celular (P4), comparada a uma recarga completa de um
 * celular de referência (15,4 Wh), em porcentagem inteira aproximada.
 */
export function CardEntregueCelular() {
  const resumo = useResumoEnergia();
  return (
    <KpiConsulta
      label="Carga entregue ao celular"
      consulta={resumo}
      nome="a carga entregue ao celular"
      badge={<Icone icone={Smartphone} />}
    >
      {(dados) => {
        if (!dados.porPonto)
          return { children: <p className="text-[13px] text-fg-muted">{SEM_DETALHE_POR_PONTO}</p> };
        const recarga = (dados.porPonto.p4 / CAPACIDADE_CELULAR_MWH) * 100;
        return {
          ...energiaDoKpi(dados.porPonto.p4),
          children: <Rodape>{`≈ ${formatarPercentual(recarga, 0).valor}% de uma recarga`}</Rodape>,
        };
      }}
    </KpiConsulta>
  );
}
