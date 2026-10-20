/**
 * Testes de campo de exemplo do VERS.
 *
 * Cada trajeto da base vira um teste (decisão de 14/10/2026):
 * - semana de 28/09 a 04/10: 13 trajetos (#008 a #021, sem o #014), com a
 *   energia e as horas de cada dia repartidas entre os trajetos do dia por
 *   uma fração fixa, de modo que as somas batam com a tela Energia;
 * - hoje (05/10): o #022, de manhã, concluído, e o #023, à tarde, em
 *   andamento às 18:05 (os dois deslocamentos da curva; a Telemetria usa os
 *   dois);
 * - o #014, cancelado antes de iniciar, e o #024, planejado.
 *
 * Aqui ficam só os dados brutos (o que o operador e o backend registram);
 * o resumo de energia de cada teste é calculado em `montarTestesDaSemana`.
 */

import type {
  DiaMedido,
  Horario,
  ResultadoTeste,
  ResumoTeste,
  Terreno,
  TesteCampo,
} from '../tipos';
import { CONFIGURACOES_EXEMPLO } from './sistema';

/** Veículo, piezos e configuração da instalação em todos os testes de exemplo (e nos novos). */
export const RETRATO_INSTALACAO = {
  modeloVeiculo: 'Honda Civic',
  piezosAtivos: 6,
  versaoConfiguracao: 3,
  pesoVeiculoKg: 1449,
};

/** Trajeto de um dia da semana, como registrado (a energia sai da fração do dia). */
export interface TrajetoBase {
  codigo: string;
  data: string;
  inicio: Horario;
  /** Fração da energia e das horas do dia que coube a este trajeto. */
  fracao: number;
  terreno: Terreno;
  nome: string;
  local: string;
  estado: 'concluido' | 'falhou';
  resultado: ResultadoTeste | null;
  observacoes?: string;
  /** O pico do dia aconteceu neste trajeto. */
  picoDoDia?: boolean;
}

/** Trajetos de ida (manhã) e volta (tarde) e o passeio do fim de semana. */
const RODOVIA = {
  terreno: 'rodovia',
  nome: 'Rodovia · SP-348',
  local: 'SP-348 · Sorocaba → Itu',
} as const;
const CIDADE = {
  terreno: 'cidade',
  nome: 'Cidade · Centro Sorocaba',
  local: 'Centro · Sorocaba',
} as const;

export const TRAJETOS_SEMANA: TrajetoBase[] = [
  {
    codigo: '#008',
    data: '2026-09-28',
    inicio: '07:48',
    fracao: 0.5,
    ...RODOVIA,
    estado: 'concluido',
    resultado: 'satisfatorio',
  },
  {
    codigo: '#009',
    data: '2026-09-28',
    inicio: '17:30',
    fracao: 0.5,
    ...CIDADE,
    estado: 'concluido',
    resultado: 'satisfatorio',
    picoDoDia: true,
  },
  {
    codigo: '#010',
    data: '2026-09-29',
    inicio: '07:52',
    fracao: 0.55,
    ...RODOVIA,
    estado: 'concluido',
    resultado: 'inconclusivo',
    observacoes: 'Trânsito parado em parte do trecho; pouca vibração útil.',
  },
  {
    codigo: '#011',
    data: '2026-09-29',
    inicio: '17:40',
    fracao: 0.45,
    ...CIDADE,
    estado: 'concluido',
    resultado: 'satisfatorio',
    picoDoDia: true,
  },
  {
    codigo: '#012',
    data: '2026-09-30',
    inicio: '07:45',
    fracao: 0.5,
    ...RODOVIA,
    estado: 'concluido',
    resultado: 'satisfatorio',
  },
  {
    codigo: '#013',
    data: '2026-09-30',
    inicio: '17:25',
    fracao: 0.5,
    ...CIDADE,
    estado: 'concluido',
    resultado: 'satisfatorio',
    picoDoDia: true,
  },
  {
    codigo: '#015',
    data: '2026-10-01',
    inicio: '07:50',
    fracao: 0.45,
    ...RODOVIA,
    estado: 'concluido',
    resultado: 'satisfatorio',
  },
  {
    codigo: '#016',
    data: '2026-10-01',
    inicio: '17:20',
    fracao: 0.55,
    ...CIDADE,
    estado: 'concluido',
    resultado: 'satisfatorio',
    picoDoDia: true,
  },
  {
    codigo: '#017',
    data: '2026-10-02',
    inicio: '07:55',
    fracao: 0.5,
    ...RODOVIA,
    estado: 'falhou',
    resultado: null,
    observacoes: 'Falha de fixação do piezo 7: leituras perdidas (lacunas de 4% no dia).',
  },
  {
    codigo: '#018',
    data: '2026-10-02',
    inicio: '17:35',
    fracao: 0.5,
    ...CIDADE,
    estado: 'concluido',
    resultado: 'satisfatorio',
    picoDoDia: true,
  },
  {
    codigo: '#019',
    data: '2026-10-03',
    inicio: '09:10',
    fracao: 0.6,
    terreno: 'fora-estrada',
    nome: 'Fora de estrada · Trilha do Ipanema',
    local: 'Floresta Nacional de Ipanema · Iperó',
    estado: 'concluido',
    resultado: 'satisfatorio',
    picoDoDia: true,
  },
  {
    codigo: '#020',
    data: '2026-10-03',
    inicio: '15:40',
    fracao: 0.4,
    terreno: 'misto',
    nome: 'Misto · Estrada dos Romeiros',
    local: 'SP-312 · Itu',
    estado: 'concluido',
    resultado: 'satisfatorio',
  },
  {
    codigo: '#021',
    data: '2026-10-04',
    inicio: '10:00',
    fracao: 1,
    terreno: 'misto',
    nome: 'Misto · Passeio em Itu',
    local: 'Centro histórico · Itu',
    estado: 'concluido',
    resultado: 'insatisfatorio',
    observacoes: 'Muitas paradas; vibração baixa na maior parte do trajeto.',
    picoDoDia: true,
  },
];

