/**
 * Gerador determinístico da curva de potência de um dia de exemplo.
 *
 * Cria um ponto por minuto (média do minuto) desde 00:00 até o horário
 * final. Fora dos deslocamentos a potência recuperada é zero; dentro deles a
 * forma vem de uma oscilação com ruído pseudoaleatório de semente fixa. A
 * curva é então escalada para que a integral por trapézios dê exatamente a
 * energia alvo, mantendo os pontos fixos (pico e leitura ao vivo) intactos.
 */

import { horarioParaMinutos, integrarTrapezios, minutosParaHorario } from '../calculos';
import type { Horario, PontoCurva } from '../tipos';
import { mulberry32 } from './aleatorio';

export interface ParametrosCurva {
  /** Último horário da curva (o "agora" do exemplo), inclusive. */
  ate: Horario;
  /** Trechos em movimento: início e duração em minutos. */
  deslocamentos: { inicio: Horario; minutos: number }[];
  /** Energia recuperada no dia, em mWh. */
  energiaAlvoMwh: number;
  /** Potências que a curva deve ter exatamente nesses horários. */
  pontosFixos: { horario: Horario; potenciaMw: number }[];
  semente: number;
}

/** Duração das rampas de aceleração e frenagem no início e no fim de cada deslocamento. */
const MINUTOS_RAMPA = 4;

/**
 * Consumo do nó ESP32 ao longo do dia, em mW.
 *
 * Reproduz a linha tracejada da referência da Visão geral: sobe devagar de
 * 45 mW de madrugada para cerca de 62 mW no fim do dia.
 */
function consumoDoNo(minuto: number): number {
  return Math.round((45 + (17 * minuto) / 1440) * 10) / 10;
}

/**
 * Gera a curva do dia com os parâmetros informados.
 *
 * Passos: (1) monta a forma relativa em cada minuto de deslocamento;
 * (2) zera os minutos dos pontos fixos e calcula a escala `s` que resolve
 * `s × A + B = alvo`, onde A é a integral da forma e B a dos pontos fixos
 * (a integral por trapézios é linear, então a solução é exata);
 * (3) aplica a escala e grava os pontos fixos.
 */
export function gerarCurvaDoDia(parametros: ParametrosCurva): PontoCurva[] {
  const total = horarioParaMinutos(parametros.ate) + 1;
  const aleatorio = mulberry32(parametros.semente);
  const forma = new Array<number>(total).fill(0);

  for (const deslocamento of parametros.deslocamentos) {
    const inicio = horarioParaMinutos(deslocamento.inicio);
    for (let i = 0; i < deslocamento.minutos; i++) {
      const rampa = Math.min(
        1,
        (i + 1) / MINUTOS_RAMPA,
        (deslocamento.minutos - i) / MINUTOS_RAMPA,
      );
      const oscilacao = 1 + 0.22 * Math.sin((2 * Math.PI * i) / 11) + 0.3 * (aleatorio() - 0.5);
      forma[inicio + i] = Math.max(0.05, rampa * oscilacao);
    }
  }

  const fixos = new Array<number>(total).fill(0);
  for (const fixo of parametros.pontosFixos) {
    const minuto = horarioParaMinutos(fixo.horario);
    forma[minuto] = 0;
    fixos[minuto] = fixo.potenciaMw;
  }

  const intervaloHoras = 1 / 60;
  const area = integrarTrapezios(forma, intervaloHoras);
  const areaFixos = integrarTrapezios(fixos, intervaloHoras);
  const escala = (parametros.energiaAlvoMwh - areaFixos) / area;

  return forma.map((valor, minuto) => ({
    horario: minutosParaHorario(minuto),
    recuperadaMw: fixos[minuto] > 0 ? fixos[minuto] : valor * escala,
    consumoNoMw: consumoDoNo(minuto),
  }));
}
