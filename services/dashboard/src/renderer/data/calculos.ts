/**
 * Cálculos de energia, eficiência e resumos de período do VERS.
 *
 * Funções puras que fazem o papel do backend: a partir das medições brutas
 * (energia por ponto, horas em movimento, curva de potência, V/I/P) derivam
 * todos os números exibidos nas telas. Assim nenhum valor exibido é copiado à
 * mão: se a base muda, os KPIs, tabelas e comparações mudam juntos.
 */

import { formatarTempoDecorrido } from '@/lib/format';
import type { Periodo } from '@/stores/periodo';
import type {
  CadeiaConversao,
  DataISO,
  DiaMedido,
  Dispositivo,
  DispositivoResumo,
  EnergiaPorPonto,
  Horario,
  PerdasConversao,
  PicoPotencia,
  PontoConversao,
  PontoCurva,
  ResumoDia,
  ResumoEnergia,
  Veiculo,
} from './tipos';

/**
 * Eficiência de um estágio: saída sobre entrada, em percentual.
 *
 * Devolve `null` sem entrada, porque a razão não é definida (e exibir "0%"
 * sugeriria uma medição que não existe).
 */
export function eficiencia(saida: number, entrada: number): number | null {
  if (entrada === 0) return null;
  return (saida / entrada) * 100;
}

/** Perda percentual de um estágio (100 menos a eficiência), ou `null` sem entrada. */
export function perdaPercentual(saida: number, entrada: number): number | null {
  const valor = eficiencia(saida, entrada);
  return valor === null ? null : 100 - valor;
}

/** Variação percentual de `atual` em relação a `referencia`, ou `null` se a referência for zero. */
export function variacaoPercentual(atual: number, referencia: number): number | null {
  if (referencia === 0) return null;
  return (atual / referencia - 1) * 100;
}

/**
 * Integra uma série de potências igualmente espaçadas pela regra dos trapézios.
 *
 * É o método citado na tela Energia ("Integração trapezoidal de P = V × I").
 * Com potência em mW e intervalo em horas, o resultado sai em mWh.
 */
export function integrarTrapezios(valores: readonly number[], intervaloHoras: number): number {
  let soma = 0;
  for (let i = 1; i < valores.length; i++) {
    soma += ((valores[i - 1] + valores[i]) / 2) * intervaloHoras;
  }
  return soma;
}

/** Converte minutos desde a meia-noite em "HH:MM". */
export function minutosParaHorario(minutos: number): Horario {
  const horas = Math.floor(minutos / 60);
  return `${String(horas).padStart(2, '0')}:${String(minutos % 60).padStart(2, '0')}`;
}

/** Converte "HH:MM" em minutos desde a meia-noite. */
export function horarioParaMinutos(horario: Horario): number {
  const [horas, minutos] = horario.split(':').map(Number);
  return horas * 60 + minutos;
}

/** Potência média em movimento: energia sobre horas, ou `null` se não houve movimento. */
function potenciaMedia(energiaMwh: number, horas: number): number | null {
  return horas > 0 ? energiaMwh / horas : null;
}

/** Perdas de cada estágio a partir das energias por ponto, ou `null` sem energia no P1. */
function calcularPerdas(energia: EnergiaPorPonto): PerdasConversao | null {
  if (energia.p1 === 0) return null;
  return {
    regulador: perdaPercentual(energia.p2, energia.p1) ?? 0,
    bateria: perdaPercentual(energia.p3, energia.p2) ?? 0,
    celular: perdaPercentual(energia.p4, energia.p3) ?? 0,
  };
}

/** Acrescenta a um dia medido a potência média e a eficiência ponta a ponta. */
export function resumirDia(dia: DiaMedido): ResumoDia {
  return {
    ...dia,
    potenciaMediaMw: potenciaMedia(dia.energia.p1, dia.horasMovimento),
    eficienciaPercentual: eficiencia(dia.energia.p4, dia.energia.p1),
  };
}

/**
 * Resume uma lista de dias num período (Dia, Semana ou Mês).
 *
 * Soma energias e horas; a potência média é a energia total sobre as horas
 * totais (ponderada pelo tempo, não a média das médias diárias). O pico é o
 * maior entre os dias. Os dias devem vir em ordem cronológica.
 */
