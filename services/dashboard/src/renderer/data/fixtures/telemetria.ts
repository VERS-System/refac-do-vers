/**
 * Gerador determinístico das amostras de telemetria de exemplo.
 *
 * O ESP32 envia uma amostra validada a cada 10 s durante um teste. As
 * amostras são derivadas do que já existe, para conversar com as outras
 * telas:
 * - potência: a curva de hoje (média por minuto) interpolada linearmente,
 *   então a energia integrada bate com a curva;
 * - tensão: {@link TENSAO_BASE_V} + {@link TENSAO_POR_MW} × P (212 mW →
 *   4,82 V) e corrente = P ÷ V (→ 44 mA), como a cadeia ao vivo;
 * - vibração: P ÷ 66 + ruído (o mesmo modelo da dispersão da Energia);
 * - temperatura: a do ambiente na hora, aquecendo ao longo do teste;
 * - piezos e qualidade: 6 de 8 quase sempre; às vezes 5 (Parcial) ou 4
 *   (Suspeita), e raramente uma leitura Inválida, sem tensão nem corrente;
 * - a última amostra do dia é a leitura ao vivo (212 mW, 3,2 m/s², 31,4 °C).
 */

import type { AmostraTelemetria, PontoCurva, QualidadeAmostra, TesteCampo } from '../tipos';
import { mulberry32, normal } from './aleatorio';
import { MW_POR_MS2 } from './vibracao';

/** Tensão do nó com potência zero e quanto ela sobe por mW (212 mW → 4,82 V). */
export const TENSAO_BASE_V = 1.6;
export const TENSAO_POR_MW = 0.0152;

/** Intervalo entre amostras, em segundos. */
const INTERVALO_S = 10;

/** Chances de uma amostra inválida, com 4 piezos (suspeita) ou com 5 (parcial). */
const CHANCE_INVALIDA = 0.01;
const CHANCE_QUATRO_PIEZOS = 0.02;
const CHANCE_CINCO_PIEZOS = 0.05;

/** Piezos captando numa amostra normal (6 de 8, como a vibração ao vivo). */
const PIEZOS_NORMAIS = 6;

/** Desvio do ruído da vibração por amostra, em m/s². */
const DESVIO_VIBRACAO_MS2 = 0.25;
const VIBRACAO_MINIMA_MS2 = 0.2;

/** Quanto o bloco de piezos aquece do início ao fim de um teste, em °C. */
const AQUECIMENTO_NO_TESTE_C = 3.5;

export interface ParametrosTelemetria {
  /** Data das amostras (AAAA-MM-DD) e fuso do dispositivo ("-03:00"). */
  data: string;
  fuso: string;
  /** Curva de hoje, um ponto por minuto desde 00:00. */
  pontos: readonly PontoCurva[];
  testes: readonly TesteCampo[];
  piezosTotal: number;
  /** Leitura ao vivo, que a última amostra do dia deve reproduzir. */
  leituraFinal: { vibracaoRmsMs2: number; temperaturaC: number; piezosAtivos: number };
  semente: number;
}

/** Segundos desde 00:00 do horário de uma data ISO ("…T17:21:00…"). */
function segundosDoDia(iso: string): number {
  const [horas, minutos, segundos] = iso.slice(11, 19).split(':').map(Number);
  return horas * 3600 + minutos * 60 + segundos;
}

/** "HH:MM:SS" de um instante em segundos desde 00:00. */
function horarioEmSegundos(segundos: number): string {
  const dois = (n: number) => String(n).padStart(2, '0');
  return `${dois(Math.floor(segundos / 3600))}:${dois(Math.floor((segundos % 3600) / 60))}:${dois(segundos % 60)}`;
}

/** Potência no instante, interpolando linearmente entre os minutos da curva. */
function potenciaNoInstante(pontos: readonly PontoCurva[], segundos: number): number {
  const minuto = Math.floor(segundos / 60);
  const atual = pontos[minuto]?.recuperadaMw ?? 0;
  const proximo = pontos[minuto + 1]?.recuperadaMw ?? atual;
  return atual + ((segundos % 60) / 60) * (proximo - atual);
}

/**
 * Temperatura ambiente na hora do dia: ~22 °C de madrugada, chegando a
 * ~30 °C à tarde (meia senoide entre 07:00 e 21:00).
 */
function temperaturaAmbiente(segundos: number): number {
  const fase = (segundos - 7 * 3600) / (14 * 3600);
  return 22 + 8 * Math.max(0, Math.sin(Math.PI * fase));
}

