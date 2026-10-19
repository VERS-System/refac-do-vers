/**
 * KPIs da tela Energia além da energia recuperada: potência média em
 * movimento e quanto do recuperado foi para a bateria e para o celular (%).
 *
 * Todos seguem o período da barra superior (decisão de 14/10/2026). Na Hora
 * só existe a curva do nó piezoelétrico (P1), então os KPIs que dependem dos
 * pontos 3 e 4 dizem que não há detalhe, em vez de inventar um valor.
 */

import { BatteryCharging, Gauge, Smartphone } from 'lucide-react';
import type { ReactNode } from 'react';
import { valorContado } from '@/components/ui/KpiCard';
import { KpiConsulta, type ConteudoKpi } from '@/components/ui/KpiConsulta';
import { eficiencia } from '@/data/calculos';
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

/**
 * Valor contado e unidade de uma energia, para o KPI. A escala (mWh ou Wh,
 * J ou kJ) é a do valor final: a contagem não troca de unidade no meio.
 */
export function energiaDoKpi(mWh: number): Pick<ConteudoKpi, 'contagem' | 'unit'> {
  const energia = formatarEnergia(mWh);
  const escala = energia.unidade === 'Wh' || energia.unidade === 'kJ' ? 'Wh' : 'mWh';
  return {
    contagem: { numero: mWh, formatar: (n) => formatarEnergia(n, { unidade: escala }).valor },
    unit: energia.unidade,
  };
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
        ...valorContado(dados.potenciaMediaMw, (n) => formatarPotencia(n).valor),
        unit: formatarPotencia(dados.potenciaMediaMw).unidade,
        children: dados.pico && (
          <Rodape>{`Pico ${formatarMedida(formatarPotencia(dados.pico.potenciaMw))} · ${quandoFoiOPico(dados.pico, dados)}`}</Rodape>
        ),
      })}
    </KpiConsulta>
  );
}

/**
 * Conteúdo dos KPIs por dispositivo: quanto da energia recuperada (P1)
 * chegou ao ponto, em porcentagem, como número principal. O mWh fica no
 * rodapé, como detalhe para quem precisa da medida física. Decisão de
 * 19/10/2026: o usuário final entende melhor o "para onde foi" em %, e a
 * comparação com uma recarga de celular fazia o sistema parecer inútil.
 */
export function fracaoDoRecuperado(energiaMwh: number, recuperadaMwh: number): ConteudoKpi {
  return {
    ...valorContado(eficiencia(energiaMwh, recuperadaMwh), (n) => formatarPercentual(n).valor),
    unit: '%',
    children: (
      <Rodape destaque>{`do recuperado · ${formatarMedida(formatarEnergia(energiaMwh))}`}</Rodape>
    ),
  };
}

/** Quanto da energia recuperada chegou à bateria (P3 ÷ P1). */
export function CardEntregueBateria() {
  const resumo = useResumoEnergia();
  return (
    <KpiConsulta
      label="Energia para a bateria"
      consulta={resumo}
      nome="a energia para a bateria"
      badge={<Icone icone={BatteryCharging} />}
    >
      {(dados) =>
        dados.porPonto
          ? fracaoDoRecuperado(dados.porPonto.p3, dados.porPonto.p1)
          : { children: <p className="text-[13px] text-fg-muted">{SEM_DETALHE_POR_PONTO}</p> }
      }
    </KpiConsulta>
  );
}

/** Quanto da energia recuperada chegou ao celular (P4 ÷ P1). */
export function CardEntregueCelular() {
  const resumo = useResumoEnergia();
  return (
    <KpiConsulta
      label="Energia para o celular"
      consulta={resumo}
      nome="a energia para o celular"
      badge={<Icone icone={Smartphone} />}
    >
      {(dados) =>
        dados.porPonto
          ? fracaoDoRecuperado(dados.porPonto.p4, dados.porPonto.p1)
          : { children: <p className="text-[13px] text-fg-muted">{SEM_DETALHE_POR_PONTO}</p> }
      }
    </KpiConsulta>
  );
}