/** Os dois testes de hoje, os deslocamentos da curva do dia. */
export const TESTES_HOJE: TesteCampo[] = [
  {
    id: 'teste-022',
    codigo: '#022',
    ...RODOVIA,
    estado: 'concluido',
    inicio: '2026-10-05T07:50:00-03:00',
    fim: '2026-10-05T08:35:00-03:00',
    criadoEm: '2026-10-05T07:45:00-03:00',
    resultado: 'satisfatorio',
    ...RETRATO_INSTALACAO,
    velocidadeMediaKmh: 81,
    rotacaoMediaRpm: 2200,
    inclinacaoGraus: 0.6,
    observacoes: null,
  },
  {
    id: 'teste-023',
    codigo: '#023',
    ...CIDADE,
    estado: 'em-andamento',
    inicio: '2026-10-05T17:21:00-03:00',
    fim: null,
    criadoEm: '2026-10-05T17:15:00-03:00',
    resultado: null,
    ...RETRATO_INSTALACAO,
    velocidadeMediaKmh: null,
    rotacaoMediaRpm: null,
    inclinacaoGraus: null,
    observacoes: null,
  },
];

/** Teste planejado para a noite de 30/09 e cancelado antes de iniciar. */
export const TESTE_CANCELADO: TesteCampo = {
  id: 'teste-014',
  codigo: '#014',
  nome: 'Rodovia · Castelo Branco',
  estado: 'cancelado',
  terreno: 'rodovia',
  local: 'SP-280 · Sorocaba → São Paulo',
  inicio: null,
  fim: null,
  criadoEm: '2026-09-30T18:40:00-03:00',
  resultado: null,
  ...RETRATO_INSTALACAO,
  velocidadeMediaKmh: null,
  rotacaoMediaRpm: null,
  inclinacaoGraus: null,
  observacoes: 'Cancelado antes de iniciar: chuva forte.',
};

/** Próximo teste, planejado pouco antes de agora. */
export const TESTE_PLANEJADO: TesteCampo = {
  id: 'teste-024',
  codigo: '#024',
  nome: 'Fora de estrada · Subida de serra',
  estado: 'planejado',
  terreno: 'fora-estrada',
  local: 'Serra de São Francisco · Votorantim',
  inicio: null,
  fim: null,
  criadoEm: '2026-10-05T18:00:00-03:00',
  resultado: null,
  ...RETRATO_INSTALACAO,
  velocidadeMediaKmh: null,
  rotacaoMediaRpm: null,
  inclinacaoGraus: null,
  observacoes: 'Planejado para amanhã cedo.',
};

/**
 * Dados que o operador informa ao finalizar, por terreno: velocidade média
 * (km/h), rotação média (rpm) e inclinação média (graus).
 */
const FINALIZACAO_POR_TERRENO: Record<
  Terreno,
  { velocidade: number; rotacao: number; inclinacao: number }