/** Arredonda para `casas` decimais. */
function arredondar(valor: number, casas: number): number {
  const fator = 10 ** casas;
  return Math.round(valor * fator) / fator;
}

/** Qualidade pelo número de piezos captando (regra do exemplo; o backend é quem classifica). */
function qualidadePorPiezos(piezos: number): QualidadeAmostra {
  if (piezos <= 4) return 'suspeita';
  if (piezos === 5) return 'parcial';
  return 'valida';
}

/**
 * Gera as amostras de todos os testes, em ordem cronológica.
 *
 * Para cada teste, amostra de 10 em 10 s do início até o fim (exclusivo)
 * ou, no teste em andamento, até o último minuto da curva (inclusive). A
 * energia acumulada é a integral por trapézios da potência desde o início
 * do teste. A primeira e a última amostra de cada teste são sempre válidas.
 */
export function gerarAmostrasTelemetria(parametros: ParametrosTelemetria): AmostraTelemetria[] {
  const aleatorio = mulberry32(parametros.semente);
  const ultimoSegundo = (parametros.pontos.length - 1) * 60;
  const amostras: AmostraTelemetria[] = [];

  for (const teste of parametros.testes) {
    // Testes que ainda não começaram não têm amostras.
    if (!teste.inicio) continue;
    const inicio = segundosDoDia(teste.inicio);
    const instantes: number[] = [];
    if (teste.fim) {
      for (let t = inicio; t < segundosDoDia(teste.fim); t += INTERVALO_S) instantes.push(t);
    } else {
      for (let t = inicio; t <= ultimoSegundo; t += INTERVALO_S) instantes.push(t);
    }

    let energiaMwh = 0;
    let potenciaAnterior = 0;
    instantes.forEach((t, indice) => {
      const potencia = potenciaNoInstante(parametros.pontos, t);
      if (indice > 0) energiaMwh += ((potenciaAnterior + potencia) / 2) * (INTERVALO_S / 3600);
      potenciaAnterior = potencia;

      const extremo = indice === 0 || indice === instantes.length - 1;
      const sorteio = aleatorio();
      let piezos = PIEZOS_NORMAIS;
      let invalida = false;
      if (!extremo) {
        if (sorteio < CHANCE_INVALIDA) invalida = true;
        else if (sorteio < CHANCE_INVALIDA + CHANCE_QUATRO_PIEZOS) piezos = 4;
        else if (sorteio < CHANCE_INVALIDA + CHANCE_QUATRO_PIEZOS + CHANCE_CINCO_PIEZOS) piezos = 5;
      }

      const progresso = instantes.length > 1 ? indice / (instantes.length - 1) : 0;
      const tensao = TENSAO_BASE_V + TENSAO_POR_MW * potencia;
      const milissegundos = 380 + Math.floor(aleatorio() * 41);
      const vibracao = Math.max(
        VIBRACAO_MINIMA_MS2,
        potencia / MW_POR_MS2 + DESVIO_VIBRACAO_MS2 * normal(aleatorio),
      );
      const temperatura = temperaturaAmbiente(t) + AQUECIMENTO_NO_TESTE_C * progresso;

      amostras.push({
        id: `${teste.id}-${String(indice).padStart(4, '0')}`,
        testeId: teste.id,
        capturadaEm: `${parametros.data}T${horarioEmSegundos(t)}.${String(milissegundos).padStart(3, '0')}${parametros.fuso}`,
        tensaoV: invalida ? null : tensao,
        correnteMa: invalida ? null : potencia / tensao,
        potenciaMw: invalida ? null : potencia,
        energiaAcumuladaMwh: invalida ? null : energiaMwh,
        vibracaoRmsMs2: arredondar(vibracao, 2),
        temperaturaC: arredondar(temperatura, 2),
        piezosAtivos: piezos,
        piezosTotal: parametros.piezosTotal,
        qualidade: invalida ? 'invalida' : qualidadePorPiezos(piezos),
      });
    });
  }

  // A última amostra do dia é a leitura ao vivo, capturada exatamente "agora".
  const ultima = amostras.at(-1);
  if (ultima && segundosDoDia(ultima.capturadaEm) === ultimoSegundo) {
    Object.assign(ultima, {
      capturadaEm: `${ultima.capturadaEm.slice(0, 19)}.000${parametros.fuso}`,
      vibracaoRmsMs2: parametros.leituraFinal.vibracaoRmsMs2,
      temperaturaC: parametros.leituraFinal.temperaturaC,
      piezosAtivos: parametros.leituraFinal.piezosAtivos,
      qualidade: qualidadePorPiezos(parametros.leituraFinal.piezosAtivos),
    });
  }
  return amostras;
}
