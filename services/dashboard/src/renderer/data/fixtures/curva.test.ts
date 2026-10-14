/**
 * Testes do gerador determinístico da curva de potência do dia de exemplo.
 */

import { describe, expect, it } from 'vitest';
import { horarioParaMinutos, integrarTrapezios } from '../calculos';
import { gerarCurvaDoDia, type ParametrosCurva } from './curva';

const PARAMETROS: ParametrosCurva = {
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
  semente: 42,
};

describe('gerarCurvaDoDia', () => {
  /** Um ponto por minuto, de 00:00 até o horário final, inclusive. */
  it('gera um ponto por minuto até o horário final', () => {
    const pontos = gerarCurvaDoDia(PARAMETROS);

    expect(pontos).toHaveLength(horarioParaMinutos('18:05') + 1);
    expect(pontos[0].horario).toBe('00:00');
    expect(pontos.at(-1)?.horario).toBe('18:05');
  });

  /** A energia integrada por trapézios bate com o alvo. */
  it('atinge a energia alvo', () => {
    const pontos = gerarCurvaDoDia(PARAMETROS);

    expect(integrarTrapezios(pontos.map((p) => p.recuperadaMw), 1 / 60)).toBeCloseTo(292, 6);
  });

  /** Só há potência dentro dos deslocamentos (90 minutos no total). */
  it('só gera potência durante os deslocamentos', () => {
    const pontos = gerarCurvaDoDia(PARAMETROS);
    const emMovimento = pontos.filter((p) => p.recuperadaMw > 0);

    expect(emMovimento).toHaveLength(90);
    expect(pontos.find((p) => p.horario === '07:49')?.recuperadaMw).toBe(0);
    expect(pontos.find((p) => p.horario === '07:50')?.recuperadaMw).toBeGreaterThan(0);
  });

  /** Pontos fixos são respeitados e o pico é único. */
  it('respeita os pontos fixos e mantém o pico único', () => {
    const pontos = gerarCurvaDoDia(PARAMETROS);
    const maximo = Math.max(...pontos.map((p) => p.recuperadaMw));

    expect(maximo).toBe(386);
    expect(pontos.filter((p) => p.recuperadaMw === maximo).map((p) => p.horario)).toEqual(['17:42']);
    expect(pontos.at(-1)?.recuperadaMw).toBe(212);
  });

  /** A mesma semente gera sempre a mesma curva (testes e prints estáveis). */
  it('é determinística', () => {
    expect(gerarCurvaDoDia(PARAMETROS)).toEqual(gerarCurvaDoDia(PARAMETROS));
  });

  /** O consumo do nó existe o dia inteiro, sempre positivo. */
  it('inclui o consumo do nó em todos os pontos', () => {
    expect(gerarCurvaDoDia(PARAMETROS).every((p) => p.consumoNoMw > 0)).toBe(true);
  });
});
