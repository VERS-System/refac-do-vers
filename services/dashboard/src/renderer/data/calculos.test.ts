/**
 * Testes dos cálculos de energia, eficiência e resumo de períodos.
 *
 * Usam dados pequenos e conhecidos; os números aprovados da semana de
 * exemplo são conferidos em `repositorioMock.test.ts`.
 */

import { describe, expect, it } from 'vitest';
import {
  descreverVeiculo,
  eficiencia,
  enriquecerCadeia,
  horarioParaMinutos,
  integrarTrapezios,
  minutosParaHorario,
  perdaPercentual,
  resumirCurva,
  resumirDia,
  resumirDias,
  resumirDispositivo,
  variacaoPercentual,
} from './calculos';
import type { DiaMedido, PontoCurva } from './tipos';

/** Dia de teste com números redondos. */
function dia(data: string, p1: number, horas: number, pico: number, lacunas = 0): DiaMedido {
  return {
    data,
    horasMovimento: horas,
    pico: { potenciaMw: pico, horario: '12:00' },
    energia: { p1, p2: p1 * 0.9, p3: p1 * 0.8, p4: p1 * 0.5 },
    lacunasPercentual: lacunas,
  };
}

describe('eficiencia e perdaPercentual', () => {
  /** Saída sobre entrada, em percentual. */
  it('calcula saída sobre entrada', () => {
    expect(eficiencia(53.5, 100)).toBeCloseTo(53.5);
    expect(perdaPercentual(87.1, 100)).toBeCloseTo(12.9);
  });

  /** Sem entrada não há eficiência definida. */
  it('devolve nulo sem entrada', () => {
    expect(eficiencia(10, 0)).toBeNull();
    expect(perdaPercentual(10, 0)).toBeNull();
  });
});

describe('variacaoPercentual', () => {
  /** Variação relativa à referência. */
  it('calcula a variação relativa', () => {
    expect(variacaoPercentual(110, 100)).toBeCloseTo(10);
    expect(variacaoPercentual(90, 100)).toBeCloseTo(-10);
  });

  /** Referência zero não tem variação definida. */
  it('devolve nulo com referência zero', () => {
    expect(variacaoPercentual(10, 0)).toBeNull();
  });
});

describe('integrarTrapezios', () => {
  /** Potência constante de 60 mW por 1 h (61 pontos de 1 min) dá 60 mWh. */
  it('integra potência constante', () => {
    expect(integrarTrapezios(Array(61).fill(60), 1 / 60)).toBeCloseTo(60);
  });

  /** Triângulo 0 → 120 → 0 em 2 h dá 120 mWh. */
  it('integra um triângulo', () => {
    expect(integrarTrapezios([0, 120, 0], 1)).toBeCloseTo(120);
  });

  /** Menos de dois pontos não formam área. */
  it('devolve zero com menos de dois pontos', () => {
    expect(integrarTrapezios([], 1)).toBe(0);
    expect(integrarTrapezios([5], 1)).toBe(0);
  });
});

describe('horários', () => {
  /** Converte entre minutos do dia e "HH:MM". */
  it('converte minutos e horários', () => {
    expect(minutosParaHorario(0)).toBe('00:00');
    expect(minutosParaHorario(17 * 60 + 42)).toBe('17:42');
    expect(horarioParaMinutos('18:05')).toBe(1085);
  });
});

describe('resumirDia', () => {
  /** Potência média é energia sobre horas; eficiência é P4 sobre P1. */
  it('deriva potência média e eficiência', () => {
    const resumo = resumirDia(dia('2026-09-28', 300, 1.5, 400));

    expect(resumo.potenciaMediaMw).toBeCloseTo(200);
    expect(resumo.eficienciaPercentual).toBeCloseTo(50);
  });

  /** Dia parado não tem potência média. */
  it('não calcula potência média sem movimento', () => {
    expect(resumirDia(dia('2026-09-28', 0, 0, 0)).potenciaMediaMw).toBeNull();
  });
});

