/**
 * Testes do gerador das amostras de vibração × potência (dispersão da tela
 * Energia).
 */

import { describe, expect, it } from 'vitest';
import { classificarCorrelacao, correlacaoPearson } from '../calculos';
import type { DiaMedido, PontoCurva } from '../tipos';
import { gerarAmostrasVibracao, MW_POR_MS2, type ParametrosAmostrasVibracao } from './vibracao';

/** Dia anterior com o pico informado (só o pico importa para o gerador). */
function dia(data: string, picoMw: number): DiaMedido {
  return {
    data,
    horasMovimento: 1,
    pico: { potenciaMw: picoMw },
    energia: { p1: 200, p2: 170, p3: 150, p4: 100 },
    lacunasPercentual: 0,
  };
}

/** Curva de hoje: 20 minutos parados e 20 em movimento, de 100 a 290 mW. */
const PONTOS_HOJE: PontoCurva[] = Array.from({ length: 40 }, (_, i) => ({
  horario: `17:${String(i + 10).padStart(2, '0')}`,
  recuperadaMw: i < 20 ? 0 : 100 + (i - 20) * 10,
  consumoNoMw: 60,
}));

const PARAMETROS: ParametrosAmostrasVibracao = {
  diasAnteriores: [dia('2026-10-03', 398), dia('2026-10-04', 334)],
  horariosDiasAnteriores: ['07:55', '08:20', '17:35', '18:00'],
  hoje: { data: '2026-10-05', pontos: PONTOS_HOJE },
  amostrasHoje: 5,
  semente: 7,
};

describe('gerarAmostrasVibracao', () => {
  /** Mesma semente, mesmas amostras: prints e testes estáveis. */
  it('é determinístico', () => {
    expect(gerarAmostrasVibracao(PARAMETROS)).toEqual(gerarAmostrasVibracao(PARAMETROS));
  });

  /** Uma amostra por horário em cada dia anterior e as de hoje no fim, em ordem. */
  it('gera as amostras de cada dia em ordem', () => {
    const amostras = gerarAmostrasVibracao(PARAMETROS);

    expect(amostras).toHaveLength(2 * 4 + 5);
    expect(amostras.slice(0, 4).map((a) => `${a.data} ${a.horario}`)).toEqual([
      '2026-10-03 07:55',
      '2026-10-03 08:20',
      '2026-10-03 17:35',
      '2026-10-03 18:00',
    ]);
    expect(amostras.slice(-5).every((a) => a.data === '2026-10-05')).toBe(true);
  });

  /** Nos dias anteriores a potência fica abaixo do pico registrado do dia. */
  it('respeita o pico de cada dia anterior', () => {
    const amostras = gerarAmostrasVibracao(PARAMETROS);

    for (const amostra of amostras.filter((a) => a.data === '2026-10-04')) {
      expect(amostra.potenciaMw).toBeGreaterThan(0);
      expect(amostra.potenciaMw).toBeLessThanOrEqual(334);
    }
  });

  /** Hoje, as amostras caem em minutos em movimento e usam a potência da curva. */
  it('usa a curva de hoje', () => {
    const potenciaPorHorario = new Map(PONTOS_HOJE.map((p) => [p.horario, p.recuperadaMw]));
    const deHoje = gerarAmostrasVibracao(PARAMETROS).filter((a) => a.data === '2026-10-05');

    for (const amostra of deHoje) {
      expect(amostra.potenciaMw).toBeGreaterThan(0);
      expect(amostra.potenciaMw).toBe(Math.round(potenciaPorHorario.get(amostra.horario) ?? -1));
    }
    expect(deHoje.at(-1)?.horario).toBe('17:49');
  });

  /** A vibração acompanha a potência (≈ potência ÷ 66) com ruído: correlação alta, mas não perfeita. */
  it('produz vibração correlacionada com a potência', () => {
    const amostras = gerarAmostrasVibracao(PARAMETROS);
    const r = correlacaoPearson(amostras.map((a) => ({ x: a.vibracaoRmsMs2, y: a.potenciaMw })));

    expect(MW_POR_MS2).toBe(66);
    expect(amostras.every((a) => a.vibracaoRmsMs2 >= 0.2)).toBe(true);
    expect(classificarCorrelacao(r)).toBe('alta');
    expect(r).toBeLessThan(0.99);
  });
});
