/**
 * Testes dos cálculos de energia, eficiência e resumo de períodos.
 *
 * Usam dados pequenos e conhecidos; os números aprovados da semana de
 * exemplo são conferidos em `repositorioMock.test.ts`.
 */

import { describe, expect, it } from 'vitest';
import {
  classificarCorrelacao,
  correlacaoPearson,
  descreverVeiculo,
  eficiencia,
  emailValido,
  enriquecerCadeia,
  estadoConexao,
  formatarIsoComFuso,
  horarioParaMinutos,
  integrarTrapezios,
  minutosParaHorario,
  normalizarChassi,
  normalizarPlaca,
  perdaPercentual,
  recortarUltimosMinutos,
  regressaoLinear,
  requisitosSenha,
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
    expect(resumirDias('semana', dias).pico).toEqual({
      potenciaMw: 450,
      data: '2026-09-29',
      horario: '12:00',
    });
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

    expect(cadeia.pontos.map((p) => p.eficienciaEstagioPercentual)).toEqual([
      null,
      80,
      75,
      expect.closeTo(83.33, 1),
    ]);
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

    expect(resumo).toEqual({
      nome: 'ESP32 · VERS-01',
      online: true,
      firmware: '0.4.2',
      vistoHa: 'há 3 s',
      protocolo: 'MQTT',
    });
  });

  /** Descrição curta usada no subtítulo das telas. */
  it('descreve o veículo', () => {
    expect(
      descreverVeiculo({ fabricante: 'Honda', modelo: 'Civic', ano: 2026, placa: 'ABC1D23' }),
    ).toBe('Honda Civic 2026 · ABC1D23');
  });

  /** Fabricante, modelo e ano são opcionais no contrato; a placa sempre aparece. */
  it('descreve o veículo com dados faltando', () => {
    expect(
      descreverVeiculo({ fabricante: null, modelo: 'Strada', ano: null, placa: 'DEF4G56' }),
    ).toBe('Strada · DEF4G56');
    expect(descreverVeiculo({ fabricante: null, modelo: null, ano: null, placa: 'DEF4G56' })).toBe(
      'DEF4G56',
    );
  });
});

describe('normalizarPlaca', () => {
  /** Mercosul (ABC1D23) ou antiga (ABC1234), em maiúsculas e sem hífen. */
  it('aceita os dois formatos', () => {
    expect(normalizarPlaca('abc1d23')).toBe('ABC1D23');
    expect(normalizarPlaca(' ABC-1234 ')).toBe('ABC1234');
  });

  /** Qualquer outra coisa não é placa. */
  it('recusa o que não é placa', () => {
    expect(normalizarPlaca('AB12345')).toBeNull();
    expect(normalizarPlaca('ABC12D3')).toBeNull();
    expect(normalizarPlaca('')).toBeNull();
  });
});

describe('recortarUltimosMinutos', () => {
  /** Curva de 00:00 a 00:10, um ponto por minuto. */
  const pontos: PontoCurva[] = Array.from({ length: 11 }, (_, i) => ({
    horario: minutosParaHorario(i),
    recuperadaMw: i * 10,
    consumoNoMw: 45,
  }));

  /** A janela termina no último ponto e inclui o ponto do início. */
  it('mantém os pontos da janela final', () => {
    const recorte = recortarUltimosMinutos(pontos, 5);

    expect(recorte.map((p) => p.horario)).toEqual([
      '00:05',
      '00:06',
      '00:07',
      '00:08',
      '00:09',
      '00:10',
    ]);
  });

  /** Janela maior que a curva devolve a curva inteira. */
  it('devolve tudo quando a janela é maior que a curva', () => {
    expect(recortarUltimosMinutos(pontos, 60)).toHaveLength(11);
  });

  /** Curva vazia continua vazia. */
  it('aceita curva vazia', () => {
    expect(recortarUltimosMinutos([], 60)).toEqual([]);
  });
});

describe('correlacaoPearson', () => {
  /** Pontos sobre uma reta crescente: correlação 1. */
  it('dá 1 numa relação linear crescente', () => {
    expect(
      correlacaoPearson([
        { x: 1, y: 3 },
        { x: 2, y: 5 },
        { x: 4, y: 9 },
      ]),
    ).toBeCloseTo(1);
  });

  /** Reta decrescente: correlação -1. */
  it('dá -1 numa relação linear decrescente', () => {
    expect(
      correlacaoPearson([
        { x: 1, y: 9 },
        { x: 2, y: 7 },
        { x: 3, y: 5 },
      ]),
    ).toBeCloseTo(-1);
  });

  /** Valor conhecido: x = 1..5, y = 2, 4, 5, 4, 5 dá r = 0,7746. */
  it('calcula um caso conhecido', () => {
    const pares = [2, 4, 5, 4, 5].map((y, i) => ({ x: i + 1, y }));

    expect(correlacaoPearson(pares)).toBeCloseTo(0.7746, 4);
  });

  /** Menos de dois pares ou um eixo constante não têm correlação definida. */
  it('devolve null quando não há como calcular', () => {
    expect(correlacaoPearson([])).toBeNull();
    expect(correlacaoPearson([{ x: 1, y: 1 }])).toBeNull();
    expect(
      correlacaoPearson([
        { x: 1, y: 1 },
        { x: 1, y: 5 },
      ]),
    ).toBeNull();
  });
});

