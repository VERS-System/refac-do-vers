/**
 * Testes do gerador da tensão da bateria ao longo de hoje (card "Estado da
 * bateria" da tela Energia).
 */

import { describe, expect, it } from 'vitest';
import { formatarNumero } from '@/lib/format';
import { gerarCurvaDoDia } from './curva';
import { gerarTensaoBateria, tensaoEmRepouso, type ParametrosTensaoBateria } from './bateria';
import { CURVA_HOJE, ENERGIA_HOJE_P2_A_P4 } from './medicoes';

const PONTOS = gerarCurvaDoDia(CURVA_HOJE);
const PARAMETROS: ParametrosTensaoBateria = {
  pontos: PONTOS,
  energiaHoje: { p1: 292, ...ENERGIA_HOJE_P2_A_P4 },
  capacidadeMwh: 2200 * 3.7,
  cargaFinalPercentual: 68,
  intervaloMinutos: 5,
};

describe('tensaoEmRepouso', () => {
  /** Aproximação linear da tensão de circuito aberto de uma célula Li-ion. */
  it('sobe com a carga', () => {
    expect(tensaoEmRepouso(0)).toBeCloseTo(3.45);
    expect(tensaoEmRepouso(100)).toBeCloseTo(4.05);
    expect(tensaoEmRepouso(68)).toBeCloseTo(3.858);
  });
});

describe('gerarTensaoBateria', () => {
  /** Um ponto a cada 5 minutos, de 00:00 até o fim da curva (18:05). */
  it('amostra a cada 5 minutos até agora', () => {
    const serie = gerarTensaoBateria(PARAMETROS);

    expect(serie).toHaveLength(218);
    expect(serie[0].horario).toBe('00:00');
    expect(serie[1].horario).toBe('00:05');
    expect(serie.at(-1)?.horario).toBe('18:05');
  });

  /** Termina na carga e na tensão da leitura atual (68%, 3,92 V carregando). */
  it('termina na leitura atual', () => {
    const ultimo = gerarTensaoBateria(PARAMETROS).at(-1);

    expect(ultimo?.cargaPercentual).toBeCloseTo(68, 6);
    expect(formatarNumero(ultimo?.tensaoV, 2)).toBe('3,92');
  });

  /**
   * A bateria só carrega com o carro em movimento (entra P3, sai P4): a carga
   * nunca cai, e o ganho do dia é (P3 − P4) sobre a capacidade.
   */
  it('acumula a energia líquida do dia', () => {
    const serie = gerarTensaoBateria(PARAMETROS);
    const ganho = ((224.0 - 156.2) / (2200 * 3.7)) * 100;

    for (let i = 1; i < serie.length; i++) {
      expect(serie[i].cargaPercentual).toBeGreaterThanOrEqual(serie[i - 1].cargaPercentual);
    }
    expect(serie.at(-1)!.cargaPercentual - serie[0].cargaPercentual).toBeCloseTo(ganho, 1);
  });

  /** Parada, a tensão é a de repouso; carregando, fica 0,06 V acima. */
  it('sobe enquanto carrega', () => {
    const serie = gerarTensaoBateria(PARAMETROS);
    const madrugada = serie.find((p) => p.horario === '03:00')!;
    const emMovimento = serie.find((p) => p.horario === '08:00')!;

    expect(madrugada.tensaoV).toBeCloseTo(tensaoEmRepouso(madrugada.cargaPercentual), 6);
    expect(emMovimento.tensaoV).toBeCloseTo(tensaoEmRepouso(emMovimento.cargaPercentual) + 0.06, 6);
  });
});
