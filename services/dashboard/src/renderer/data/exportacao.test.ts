/**
 * Testes da exportação em CSV: "Resumo por dia" (Energia) e amostras (Telemetria).
 */

import { describe, expect, it } from 'vitest';
import {
  csvAmostrasTelemetria,
  csvResumoPorDia,
  nomeArquivoResumoPorDia,
  nomeArquivoTelemetria,
} from './exportacao';
import type { AmostraTelemetria, ResumoDia } from './tipos';

const DIAS: ResumoDia[] = [
  {
    data: '2026-10-02',
    horasMovimento: 1.5,
    pico: { potenciaMw: 356 },
    energia: { p1: 267, p2: 233, p3: 204, p4: 142 },
    lacunasPercentual: 4,
    potenciaMediaMw: 178,
    eficienciaPercentual: 53.18,
  },
  {
    data: '2026-10-04',
    horasMovimento: 1,
    pico: { potenciaMw: 334 },
    energia: { p1: 168, p2: 146, p3: 127, p4: 88 },
    lacunasPercentual: 0,
    potenciaMediaMw: 168,
    eficienciaPercentual: 52.38,
  },
];

describe('csvResumoPorDia', () => {
  /** Mesmas colunas e formatos da tabela, do dia mais recente ao mais antigo. */
  it('gera as linhas como na tabela', () => {
    const linhas = csvResumoPorDia(DIAS).replace('﻿', '').trimEnd().split('\r\n');

    expect(linhas).toEqual([
      'Data;Em movimento (h);Energia recuperada (mWh);Potência média (mW);Pico (mW);Eficiência (%);Qualidade dos dados',
      '04/10/2026;1,0;168;168;334;52,4;Completa',
      '02/10/2026;1,5;267;178;356;53,2;Lacunas 4%',
    ]);
  });
});

describe('nomeArquivoResumoPorDia', () => {
  /** Nome com o intervalo, sem caracteres problemáticos no Windows. */
  it('inclui o intervalo de datas', () => {
    expect(nomeArquivoResumoPorDia('2026-09-28', '2026-10-04')).toBe(
      'vers-resumo-por-dia-2026-09-28-a-2026-10-04.csv',
    );
  });

  /** Um dia só não repete a data. */
  it('usa uma data quando início e fim coincidem', () => {
    expect(nomeArquivoResumoPorDia('2026-10-05', '2026-10-05')).toBe(
      'vers-resumo-por-dia-2026-10-05.csv',
    );
  });
});

/** Amostra válida e uma inválida (sem tensão, corrente e potência). */
const AMOSTRAS: AmostraTelemetria[] = [
  {
    id: 'a2',
    testeId: 't23',
    capturadaEm: '2026-10-05T18:05:00.000-03:00',
    tensaoV: 4.8224,
    correnteMa: 43.96,
    potenciaMw: 212,
    energiaAcumuladaMwh: 146.381,
    vibracaoRmsMs2: 3.2,
    temperaturaC: 31.4,
    piezosAtivos: 6,
    piezosTotal: 8,
    qualidade: 'valida',
  },
  {
    id: 'a1',
    testeId: 't23',
    capturadaEm: '2026-10-05T18:04:50.410-03:00',
    tensaoV: null,
    correnteMa: null,
    potenciaMw: null,
    energiaAcumuladaMwh: null,
    vibracaoRmsMs2: 2.95,
    temperaturaC: 31.38,
    piezosAtivos: 6,
    piezosTotal: 8,
    qualidade: 'invalida',
  },
];

describe('csvAmostrasTelemetria', () => {
  /** A exportação real identifica fuso e contador sem fabricar total de piezos. */
  it('identifica dados reais e preserva total físico desconhecido', () => {
    const csv = csvAmostrasTelemetria([{ ...AMOSTRAS[0], piezosTotal: null }], 'uuid-do-teste', true);
    expect(csv).toContain('Capturado em (America/Sao_Paulo)');
    expect(csv).toContain('Contador do dispositivo (mWh)');
    expect(csv).not.toContain('null');
    expect(csv).toContain(';6;Válida');
  });
  /** Mesmas colunas da tabela; valores ausentes ficam vazios (não "–"), para não virar texto no Excel. */
  it('gera as linhas como na tabela', () => {
    const linhas = csvAmostrasTelemetria(AMOSTRAS, '#023')
      .replace('\uFEFF', '')
      .trimEnd()
      .split('\r\n');

    expect(linhas).toEqual([
      'Capturado em;Teste;Tensão (V);Corrente (mA);Potência (mW);Energia acumulada (mWh);Vibração RMS (m/s²);Temperatura (°C);Piezos ativos;Qualidade',
      '05/10/2026 18:05:00.000;#023;4,82;44;212;146,38;3,2;31,4;6/8;Válida',
      '05/10/2026 18:04:50.410;#023;;;;;3,0;31,4;6/8;Inválida',
    ]);
  });
});

describe('nomeArquivoTelemetria', () => {
  /** Sem "#" no nome (problemático em arquivos), com a data do teste. */
  it('usa o código do teste e a data', () => {
    expect(nomeArquivoTelemetria('#023', '2026-10-05T17:21:00-03:00')).toBe(
      'vers-telemetria-teste-023-2026-10-05.csv',
    );
  });
});