describe('regressaoLinear', () => {
  /** Reta exata y = 2x + 1. */
  it('acha inclinação e intercepto', () => {
    const reta = regressaoLinear([
      { x: 0, y: 1 },
      { x: 1, y: 3 },
      { x: 3, y: 7 },
    ]);

    expect(reta?.inclinacao).toBeCloseTo(2);
    expect(reta?.intercepto).toBeCloseTo(1);
  });

  /** Sem variação em x a reta não é definida. */
  it('devolve null sem variação em x', () => {
    expect(
      regressaoLinear([
        { x: 2, y: 1 },
        { x: 2, y: 3 },
      ]),
    ).toBeNull();
    expect(regressaoLinear([])).toBeNull();
  });
});

describe('classificarCorrelacao', () => {
  /** Faixas pelo valor absoluto: alta a partir de 0,7, moderada a partir de 0,4. */
  it('classifica pela intensidade', () => {
    expect(classificarCorrelacao(0.82)).toBe('alta');
    expect(classificarCorrelacao(-0.9)).toBe('alta');
    expect(classificarCorrelacao(0.7)).toBe('alta');
    expect(classificarCorrelacao(0.5)).toBe('moderada');
    expect(classificarCorrelacao(0.2)).toBe('baixa');
  });

  /** Sem correlação calculada, sem classificação. */
  it('devolve null sem correlação', () => {
    expect(classificarCorrelacao(null)).toBeNull();
  });
});

describe('estadoConexao', () => {
  const agora = 1_000_000;
  const base = { aoVivo: true, erro: false, buscando: false, atualizadoEm: agora - 5_000, agora };

  /** Recebendo dados em dia: conectado. */
  it('fica conectado com dados recentes', () => {
    expect(estadoConexao(base)).toBe('conectado');
  });

  /** O usuário pausou: pausado, mesmo com dados antigos ou erro. */
  it('respeita a pausa', () => {
    expect(estadoConexao({ ...base, aoVivo: false, erro: true })).toBe('pausado');
  });

  /** Falhou e está tentando de novo: reconectando; falhou e parou: offline. */
  it('distingue reconectando de offline', () => {
    expect(estadoConexao({ ...base, erro: true, buscando: true })).toBe('reconectando');
    expect(estadoConexao({ ...base, erro: true })).toBe('offline');
  });

  /** Sem atualização há mais de 30 s (três intervalos de 10 s): desatualizado. */
  it('marca dados antigos como desatualizados', () => {
    expect(estadoConexao({ ...base, atualizadoEm: agora - 30_001 })).toBe('desatualizado');
    expect(estadoConexao({ ...base, atualizadoEm: agora - 30_000 })).toBe('conectado');
  });

  /** Antes da primeira resposta não há o que estar desatualizado. */
  it('trata a primeira consulta como conectando', () => {
    expect(estadoConexao({ ...base, atualizadoEm: 0, buscando: true })).toBe('conectando');
  });
});

describe('formatarIsoComFuso', () => {
  /** Instante no formato ISO do dispositivo, com o fuso explícito. */
  it('escreve o instante no fuso pedido', () => {
    expect(formatarIsoComFuso(new Date('2026-10-05T21:05:00Z'), -180)).toBe(
      '2026-10-05T18:05:00-03:00',
    );
    expect(formatarIsoComFuso(new Date('2026-10-06T01:30:09Z'), -180)).toBe(
      '2026-10-05T22:30:09-03:00',
    );
  });
});

describe('requisitosSenha', () => {
  /** As quatro regras do RegisterDto, avaliadas uma a uma. */
  it('avalia cada regra do cadastro', () => {
    expect(requisitosSenha('')).toEqual({
      tamanho: false,
      maiuscula: false,
      especial: false,
      semEspacos: true,
    });
    expect(requisitosSenha('abc def')).toMatchObject({ semEspacos: false });
    expect(requisitosSenha('Segredo!1')).toEqual({
      tamanho: true,
      maiuscula: true,
      especial: true,
      semEspacos: true,
    });
    expect(requisitosSenha('segredo123')).toMatchObject({ maiuscula: false, especial: false });
  });
});

describe('emailValido', () => {
  /** Formato simples (algo@dominio.tld), com espaços nas pontas ignorados. */
  it('aceita só e-mails no formato usual', () => {
    expect(emailValido(' ana.silva@vers.com ')).toBe(true);
    expect(emailValido('ana.silva@vers')).toBe(false);
    expect(emailValido('ana silva@vers.com')).toBe(false);
    expect(emailValido('')).toBe(false);
  });
});

describe('normalizarChassi', () => {
  /** 17 caracteres do VIN, sem I, O e Q; espaços e minúsculas são normalizados. */
  it('aceita só chassis no padrão VIN', () => {
    expect(normalizarChassi(' 9bw zzz377vt004251 ')).toBe('9BWZZZ377VT004251');
    expect(normalizarChassi('9BWZZZ377VT00425')).toBeNull();
    expect(normalizarChassi('9BWZZZ377VT0042511')).toBeNull();
    expect(normalizarChassi('9BWZZZ377VTO04251')).toBeNull();
    expect(normalizarChassi('')).toBeNull();
  });
});
