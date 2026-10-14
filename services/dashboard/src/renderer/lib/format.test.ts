/**
 * Testes dos formatadores pt-BR usados nas telas do app desktop.
 *
 * Cobrem os casos de borda definidos no roadmap: zero, arredondamento,
 * separador de milhar com ponto, vírgula decimal, valores ausentes e a troca
 * automática de mWh para Wh.
 */

import { describe, expect, it } from 'vitest';
import {
  formatarEnergia,
  formatarMedida,
  formatarNumero,
  formatarPercentual,
  formatarPotencia,
  formatarTempoDecorrido,
  formatarVariacao,
} from './format';

describe('formatarTempoDecorrido', () => {
  /** Segundos, minutos, horas e dias, sempre arredondando para baixo. */
  it('escolhe a maior unidade inteira', () => {
    expect(formatarTempoDecorrido(0)).toBe('há 0 s');
    expect(formatarTempoDecorrido(3)).toBe('há 3 s');
    expect(formatarTempoDecorrido(59.9)).toBe('há 59 s');
    expect(formatarTempoDecorrido(60)).toBe('há 1 min');
    expect(formatarTempoDecorrido(3599)).toBe('há 59 min');
    expect(formatarTempoDecorrido(7200)).toBe('há 2 h');
    expect(formatarTempoDecorrido(86400)).toBe('há 1 dia');
    expect(formatarTempoDecorrido(3 * 86400)).toBe('há 3 dias');
  });

  /** Valores negativos (relógios dessincronizados) ou inválidos viram traço. */
  it('mostra traço para valor negativo ou inválido', () => {
    expect(formatarTempoDecorrido(-1)).toBe('–');
    expect(formatarTempoDecorrido(Number.NaN)).toBe('–');
  });
});

describe('formatarNumero', () => {
  /** Vírgula decimal e quantidade fixa de casas. */
  it('usa vírgula decimal com as casas pedidas', () => {
    expect(formatarNumero(3.2, 1)).toBe('3,2');
    expect(formatarNumero(42.8, 1)).toBe('42,8');
    expect(formatarNumero(4.8, 2)).toBe('4,80');
  });

  /** Sem casas informadas, arredonda para inteiro. */
  it('arredonda para inteiro por padrão', () => {
    expect(formatarNumero(186.4)).toBe('186');
    expect(formatarNumero(186.5)).toBe('187');
  });

  /** Milhar separado por ponto, inclusive com quatro dígitos. */
  it('separa milhar com ponto', () => {
    expect(formatarNumero(1920)).toBe('1.920');
    expect(formatarNumero(1234567.891, 2)).toBe('1.234.567,89');
  });

  /** Zero e zero negativo aparecem como zero, sem sinal. */
  it('formata zero sem sinal', () => {
    expect(formatarNumero(0)).toBe('0');
    expect(formatarNumero(-0.04, 1)).toBe('0,0');
  });

  /** Negativos usam o hífen comum como sinal. */
  it('mantém o sinal de valores negativos', () => {
    expect(formatarNumero(-12.34, 1)).toBe('-12,3');
  });

  /** Valores ausentes ou inválidos viram um traço, nunca "NaN". */
  it('mostra traço para valor ausente ou inválido', () => {
    expect(formatarNumero(null)).toBe('–');
    expect(formatarNumero(undefined)).toBe('–');
    expect(formatarNumero(Number.NaN)).toBe('–');
    expect(formatarNumero(Number.POSITIVE_INFINITY)).toBe('–');
  });
});

describe('formatarPotencia', () => {
  /** Potência em mW, inteira por padrão. */
  it('formata em mW inteiro', () => {
    expect(formatarPotencia(211.6)).toEqual({ valor: '212', unidade: 'mW' });
    expect(formatarPotencia(0)).toEqual({ valor: '0', unidade: 'mW' });
  });

  /** Casas decimais opcionais e milhar com ponto. */
  it('aceita casas decimais e separa milhar', () => {
    expect(formatarPotencia(1234.56, 1)).toEqual({ valor: '1.234,6', unidade: 'mW' });
  });
});

describe('formatarEnergia', () => {
  /** Abaixo de 1 Wh a energia fica em mWh inteiro. */
  it('usa mWh abaixo de 1.000 mWh', () => {
    expect(formatarEnergia(292)).toEqual({ valor: '292', unidade: 'mWh' });
    expect(formatarEnergia(0)).toEqual({ valor: '0', unidade: 'mWh' });
  });

  /** A partir de 1.000 mWh passa para Wh com duas casas. */
  it('troca para Wh a partir de 1.000 mWh', () => {
    expect(formatarEnergia(1920)).toEqual({ valor: '1,92', unidade: 'Wh' });
    expect(formatarEnergia(1000)).toEqual({ valor: '1,00', unidade: 'Wh' });
  });

  /** Valores que arredondariam para 1.000 mWh também passam para Wh. */
  it('não mostra "1.000 mWh" por arredondamento', () => {
    expect(formatarEnergia(999.6)).toEqual({ valor: '1,00', unidade: 'Wh' });
  });

  /** É possível fixar a unidade, por exemplo em tabelas de uma só unidade. */
  it('permite fixar a unidade', () => {
    expect(formatarEnergia(1920, { unidade: 'mWh' })).toEqual({ valor: '1.920', unidade: 'mWh' });
    expect(formatarEnergia(292, { unidade: 'Wh' })).toEqual({ valor: '0,29', unidade: 'Wh' });
  });
});

describe('formatarPercentual', () => {
  /** Percentual com uma casa por padrão, como no DESIGN.md. */
  it('usa uma casa decimal por padrão', () => {
    expect(formatarPercentual(53.5)).toEqual({ valor: '53,5', unidade: '%' });
    expect(formatarPercentual(68, 0)).toEqual({ valor: '68', unidade: '%' });
    expect(formatarPercentual(0)).toEqual({ valor: '0,0', unidade: '%' });
  });
});

describe('formatarVariacao', () => {
  /** Variações mostram sinal explícito, exceto quando são zero. */
  it('mostra sinal de mais e de menos', () => {
    expect(formatarVariacao(6.6)).toBe('+6,6%');
    expect(formatarVariacao(-3.24)).toBe('-3,2%');
    expect(formatarVariacao(0)).toBe('0,0%');
    expect(formatarVariacao(-0.01)).toBe('0,0%');
  });

  /** Variação ausente vira traço. */
  it('mostra traço para valor ausente', () => {
    expect(formatarVariacao(null)).toBe('–');
  });
});

describe('formatarMedida', () => {
  /** Junta valor e unidade com espaço; percentual fica colado. */
  it('junta valor e unidade', () => {
    expect(formatarMedida({ valor: '212', unidade: 'mW' })).toBe('212 mW');
    expect(formatarMedida({ valor: '1,92', unidade: 'Wh' })).toBe('1,92 Wh');
    expect(formatarMedida({ valor: '53,5', unidade: '%' })).toBe('53,5%');
  });

  /** Valor ausente não leva unidade. */
  it('omite a unidade quando o valor é traço', () => {
    expect(formatarMedida(formatarPotencia(null))).toBe('–');
  });
});
