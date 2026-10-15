/**
 * Medições brutas de exemplo do VERS (base aprovada em 09/10/2026).
 *
 * Fonte: `.AIs/docs/contexts/Context_09_10_2026.md`. Aqui ficam só os dados
 * brutos (energia em cada ponto, horas em movimento, pico e lacunas); todo
 * número exibido nas telas é derivado deles em `calculos.ts`.
 *
 * Linha do tempo do exemplo: a semana completa de segunda 28/09 a domingo
 * 04/10/2026 e o dia de hoje, segunda 05/10/2026, até as 18:05.
 */

import type { DiaMedido } from '../tipos';
import type { ParametrosCurva } from './curva';
import type { ParametrosAmostrasVibracao } from './vibracao';

/**
 * Semana de 28/09 a 04/10/2026.
 *
 * P1, P3 e P4 vêm da base aprovada. P2 (saída do LTC3588) não aparecia na
 * base diária; foi medido como P1 × 87,1% (eficiência do regulador na base)
 * e arredondado, o que reproduz o total de 1,67 Wh da tela Energia. Só a
 * quinta tem o horário do pico registrado (17:42), como na referência.
 */
export const SEMANA_EXEMPLO: DiaMedido[] = [
  {
    data: '2026-09-28',
    horasMovimento: 1.4,
    pico: { potenciaMw: 371 },
    energia: { p1: 258, p2: 225, p3: 198, p4: 138 },
    lacunasPercentual: 0,
  },
  {
    data: '2026-09-29',
    horasMovimento: 1.1,
    pico: { potenciaMw: 318 },
    energia: { p1: 178, p2: 155, p3: 136, p4: 95 },
    lacunasPercentual: 0,
  },
  {
    data: '2026-09-30',
    horasMovimento: 1.6,
    pico: { potenciaMw: 389 },
    energia: { p1: 306, p2: 267, p3: 236, p4: 165 },
    lacunasPercentual: 0,
  },
  {
    data: '2026-10-01',
    horasMovimento: 1.9,
    pico: { potenciaMw: 412, horario: '17:42' },
    energia: { p1: 390, p2: 340, p3: 301, p4: 211 },
    lacunasPercentual: 0,
  },
  {
    data: '2026-10-02',
    horasMovimento: 1.5,
    pico: { potenciaMw: 356 },
    energia: { p1: 267, p2: 233, p3: 204, p4: 142 },
    lacunasPercentual: 4,
  },
  {
    data: '2026-10-03',
    horasMovimento: 1.8,
    pico: { potenciaMw: 398 },
    energia: { p1: 353, p2: 307, p3: 270, p4: 188 },
    lacunasPercentual: 0,
  },
  {
    data: '2026-10-04',
    horasMovimento: 1.0,
    pico: { potenciaMw: 334 },
    energia: { p1: 168, p2: 146, p3: 127, p4: 88 },
    lacunasPercentual: 0,
  },
];

/**
 * Energia recuperada na semana anterior (21/09 a 27/09), em mWh.
 *
 * Valor que reproduz o "+8,4% vs semana anterior" da tela Energia.
 */
export const ENERGIA_SEMANA_ANTERIOR_MWH = 1771;

/** Data e horário "atuais" do exemplo: segunda, 05/10/2026, 18:05 (Brasília). */
export const AGORA_EXEMPLO = '2026-10-05T18:05:00-03:00';
export const HOJE_EXEMPLO = '2026-10-05';

/** Fuso do dispositivo nas datas ISO das amostras (Brasília). */
export const FUSO_EXEMPLO = '-03:00';

/**
 * Parâmetros da curva de hoje.
 *
 * Dois deslocamentos de 45 min (1,5 h, como na Visão geral), 292 mWh
 * recuperados, pico de 386 mW às 17:42 e o último minuto igual à potência ao
 * vivo de 212 mW (o carro ainda está em movimento às 18:05).
 */
export const CURVA_HOJE: ParametrosCurva = {
  ate: '18:05',
  deslocamentos: [
    { inicio: '07:50', minutos: 45 },
    { inicio: '17:21', minutos: 45 },
  ],
  energiaAlvoMwh: 292,
  pontosFixos: [
    { horario: '17:42', potenciaMw: 386 },
    { horario: '18:05', potenciaMw: 212 },
  ],
  semente: 20261005,
};

/**
 * Energia de hoje nos pontos 2 a 4, em mWh (P1 vem da curva).
 *
 * Mantém as eficiências da semana por estágio e dá os 53,5% ponta a ponta
 * da Visão geral (156,2 ÷ 292).
 */
export const ENERGIA_HOJE_P2_A_P4 = { p2: 254.3, p3: 224.0, p4: 156.2 };

/**
 * Parâmetros das amostras de vibração × potência (dispersão da tela Energia).
 *
 * Quatro amostras por dia anterior, nos horários dos trajetos de ida e volta,
 * e oito hoje, espalhadas pelos minutos em movimento da curva. Os dias e a
 * curva entram no repositório, que é quem os conhece.
 */
export const AMOSTRAS_VIBRACAO: Pick<
  ParametrosAmostrasVibracao,
  'horariosDiasAnteriores' | 'amostrasHoje' | 'semente'
> = {
  horariosDiasAnteriores: ['07:55', '08:20', '17:35', '18:00'],
  amostrasHoje: 8,
  semente: 20261006,
};

/** Semente das amostras de telemetria de hoje (`fixtures/telemetria.ts`). */
export const SEMENTE_TELEMETRIA = 20261007;
