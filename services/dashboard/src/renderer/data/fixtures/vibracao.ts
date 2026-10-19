/**
 * Gerador determinístico das amostras de vibração × potência de exemplo.
 *
 * Alimenta a dispersão "Energia × vibração" da tela Energia. A base aprovada
 * não tinha esses pares, então eles são gerados de forma coerente com o que
 * já existe:
 * - nos dias anteriores, a potência fica abaixo do pico registrado do dia;
 * - hoje, as amostras caem em minutos em movimento e usam a potência da curva;
 * - a vibração é a potência dividida por {@link MW_POR_MS2} (212 mW ↔ 3,2
 *   m/s², a leitura ao vivo), mais um ruído normal de semente fixa.
 *
 * O "r" exibido na tela é calculado sobre estas amostras, não copiado do Stitch.
 */

import type { AmostraVibracao, DataISO, DiaMedido, Horario, PontoCurva } from '../tipos';
import { mulberry32, normal } from './aleatorio';

/** Potência gerada por m/s² de vibração RMS: 212 mW ÷ 3,2 m/s² ≈ 66. */
export const MW_POR_MS2 = 66;

/** Desvio do ruído da vibração, em m/s² (deixa a correlação alta, mas não perfeita). */
const DESVIO_RUIDO_MS2 = 0.55;

/** Menor vibração registrada: abaixo disso o carro está parado e não há amostra. */
const VIBRACAO_MINIMA_MS2 = 0.2;

/** Faixa da potência nos dias anteriores, como fração do pico do dia. */
const FRACAO_MINIMA_DO_PICO = 0.3;
const FRACAO_MAXIMA_DO_PICO = 0.95;

export interface ParametrosAmostrasVibracao {
  /** Dias completos anteriores a hoje, em ordem cronológica. */
  diasAnteriores: readonly DiaMedido[];
  /** Horários das amostras em cada dia anterior (trajetos de ida e volta). */
  horariosDiasAnteriores: readonly Horario[];
  /** Curva de hoje, de onde saem os minutos em movimento e as potências. */
  hoje: { data: DataISO; pontos: readonly PontoCurva[] };
  /** Quantas amostras tirar hoje, espalhadas pelos minutos em movimento. */
  amostrasHoje: number;
  semente: number;
}

/** Arredonda para `casas` decimais. */
function arredondar(valor: number, casas: number): number {
  const fator = 10 ** casas;
  return Math.round(valor * fator) / fator;
}

/**
 * Escolhe `quantidade` itens espalhados por igual, incluindo o primeiro e o
 * último (índices 0, …, n − 1).
 */
function espalhar<T>(itens: readonly T[], quantidade: number): T[] {
  if (quantidade <= 0 || itens.length === 0) return [];
  if (quantidade === 1 || itens.length === 1) return [itens[itens.length - 1]];
  return Array.from({ length: Math.min(quantidade, itens.length) }, (_, j) => {
    const indice = Math.round((j * (itens.length - 1)) / (Math.min(quantidade, itens.length) - 1));
    return itens[indice];
  });
}

/**
 * Gera as amostras: primeiro as dos dias anteriores, depois as de hoje.
 *
 * Para cada amostra, a vibração é `potência ÷ 66 + ruído`, com piso de 0,2
 * m/s². A potência é arredondada para mW inteiros e a vibração para duas
 * casas, como o ESP32 enviaria.
 */
export function gerarAmostrasVibracao(parametros: ParametrosAmostrasVibracao): AmostraVibracao[] {
  const aleatorio = mulberry32(parametros.semente);

  /** Monta a amostra a partir da potência, sorteando o ruído da vibração. */
  const amostra = (data: DataISO, horario: Horario, potenciaMw: number): AmostraVibracao => {
    const vibracao = potenciaMw / MW_POR_MS2 + DESVIO_RUIDO_MS2 * normal(aleatorio);
    return {
      data,
      horario,
      vibracaoRmsMs2: arredondar(Math.max(VIBRACAO_MINIMA_MS2, vibracao), 2),
      potenciaMw: Math.round(potenciaMw),
    };
  };

  const anteriores = parametros.diasAnteriores.flatMap((dia) =>
    parametros.horariosDiasAnteriores.map((horario) => {
      const fracao =
        FRACAO_MINIMA_DO_PICO + (FRACAO_MAXIMA_DO_PICO - FRACAO_MINIMA_DO_PICO) * aleatorio();
      return amostra(dia.data, horario, dia.pico.potenciaMw * fracao);
    }),
  );

  const emMovimento = parametros.hoje.pontos.filter((ponto) => ponto.recuperadaMw > 0);
  const deHoje = espalhar(emMovimento, parametros.amostrasHoje).map((ponto) =>
    amostra(parametros.hoje.data, ponto.horario, ponto.recuperadaMw),
  );

  return [...anteriores, ...deHoje];
}
