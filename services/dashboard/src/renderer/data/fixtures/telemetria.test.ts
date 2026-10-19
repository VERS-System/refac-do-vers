/**
 * Testes do gerador das amostras de telemetria de exemplo (tela Telemetria).
 *
 * Usam a curva real de hoje, para conferir a coerência com as demais telas:
 * a última amostra é a leitura ao vivo e a energia vem da mesma curva.
 */

import { describe, expect, it } from 'vitest';
import { formatarNumero } from '@/lib/format';
import { horarioParaMinutos, integrarTrapezios } from '../calculos';
import type { AmostraTelemetria } from '../tipos';
import { gerarCurvaDoDia } from './curva';
import { CURVA_HOJE } from './medicoes';
import { gerarAmostrasTelemetria, TENSAO_BASE_V, TENSAO_POR_MW } from './telemetria';
import { TESTES_HOJE } from './testes';

const PONTOS = gerarCurvaDoDia(CURVA_HOJE);
const PARAMETROS = {
  data: '2026-10-05',
  fuso: '-03:00',
  pontos: PONTOS,
  testes: TESTES_HOJE,
  piezosTotal: 8,
  leituraFinal: { vibracaoRmsMs2: 3.2, temperaturaC: 31.4, piezosAtivos: 6 },
  semente: 99,
};
const AMOSTRAS = gerarAmostrasTelemetria(PARAMETROS);
const doTeste = (id: string) => AMOSTRAS.filter((a) => a.testeId === id);
const MANHA = doTeste(TESTES_HOJE[0].id);
const TARDE = doTeste(TESTES_HOJE[1].id);

/** "HH:MM:SS" de uma amostra. */
const horario = (a: AmostraTelemetria) => a.capturadaEm.slice(11, 19);

describe('testes de hoje', () => {
  /** Os dois deslocamentos da curva de hoje viram os testes #022 e #023. */
  it('são os dois trajetos do dia', () => {
    expect(TESTES_HOJE.map((t) => [t.codigo, t.estado])).toEqual([
      ['#022', 'concluido'],
      ['#023', 'em-andamento'],
    ]);
    expect(TESTES_HOJE[0].inicio).toBe('2026-10-05T07:50:00-03:00');
    expect(TESTES_HOJE[0].fim).toBe('2026-10-05T08:35:00-03:00');
    expect(TESTES_HOJE[1].inicio).toBe('2026-10-05T17:21:00-03:00');
    expect(TESTES_HOJE[1].fim).toBeNull();
  });
});

describe('gerarAmostrasTelemetria', () => {
  /** Mesma semente, mesmas amostras. */
  it('é determinístico', () => {
    expect(gerarAmostrasTelemetria(PARAMETROS)).toEqual(AMOSTRAS);
  });

  /** Uma amostra a cada 10 s: 07:50:00 a 08:34:50 (fim exclusivo) e 17:21:00 a 18:05:00 (até agora). */
  it('amostra cada teste a cada 10 s', () => {
    expect(MANHA).toHaveLength(270);
    expect(TARDE).toHaveLength(265);
    expect(horario(MANHA[0])).toBe('07:50:00');
    expect(horario(MANHA.at(-1)!)).toBe('08:34:50');
    expect(horario(TARDE[0])).toBe('17:21:00');
    expect(horario(TARDE.at(-1)!)).toBe('18:05:00');
    expect(horario(TARDE[1])).toBe('17:21:10');
  });

  /** O horário de captura tem milissegundos e o fuso de Brasília. */
  it('registra a captura com milissegundos e fuso', () => {
    for (const amostra of AMOSTRAS.slice(0, 20)) {
      expect(amostra.capturadaEm).toMatch(/^2026-10-05T\d{2}:\d{2}:\d{2}\.\d{3}-03:00$/);
    }
  });

  /** A potência é a curva por minuto interpolada (no minuto cheio, o próprio ponto). */
  it('segue a curva de hoje', () => {
    const doMinuto = (h: string) => PONTOS[horarioParaMinutos(h)].recuperadaMw;
    const valida = TARDE.filter((a) => a.potenciaMw !== null);
    const noMinutoCheio = valida.find((a) => horario(a) === '17:40:00')!;
    const noMeioMinuto = valida.find((a) => horario(a) === '17:40:30')!;

    expect(noMinutoCheio.potenciaMw).toBeCloseTo(doMinuto('17:40'), 6);
    expect(noMeioMinuto.potenciaMw).toBeCloseTo((doMinuto('17:40') + doMinuto('17:41')) / 2, 6);
  });

  /** Tensão pela fórmula e corrente = P ÷ V (o backend recalcula P = V × I). */
  it('deriva tensão e corrente da potência', () => {
    for (const amostra of TARDE.filter((a) => a.potenciaMw !== null).slice(0, 30)) {
      expect(amostra.tensaoV).toBeCloseTo(TENSAO_BASE_V + TENSAO_POR_MW * amostra.potenciaMw!, 6);
      expect(amostra.tensaoV! * amostra.correnteMa!).toBeCloseTo(amostra.potenciaMw!, 6);
    }
  });

  /** A energia acumulada começa em zero em cada teste e só cresce. */
  it('acumula energia por teste', () => {
    for (const teste of [MANHA, TARDE]) {
      expect(teste[0].energiaAcumuladaMwh).toBe(0);
      const valores = teste
        .map((a) => a.energiaAcumuladaMwh)
        .filter((v): v is number => v !== null);
      for (let i = 1; i < valores.length; i++)
        expect(valores[i]).toBeGreaterThanOrEqual(valores[i - 1]);
    }
    const esperada = integrarTrapezios(
      PONTOS.slice(horarioParaMinutos('17:21'), horarioParaMinutos('18:05') + 1).map(
        (p) => p.recuperadaMw,
      ),
      1 / 60,
    );
    expect(TARDE.at(-1)!.energiaAcumuladaMwh).toBeCloseTo(esperada, 6);
  });

  /** A última amostra é a leitura ao vivo da cadeia e da vibração. */
  it('termina na leitura ao vivo', () => {
    const ultima = TARDE.at(-1)!;

    expect(ultima.potenciaMw).toBe(212);
    expect(formatarNumero(ultima.tensaoV, 2)).toBe('4,82');
    expect(formatarNumero(ultima.correnteMa)).toBe('44');
    expect(ultima).toMatchObject({
      vibracaoRmsMs2: 3.2,
      temperaturaC: 31.4,
      piezosAtivos: 6,
      piezosTotal: 8,
      qualidade: 'valida',
    });
  });

  /** Qualidade pelo número de piezos; inválidas não têm tensão, corrente nem potência. */
  it('classifica a qualidade', () => {
    for (const amostra of AMOSTRAS) {
      if (amostra.qualidade === 'invalida') {
        expect(amostra.tensaoV).toBeNull();
        expect(amostra.correnteMa).toBeNull();
        expect(amostra.potenciaMw).toBeNull();
      } else if (amostra.piezosAtivos! <= 4) {
        expect(amostra.qualidade).toBe('suspeita');
      } else if (amostra.piezosAtivos === 5) {
        expect(amostra.qualidade).toBe('parcial');
      } else {
        expect(amostra.qualidade).toBe('valida');
      }
    }
    const qualidades = new Set(AMOSTRAS.map((a) => a.qualidade));
    expect(qualidades).toEqual(new Set(['valida', 'parcial', 'suspeita', 'invalida']));
  });

  /** IDs únicos, para servirem de chave na tabela. */
  it('dá um id único por amostra', () => {
    expect(new Set(AMOSTRAS.map((a) => a.id)).size).toBe(AMOSTRAS.length);
  });
});
