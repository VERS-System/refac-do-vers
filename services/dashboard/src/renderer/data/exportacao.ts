/**
 * Exportação dos dados das telas em CSV: o "Resumo por dia" da Energia e as
 * amostras de um teste da Telemetria.
 *
 * As colunas e os formatos são os mesmos da tabela, para que o arquivo
 * confira com o que o usuário vê.
 */

import { gerarCsv } from '@/lib/csv';
import {
  formatarData,
  formatarHorarioCaptura,
  formatarNumero,
  formatarPercentual,
  formatarPotencia,
} from '@/lib/format';
import type { AmostraTelemetria, QualidadeAmostra, ResumoDia } from './tipos';

const CABECALHO_RESUMO = [
  'Data',
  'Em movimento (h)',
  'Energia recuperada (mWh)',
  'Potência média (mW)',
  'Pico (mW)',
  'Eficiência (%)',
  'Qualidade dos dados',
];

/** Texto da qualidade dos dados do dia ("Completa" ou "Lacunas 4%"). */
export function qualidadeDoDia(dia: ResumoDia): string {
  return dia.lacunasPercentual > 0
    ? `Lacunas ${formatarNumero(dia.lacunasPercentual)}%`
    : 'Completa';
}

/**
 * Gera o CSV do resumo por dia, do dia mais recente ao mais antigo (a ordem
 * da tabela).
 */
export function csvResumoPorDia(dias: readonly ResumoDia[]): string {
  const linhas = [...dias]
    .sort((a, b) => b.data.localeCompare(a.data))
    .map((dia) => [
      formatarData(dia.data),
      formatarNumero(dia.horasMovimento, 1),
      formatarNumero(dia.energia.p1),
      formatarPotencia(dia.potenciaMediaMw).valor,
      formatarNumero(dia.pico.potenciaMw),
      formatarPercentual(dia.eficienciaPercentual).valor,
      qualidadeDoDia(dia),
    ]);
  return gerarCsv(CABECALHO_RESUMO, linhas);
}

/** Nome do arquivo com o intervalo exportado (uma data só quando é um dia). */
export function nomeArquivoResumoPorDia(inicio: string, fim: string): string {
  const intervalo = inicio === fim ? inicio : `${inicio}-a-${fim}`;
  return `vers-resumo-por-dia-${intervalo}.csv`;
}

const CABECALHO_TELEMETRIA = [
  'Capturado em',
  'Teste',
  'Tensão (V)',
  'Corrente (mA)',
  'Potência (mW)',
  'Energia acumulada (mWh)',
  'Vibração RMS (m/s²)',
  'Temperatura (°C)',
  'Piezos ativos',
  'Qualidade',
];

/** Texto de cada qualidade de amostra, igual ao badge da tabela. */
export const TEXTO_QUALIDADE: Record<QualidadeAmostra, string> = {
  valida: 'Válida',
  parcial: 'Parcial',
  suspeita: 'Suspeita',
  invalida: 'Inválida',
};

/**
 * Formata um número para o CSV; ausente vira campo vazio (e não "–"), para
 * que o Excel trate a coluna como numérica.
 */
function numeroCsv(valor: number | null, casas = 0): string {
  return valor === null ? '' : formatarNumero(valor, casas);
}

/**
 * Gera o CSV das amostras de um teste, na ordem recebida (a da tabela: da
 * mais recente para a mais antiga), com data e horário completos de captura.
 */
export function csvAmostrasTelemetria(
  amostras: readonly AmostraTelemetria[],
  codigoTeste: string,
  real = false,
): string {
  const linhas = amostras.map((amostra) => [
    `${formatarData(amostra.capturadaEm.slice(0, 10))} ${formatarHorarioCaptura(amostra.capturadaEm, true)}`,
    codigoTeste,
    numeroCsv(amostra.tensaoV, 2),
    numeroCsv(amostra.correnteMa),
    numeroCsv(amostra.potenciaMw),
    numeroCsv(amostra.energiaAcumuladaMwh, 2),
    numeroCsv(amostra.vibracaoRmsMs2, 1),
    numeroCsv(amostra.temperaturaC, 1),
    amostra.piezosAtivos === null ? '' : amostra.piezosTotal === null ? String(amostra.piezosAtivos) : `${amostra.piezosAtivos}/${amostra.piezosTotal}`,
    TEXTO_QUALIDADE[amostra.qualidade],
  ]);
  return gerarCsv(real ? CABECALHO_TELEMETRIA.map((c, i) => i === 0 ? 'Capturado em (America/Sao_Paulo)' : i === 5 ? 'Contador do dispositivo (mWh)' : c) : CABECALHO_TELEMETRIA, linhas);
}

/** Nome do arquivo das amostras: código do teste sem "#" e a data do início. */
export function nomeArquivoTelemetria(codigoTeste: string, inicioTeste: string): string {
  return `vers-telemetria-teste-${codigoTeste.replace(/^#/, '')}-${inicioTeste.slice(0, 10)}.csv`;
}