describe('resumirDias', () => {
  const dias = [dia('2026-09-28', 300, 1.5, 400), dia('2026-09-29', 100, 0.5, 450, 4)];

  /** Soma energias e horas e usa a primeira e a última data. */
  it('soma energias e horas no intervalo', () => {
    const resumo = resumirDias('semana', dias);

    expect(resumo.inicio).toBe('2026-09-28');
    expect(resumo.fim).toBe('2026-09-29');
    expect(resumo.diasComDados).toBe(2);
    expect(resumo.horasMovimento).toBeCloseTo(2);
    expect(resumo.energiaRecuperadaMwh).toBeCloseTo(400);
    expect(resumo.porPonto?.p4).toBeCloseTo(200);
  });

  /** Potência média ponderada pelo tempo (energia total / horas totais). */
  it('calcula a potência média pelo total', () => {
    expect(resumirDias('semana', dias).potenciaMediaMw).toBeCloseTo(200);
  });

  /** O pico é o maior dos dias, com a data e o horário dele. */
  it('escolhe o maior pico', () => {
    expect(resumirDias('semana', dias).pico).toEqual({ potenciaMw: 450, data: '2026-09-29', horario: '12:00' });
  });

  /** Eficiência e perdas por estágio a partir das energias totais. */
  it('calcula eficiência e perdas por estágio', () => {
    const resumo = resumirDias('semana', dias);

    expect(resumo.eficienciaPercentual).toBeCloseTo(50);
    expect(resumo.perdas?.regulador).toBeCloseTo(10);
    expect(resumo.perdas?.bateria).toBeCloseTo(11.11, 1);
    expect(resumo.perdas?.celular).toBeCloseTo(37.5);
  });

  /** Conta os dias com lacunas de dados. */
  it('conta os dias com lacunas', () => {
    expect(resumirDias('semana', dias).diasComLacunas).toBe(1);
  });

  /** Sem dias, o resumo fica zerado e sem valores derivados. */
  it('lida com lista vazia', () => {
    const resumo = resumirDias('mes', []);

    expect(resumo.energiaRecuperadaMwh).toBe(0);
    expect(resumo.potenciaMediaMw).toBeNull();
    expect(resumo.pico).toBeNull();
    expect(resumo.eficienciaPercentual).toBeNull();
  });
});

describe('resumirCurva', () => {
  /** 0 → 120 → 120 → 0 mW em pontos de 1 min. */
  const pontos: PontoCurva[] = [
    { horario: '10:00', recuperadaMw: 0, consumoNoMw: 50 },
    { horario: '10:01', recuperadaMw: 120, consumoNoMw: 50 },
    { horario: '10:02', recuperadaMw: 120, consumoNoMw: 50 },
    { horario: '10:03', recuperadaMw: 0, consumoNoMw: 50 },
  ];

  /** Energia por trapézios, minutos em movimento e pico com horário. */
  it('resume energia, movimento e pico da curva', () => {
    const resumo = resumirCurva('hora', '2026-10-05', pontos, 1);

    expect(resumo.energiaRecuperadaMwh).toBeCloseTo(4);
    expect(resumo.horasMovimento).toBeCloseTo(2 / 60);
    expect(resumo.potenciaMediaMw).toBeCloseTo(120);
    expect(resumo.pico).toEqual({ potenciaMw: 120, data: '2026-10-05', horario: '10:01' });
  });

  /** A curva só mede P1: não há energia por ponto nem eficiência. */
  it('não inventa energia por ponto nem eficiência', () => {
    const resumo = resumirCurva('hora', '2026-10-05', pontos, 1);

    expect(resumo.porPonto).toBeUndefined();
    expect(resumo.eficienciaPercentual).toBeNull();
    expect(resumo.perdas).toBeNull();
  });
});

describe('enriquecerCadeia', () => {
  /** Eficiência de cada estágio sobre o anterior e ponta a ponta. */
  it('calcula eficiências por estágio e ponta a ponta', () => {
    const cadeia = enriquecerCadeia('2026-10-05T18:05:00-03:00', [
      { ponto: 1, nome: 'A', descricao: '', tensaoV: 5, correnteMa: 40, potenciaMw: 200 },
      { ponto: 2, nome: 'B', descricao: '', tensaoV: 3.3, correnteMa: 50, potenciaMw: 160 },
      { ponto: 3, nome: 'C', descricao: '', tensaoV: 4, correnteMa: 30, potenciaMw: 120 },
      { ponto: 4, nome: 'D', descricao: '', tensaoV: 5, correnteMa: 20, potenciaMw: 100 },
    ]);

    expect(cadeia.pontos.map((p) => p.eficienciaEstagioPercentual)).toEqual([null, 80, 75, expect.closeTo(83.33, 1)]);
    expect(cadeia.eficienciaPontaAPontaPercentual).toBeCloseTo(50);
  });
});

describe('resumirDispositivo e descreverVeiculo', () => {
  /** Nome, status e tempo desde a última mensagem. */
  it('monta o resumo do dispositivo', () => {
    const resumo = resumirDispositivo(
      {
        id: 'VERS-01',
        plataforma: 'ESP32',
        firmware: '0.4.2',
        online: true,
        ultimoContato: '2026-10-05T18:04:57-03:00',
        protocolo: 'MQTT',
      },
      new Date('2026-10-05T18:05:00-03:00'),
    );

    expect(resumo).toEqual({ nome: 'ESP32 · VERS-01', online: true, firmware: '0.4.2', vistoHa: 'há 3 s', protocolo: 'MQTT' });
  });

  /** Descrição curta usada no subtítulo das telas. */
  it('descreve o veículo', () => {
    expect(descreverVeiculo({ id: 'v1', fabricante: 'Honda', modelo: 'Civic', ano: 2026, placa: 'ABC1D23' })).toBe(
      'Honda Civic 2026 · ABC1D23',
    );
  });
});