> = {
  rodovia: { velocidade: 82, rotacao: 2250, inclinacao: 0.5 },
  cidade: { velocidade: 31, rotacao: 1750, inclinacao: 1.2 },
  'fora-estrada': { velocidade: 19, rotacao: 2400, inclinacao: 6.8 },
  misto: { velocidade: 46, rotacao: 1950, inclinacao: 2.4 },
  outro: { velocidade: 40, rotacao: 1900, inclinacao: 1 },
};

/**
 * Configuração da instalação vigente num instante: a versão mais nova
 * criada até ele. Os testes antes de 02/10 10:30 rodaram na v2 (8 piezos).
 */
function configuracaoVigente(instanteMs: number) {
  const vigentes = CONFIGURACOES_EXEMPLO.filter((c) => Date.parse(c.criadaEm) <= instanteMs);
  return vigentes.sort((a, b) => b.versao - a.versao)[0] ?? CONFIGURACOES_EXEMPLO[0];
}

/** Fração do pico do dia atribuída aos trajetos em que ele não aconteceu. */
const FRACAO_PICO_OUTROS = 0.88;

/** Amostras do ESP32 por minuto (uma a cada 10 s). */
const AMOSTRAS_POR_MINUTO = 6;

/** Fuso de Brasília em minutos (os horários do exemplo são todos em −03:00). */
const FUSO_MINUTOS = -180;

/** Escreve um instante em ISO com o fuso de Brasília (mesma regra de `formatarIsoComFuso`). */
function isoBrasilia(instanteMs: number): string {
  return `${new Date(instanteMs + FUSO_MINUTOS * 60_000).toISOString().slice(0, 19)}-03:00`;
}

/**
 * Monta os testes da semana e os seus resumos de energia.
 *
 * Para cada trajeto: a duração é a fração das horas do dia (em segundos
 * inteiros), a energia é a fração da energia do dia (P1) e a potência média
 * é a energia sobre a duração. O pico do dia fica no trajeto marcado; os
 * demais recebem 88% dele. A falha de 02/10 deixa o resumo parcial.
 * Velocidade, rotação e inclinação variam um pouco em torno do terreno.
 */
export function montarTestesDaSemana(semana: readonly DiaMedido[]): {
  testes: TesteCampo[];
  resumos: Map<string, ResumoTeste>;
} {
  const dias = new Map(semana.map((dia) => [dia.data, dia]));
  const testes: TesteCampo[] = [];
  const resumos = new Map<string, ResumoTeste>();

  TRAJETOS_SEMANA.forEach((trajeto, indice) => {
    const dia = dias.get(trajeto.data);
    if (!dia) return;
    const segundos = Math.round(dia.horasMovimento * trajeto.fracao * 3600);
    const inicioMs = Date.parse(`${trajeto.data}T${trajeto.inicio}:00-03:00`);
    const energiaMwh = dia.energia.p1 * trajeto.fracao;
    const variacao = (indice % 3) - 1;
    const base = FINALIZACAO_POR_TERRENO[trajeto.terreno];
    const id = `teste-${trajeto.codigo.slice(1)}`;
    const configuracao = configuracaoVigente(inicioMs);

    testes.push({
      id,
      codigo: trajeto.codigo,
      nome: trajeto.nome,
      estado: trajeto.estado,
      terreno: trajeto.terreno,
      local: trajeto.local,
      inicio: isoBrasilia(inicioMs),
      fim: isoBrasilia(inicioMs + segundos * 1000),
      criadoEm: isoBrasilia(inicioMs - 5 * 60_000),
      resultado: trajeto.resultado,
      ...RETRATO_INSTALACAO,
      versaoConfiguracao: configuracao.versao,
      piezosAtivos: configuracao.piezosAtivos,
      velocidadeMediaKmh: base.velocidade + 2 * variacao,
      rotacaoMediaRpm: base.rotacao + 50 * variacao,
      inclinacaoGraus: Math.round((base.inclinacao + 0.3 * variacao) * 10) / 10,
      observacoes: trajeto.observacoes ?? null,
    });
    resumos.set(id, {
      testeId: id,
      energiaRecuperadaMwh: energiaMwh,
      potenciaMediaMw: segundos > 0 ? energiaMwh / (segundos / 3600) : null,
      picoPotenciaMw: trajeto.picoDoDia
        ? dia.pico.potenciaMw
        : Math.round(dia.pico.potenciaMw * FRACAO_PICO_OUTROS),
      amostras: Math.round((segundos / 60) * AMOSTRAS_POR_MINUTO),
      qualidade: trajeto.estado === 'falhou' ? 'parcial' : 'boa',
    });
  });

  return { testes, resumos };
}
