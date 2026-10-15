/**
 * Gerador da tensão e da carga da bateria ao longo de hoje.
 *
 * Alimenta o minigráfico "Tensão hoje" do card "Estado da bateria" da tela
 * Energia. A série é derivada do que já existe, não inventada:
 * - a carga termina na leitura atual (68%) e é reconstruída de trás para a
 *   frente pela curva de hoje;
 * - com o carro em movimento, a bateria recebe o P3 e entrega o P4, na
 *   proporção da energia de hoje (o ganho do dia é P3 − P4); parada, a carga
 *   não muda (o nó é alimentado pelo veículo, premissa do exemplo);
 * - a tensão é a de repouso da carga ({@link tensaoEmRepouso}) e fica
 *   {@link SOBRETENSAO_CARGA_V} acima enquanto carrega. Às 18:05 isso dá
 *   3,918 V, os 3,92 V da leitura atual.
 */

import { horarioParaMinutos } from '../calculos';
import type { EnergiaPorPonto, PontoCurva, PontoTensaoBateria } from '../tipos';

/** Tensão de repouso de uma célula Li-ion vazia e cheia (aproximação linear). */
const TENSAO_VAZIA_V = 3.45;
const TENSAO_CHEIA_V = 4.05;

/** Quanto a tensão sobe acima da de repouso enquanto a bateria carrega. */
const SOBRETENSAO_CARGA_V = 0.06;

export interface ParametrosTensaoBateria {
  /** Curva de hoje, um ponto por minuto a partir de 00:00. */
  pontos: readonly PontoCurva[];
  /** Energia de hoje em cada ponto, para a proporção que entra e sai da bateria. */
  energiaHoje: EnergiaPorPonto;
  /** Energia da bateria cheia, em mWh (capacidade × tensão nominal). */
  capacidadeMwh: number;
  /** Carga no último ponto da curva (a leitura atual). */
  cargaFinalPercentual: number;
  /** Intervalo da série gerada, em minutos. */
  intervaloMinutos: number;
}

/**
 * Tensão de repouso (circuito aberto) para uma carga de 0 a 100%.
 *
 * Aproximação linear de 3,45 V (vazia) a 4,05 V (cheia), suficiente para o
 * minigráfico; a curva real de uma célula é mais plana no meio.
 */
export function tensaoEmRepouso(cargaPercentual: number): number {
  return TENSAO_VAZIA_V + ((TENSAO_CHEIA_V - TENSAO_VAZIA_V) * cargaPercentual) / 100;
}

/**
 * Gera a série de hoje, amostrada a cada `intervaloMinutos`.
 *
 * Calcula a carga de cada minuto andando para trás a partir da carga final:
 * a cada minuto em movimento, a carga do minuto anterior é a atual menos a
 * energia líquida que entrou (`potência × (P3 − P4) / P1`, em mWh por
 * minuto) sobre a capacidade.
 */
export function gerarTensaoBateria(parametros: ParametrosTensaoBateria): PontoTensaoBateria[] {
  const { pontos, energiaHoje, capacidadeMwh } = parametros;
  const fracaoLiquida = energiaHoje.p1 > 0 ? (energiaHoje.p3 - energiaHoje.p4) / energiaHoje.p1 : 0;
  const cargas = new Array<number>(pontos.length);
  cargas[pontos.length - 1] = parametros.cargaFinalPercentual;
  for (let i = pontos.length - 1; i > 0; i--) {
    const entradaMwh = (pontos[i].recuperadaMw * fracaoLiquida) / 60;
    cargas[i - 1] = cargas[i] - (entradaMwh / capacidadeMwh) * 100;
  }

  return pontos
    .map((ponto, i) => ({ ponto, carga: cargas[i] }))
    .filter(({ ponto }) => horarioParaMinutos(ponto.horario) % parametros.intervaloMinutos === 0)
    .map(({ ponto, carga }) => ({
      horario: ponto.horario,
      cargaPercentual: carga,
      tensaoV: tensaoEmRepouso(carga) + (ponto.recuperadaMw > 0 ? SOBRETENSAO_CARGA_V : 0),
    }));
}