export function resumirDias(periodo: Periodo, dias: readonly DiaMedido[]): ResumoEnergia {
  const energia: EnergiaPorPonto = { p1: 0, p2: 0, p3: 0, p4: 0 };
  let horas = 0;
  let pico: PicoPotencia | null = null;
  for (const dia of dias) {
    energia.p1 += dia.energia.p1;
    energia.p2 += dia.energia.p2;
    energia.p3 += dia.energia.p3;
    energia.p4 += dia.energia.p4;
    horas += dia.horasMovimento;
    if (!pico || dia.pico.potenciaMw > pico.potenciaMw) {
      pico = { potenciaMw: dia.pico.potenciaMw, data: dia.data, horario: dia.pico.horario };
    }
  }
  return {
    periodo,
    inicio: dias[0]?.data ?? '',
    fim: dias.at(-1)?.data ?? '',
    diasComDados: dias.length,
    diasComLacunas: dias.filter((dia) => dia.lacunasPercentual > 0).length,
    horasMovimento: horas,
    energiaRecuperadaMwh: energia.p1,
    porPonto: energia,
    potenciaMediaMw: potenciaMedia(energia.p1, horas),
    pico,
    eficienciaPercentual: eficiencia(energia.p4, energia.p1),
    perdas: calcularPerdas(energia),
  };
}

/**
 * Resume um trecho da curva de potência (usado no período Hora).
 *
 * A curva só mede o nó piezoelétrico (P1), então o resumo não traz energia
 * por ponto, eficiência nem perdas: inventar esses valores violaria a regra de
 * honestidade dos dados. Minutos com potência positiva contam como movimento.
 */
export function resumirCurva(
  periodo: Periodo,
  data: DataISO,
  pontos: readonly PontoCurva[],
  intervaloMinutos: number,
): ResumoEnergia {
  const potencias = pontos.map((ponto) => ponto.recuperadaMw);
  const energia = integrarTrapezios(potencias, intervaloMinutos / 60);
  const horas = (potencias.filter((p) => p > 0).length * intervaloMinutos) / 60;
  let pico: PicoPotencia | null = null;
  for (const ponto of pontos) {
    if (ponto.recuperadaMw > 0 && (!pico || ponto.recuperadaMw > pico.potenciaMw)) {
      pico = { potenciaMw: ponto.recuperadaMw, data, horario: ponto.horario };
    }
  }
  return {
    periodo,
    inicio: data,
    fim: data,
    diasComDados: pontos.length > 0 ? 1 : 0,
    diasComLacunas: 0,
    horasMovimento: horas,
    energiaRecuperadaMwh: energia,
    potenciaMediaMw: potenciaMedia(energia, horas),
    pico,
    eficienciaPercentual: null,
    perdas: null,
  };
}

/**
 * Acrescenta à leitura dos 4 pontos a eficiência de cada estágio e a ponta a ponta.
 *
 * Usa a potência medida em cada ponto (o ESP32 mede P diretamente), e não o
 * produto V × I dos valores já arredondados para exibição.
 */
export function enriquecerCadeia(
  capturadaEm: string,
  pontos: readonly Omit<PontoConversao, 'eficienciaEstagioPercentual'>[],
): CadeiaConversao {
  return {
    capturadaEm,
    pontos: pontos.map((ponto, indice) => ({
      ...ponto,
      eficienciaEstagioPercentual: indice === 0 ? null : eficiencia(ponto.potenciaMw, pontos[indice - 1].potenciaMw),
    })),
    eficienciaPontaAPontaPercentual:
      pontos.length > 1 ? eficiencia(pontos[pontos.length - 1].potenciaMw, pontos[0].potenciaMw) : null,
  };
}

/** Prepara o dispositivo para o card da sidebar, com o tempo desde o último contato. */
export function resumirDispositivo(dispositivo: Dispositivo, agora: Date): DispositivoResumo {
  const segundos = (agora.getTime() - new Date(dispositivo.ultimoContato).getTime()) / 1000;
  return {
    nome: `${dispositivo.plataforma} · ${dispositivo.id}`,
    online: dispositivo.online,
    firmware: dispositivo.firmware,
    vistoHa: formatarTempoDecorrido(segundos),
    protocolo: dispositivo.protocolo,
  };
}

/** Descrição curta do veículo usada no subtítulo das telas ("Honda Civic 2026 · ABC1D23"). */
export function descreverVeiculo(veiculo: Veiculo): string {
  return `${veiculo.fabricante} ${veiculo.modelo} ${veiculo.ano} · ${veiculo.placa}`;
}

/**
 * Recorta a janela final de uma curva: os pontos dos últimos `minutos`.
 *
 * Usado no período Hora (a última hora da curva de hoje). A janela termina no
 * último ponto e inclui o ponto exatamente `minutos` antes dele, então uma
 * curva por minuto rende `minutos + 1` pontos (17:05 a 18:05).
 */
export function recortarUltimosMinutos(pontos: readonly PontoCurva[], minutos: number): PontoCurva[] {
  if (pontos.length === 0) return [];
  const inicio = horarioParaMinutos(pontos[pontos.length - 1].horario) - minutos;
  return pontos.filter((ponto) => horarioParaMinutos(ponto.horario) >= inicio);
}
