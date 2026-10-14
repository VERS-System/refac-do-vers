/**
 * Repositório de exemplo do VERS: atende a interface `RepositorioVers` com as
 * fixtures, fazendo os cálculos que o backend faria.
 *
 * Os resumos são calculados a partir das medições brutas em
 * `fixtures/medicoes.ts`, com as funções de `calculos.ts`. O relógio é fixo
 * em 05/10/2026 18:05 para que valores como "visto há 3 s" sejam estáveis.
 */

import type { Periodo } from '@/stores/periodo';
import {
  enriquecerCadeia,
  horarioParaMinutos,
  resumirCurva,
  resumirDia,
  resumirDias,
  variacaoPercentual,
} from './calculos';
import { gerarCurvaDoDia } from './fixtures/curva';
import {
  AGORA_EXEMPLO,
  CURVA_HOJE,
  ENERGIA_HOJE_P2_A_P4,
  ENERGIA_SEMANA_ANTERIOR_MWH,
  HOJE_EXEMPLO,
  SEMANA_EXEMPLO,
} from './fixtures/medicoes';
import {
  BATERIA_EXEMPLO,
  CADEIA_AO_VIVO,
  DISPOSITIVO_EXEMPLO,
  USUARIO_EXEMPLO,
  VEICULO_EXEMPLO,
  VIBRACAO_EXEMPLO,
} from './fixtures/sistema';
import type { RepositorioVers } from './repositorio';
import type { CurvaDoDia, DiaMedido, ResumoEnergia } from './tipos';

export interface OpcoesRepositorioMock {
  /** Relógio usado pelo repositório (padrão: o "agora" fixo do exemplo). */
  agora?: () => Date;
  /** Atraso artificial das respostas, para ver estados de carregamento. */
  latenciaMs?: number;
}

/** Minutos da janela do período Hora. */
const MINUTOS_HORA = 60;

/**
 * Monta o dia de hoje como medição bruta.
 *
 * P1 é a integral da curva (o nó piezoelétrico é medido continuamente); P2 a
 * P4 vêm das fixtures. Movimento e pico também saem da curva.
 */
function montarHoje(curva: CurvaDoDia): DiaMedido {
  const resumoCurva = resumirCurva('dia', curva.data, curva.pontos, curva.intervaloMinutos);
  return {
    data: curva.data,
    horasMovimento: resumoCurva.horasMovimento,
    pico: { potenciaMw: resumoCurva.pico?.potenciaMw ?? 0, horario: resumoCurva.pico?.horario },
    energia: { p1: resumoCurva.energiaRecuperadaMwh, ...ENERGIA_HOJE_P2_A_P4 },
    lacunasPercentual: 0,
  };
}

/**
 * Cria o repositório de exemplo.
 *
 * A curva e os dias são calculados uma vez na criação; cada método devolve
 * uma cópia nova (via `structuredClone`) para que nenhuma tela altere as
 * fixtures por acidente.
 */
export function criarRepositorioMock(opcoes: OpcoesRepositorioMock = {}): RepositorioVers {
  const agora = opcoes.agora ?? (() => new Date(AGORA_EXEMPLO));
  const latencia = opcoes.latenciaMs ?? 0;

  const curva: CurvaDoDia = {
    data: HOJE_EXEMPLO,
    intervaloMinutos: 1,
    intervaloAquisicaoS: 10,
    pontos: gerarCurvaDoDia(CURVA_HOJE),
  };
  const hoje = montarHoje(curva);
  const mediaDiariaSemana = SEMANA_EXEMPLO.reduce((soma, dia) => soma + dia.energia.p1, 0) / SEMANA_EXEMPLO.length;

  /** Devolve uma cópia do valor depois da latência configurada. */
  function responder<T>(valor: T): Promise<T> {
    const copia = structuredClone(valor);
    if (latencia <= 0) return Promise.resolve(copia);
    return new Promise((resolver) => setTimeout(() => resolver(copia), latencia));
  }

  /** Calcula o resumo de cada período a partir das medições. */
  function resumir(periodo: Periodo): ResumoEnergia {
    switch (periodo) {
      case 'hora': {
        const inicio = horarioParaMinutos(CURVA_HOJE.ate) - MINUTOS_HORA;
        return resumirCurva('hora', curva.data, curva.pontos.slice(inicio), curva.intervaloMinutos);
      }
      case 'dia': {
        const resumo = resumirDias('dia', [hoje]);
        const variacao = variacaoPercentual(hoje.energia.p1, mediaDiariaSemana);
        return variacao === null ? resumo : { ...resumo, comparacao: { referencia: 'media-semanal', variacaoPercentual: variacao } };
      }
      case 'semana': {
        const resumo = resumirDias('semana', SEMANA_EXEMPLO);
        const variacao = variacaoPercentual(resumo.energiaRecuperadaMwh, ENERGIA_SEMANA_ANTERIOR_MWH);
        return variacao === null ? resumo : { ...resumo, comparacao: { referencia: 'semana-anterior', variacaoPercentual: variacao } };
      }
      case 'mes': {
        const mesAtual = HOJE_EXEMPLO.slice(0, 7);
        const dias = [...SEMANA_EXEMPLO.filter((dia) => dia.data.startsWith(mesAtual)), hoje];
        return resumirDias('mes', dias);
      }
    }
  }

  return {
    agora,
    obterResumoEnergia: (periodo) => responder(resumir(periodo)),
    obterDiasDaSemana: () => responder(SEMANA_EXEMPLO.map(resumirDia)),
    obterCurvaDoDia: () => responder(curva),
    obterCadeiaAoVivo: () => responder(enriquecerCadeia(AGORA_EXEMPLO, CADEIA_AO_VIVO)),
    obterBateria: () => responder(BATERIA_EXEMPLO),
    obterVibracao: () => responder(VIBRACAO_EXEMPLO),
    obterVeiculoAtivo: () => responder(VEICULO_EXEMPLO),
    obterDispositivo: () => responder(DISPOSITIVO_EXEMPLO),
    obterUsuarioAtual: () => responder(USUARIO_EXEMPLO),
  };
}

