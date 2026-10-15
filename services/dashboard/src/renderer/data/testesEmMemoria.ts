/**
 * Testes de campo em memória, para o repositório de exemplo.
 *
 * Imita o que o backend faz com os testes: busca paginada com os filtros do
 * contrato, resumo de energia dos testes encerrados, comparação de 2 a 5
 * testes e a máquina de estados (planejar, iniciar, finalizar, cancelar),
 * recusando com erros tipados o que o backend recusaria. As mudanças valem só
 * para esta instância e somem ao recarregar a página.
 */

import { formatarIsoComFuso } from './calculos';
import { ErroRepositorio } from './erros';
import {
  montarTestesDaSemana,
  RETRATO_INSTALACAO,
  TESTE_CANCELADO,
  TESTE_PLANEJADO,
  TESTES_HOJE,
} from './fixtures/testes';
import { SEMANA_EXEMPLO } from './fixtures/medicoes';
import type {
  AmostraTelemetria,
  CancelamentoTeste,
  ConsultaTestes,
  FinalizacaoTeste,
  ItemComparacao,
  NovoTeste,
  PaginaDe,
  ResumoTeste,
  TesteCampo,
} from './tipos';

/** Tamanho de página padrão e máximo, como no backend. */
const TAMANHO_PAGINA_PADRAO = 20;
const TAMANHO_PAGINA_MAXIMO = 100;

/** Limites da comparação (`CompareTestsQuery`: de 2 a 5 testes). */
const MINIMO_COMPARACAO = 2;
const MAXIMO_COMPARACAO = 5;

/** Fração mínima de amostras válidas para o resumo ser "boa" (senão, "parcial"). */
const FRACAO_VALIDAS_BOA = 0.95;

/** Fuso de Brasília em minutos, para os horários gravados pelas ações. */
const FUSO_MINUTOS = -180;

export interface OpcoesTestesEmMemoria {
  agora: () => Date;
  /** Amostras de telemetria de um teste, em ordem cronológica. */
  amostrasDoTeste: (testeId: string) => AmostraTelemetria[];
}

/** Momento que ordena a lista: o início, ou a criação para quem ainda não começou. */
const momento = (teste: TesteCampo) => Date.parse(teste.inicio ?? teste.criadoEm);

/**
 * Resumo de um teste a partir das suas amostras, como o backend calcularia:
 * energia = acumulada da última amostra com medida, potência média = energia
 * sobre a duração, pico = maior potência e qualidade pela fração de amostras
 * válidas.
 */
function resumirAmostras(teste: TesteCampo, amostras: AmostraTelemetria[]): ResumoTeste {
  const medidas = amostras.filter((a) => a.energiaAcumuladaMwh !== null);
  const energia = medidas.at(-1)?.energiaAcumuladaMwh ?? 0;
  const horas =
    teste.inicio && teste.fim ? (Date.parse(teste.fim) - Date.parse(teste.inicio)) / 3_600_000 : 0;
  const potencias = amostras.map((a) => a.potenciaMw).filter((p): p is number => p !== null);
  const validas = amostras.filter((a) => a.qualidade === 'valida').length;
  let qualidade: ResumoTeste['qualidade'] = 'invalida';
  if (amostras.length > 0)
    qualidade = validas / amostras.length >= FRACAO_VALIDAS_BOA ? 'boa' : 'parcial';
  return {
    testeId: teste.id,
    energiaRecuperadaMwh: energia,
    potenciaMediaMw: horas > 0 ? energia / horas : null,
    picoPotenciaMw: potencias.length ? Math.max(...potencias) : null,
    amostras: amostras.length,
    qualidade,
  };
}

/**
 * Cria o estado dos testes: a semana, o cancelado, os dois de hoje e o
 * planejado, com os resumos da semana já calculados.
 */
export function criarTestesEmMemoria({ agora, amostrasDoTeste }: OpcoesTestesEmMemoria) {
  const semana = montarTestesDaSemana(SEMANA_EXEMPLO);
  const testes: TesteCampo[] = structuredClone([
    ...semana.testes,
    TESTE_CANCELADO,
    ...TESTES_HOJE,
    TESTE_PLANEJADO,
  ]);
  const resumosDaSemana = semana.resumos;

  /** Horário atual no formato do exemplo. */
  const agoraIso = () => formatarIsoComFuso(agora(), FUSO_MINUTOS);

  /** Acha o teste ou recusa com "não encontrado". */
  function achar(testeId: string): TesteCampo {
    const teste = testes.find((t) => t.id === testeId);
    if (!teste) throw new ErroRepositorio('nao-encontrado', 'Teste não encontrado.');
    return teste;
  }

  /** Busca paginada: status, intervalo de início; do mais recente ao mais antigo. */
  function buscar(consulta: ConsultaTestes): PaginaDe<TesteCampo> {
    const tamanhoPagina = Math.min(
      Math.max(Math.trunc(consulta.tamanhoPagina ?? TAMANHO_PAGINA_PADRAO), 1),
      TAMANHO_PAGINA_MAXIMO,
    );
    const pagina = Math.max(Math.trunc(consulta.pagina ?? 1), 1);
    const de = consulta.inicioDe ? Date.parse(consulta.inicioDe) : null;
    const ate = consulta.inicioAte ? Date.parse(consulta.inicioAte) : null;
    const filtrados = testes
      .filter((teste) => {
        if (consulta.status && teste.estado !== consulta.status) return false;
        if (de === null && ate === null) return true;
        if (!teste.inicio) return false;
        const inicio = Date.parse(teste.inicio);
        return (de === null || inicio >= de) && (ate === null || inicio <= ate);
      })
      .sort((a, b) => momento(b) - momento(a));
    const primeiro = (pagina - 1) * tamanhoPagina;
    return {
      itens: filtrados.slice(primeiro, primeiro + tamanhoPagina),
      total: filtrados.length,
      pagina,
      tamanhoPagina,
    };
  }

  /** Resumo só de teste encerrado: da semana, ou calculado das amostras. */
  function resumo(testeId: string): ResumoTeste | null {
    const teste = achar(testeId);
    if (teste.estado !== 'concluido' && teste.estado !== 'falhou') return null;
    return resumosDaSemana.get(testeId) ?? resumirAmostras(teste, amostrasDoTeste(testeId));
  }

  /** Comparação de 2 a 5 testes, na ordem pedida. */
  function comparar(testeIds: string[]): ItemComparacao[] {
    if (testeIds.length < MINIMO_COMPARACAO || testeIds.length > MAXIMO_COMPARACAO) {
      throw new ErroRepositorio('validacao', 'Escolha de 2 a 5 testes para comparar.');
    }
    return testeIds.map((testeId) => ({ testeId, resumo: resumo(testeId) }));
  }

  /** Planeja um teste com o veículo e a configuração atuais e o próximo código. */
  function criar(novo: NovoTeste): TesteCampo {
    if (!novo.nome.trim() || !novo.local.trim()) {
      throw new ErroRepositorio('validacao', 'Informe o nome e o local do teste.');
    }
    const ultimo = Math.max(...testes.map((t) => Number(t.codigo.slice(1))));
    const numero = String(ultimo + 1).padStart(3, '0');
    const teste: TesteCampo = {
      id: `teste-${numero}`,
      codigo: `#${numero}`,
      nome: novo.nome.trim(),
      estado: 'planejado',
      terreno: novo.terreno,
      local: novo.local.trim(),
      inicio: null,
      fim: null,
      criadoEm: agoraIso(),
      resultado: null,
      ...RETRATO_INSTALACAO,
      pesoVeiculoKg: novo.pesoVeiculoKg ?? null,
      velocidadeMediaKmh: null,
      rotacaoMediaRpm: null,
      inclinacaoGraus: null,
      observacoes: novo.observacoes?.trim() || null,
    };
    testes.push(teste);
    return teste;
  }

  /** Inicia um planejado; recusa se já houver outro em andamento (conflito). */
  function iniciar(testeId: string): TesteCampo {
    const teste = achar(testeId);
    if (teste.estado !== 'planejado') {
      throw new ErroRepositorio('transicao-invalida', 'Só testes planejados podem ser iniciados.');
    }
    const emAndamento = testes.find((t) => t.estado === 'em-andamento');
    if (emAndamento) {
      throw new ErroRepositorio(
        'conflito',
        `Já existe um teste em andamento (${emAndamento.codigo}). Finalize ou cancele antes de iniciar outro.`,
      );
    }
    Object.assign(teste, { estado: 'em-andamento', inicio: agoraIso() });
    return teste;
  }

  /** Finaliza o em andamento como concluído ou falho, com os dados informados. */
  function finalizar(testeId: string, finalizacao: FinalizacaoTeste): TesteCampo {
    const teste = achar(testeId);
    if (teste.estado !== 'em-andamento') {
      throw new ErroRepositorio(
        'transicao-invalida',
        'Só testes em andamento podem ser finalizados.',
      );
    }
    Object.assign(teste, {
      estado: finalizacao.status,
      fim: agoraIso(),
      resultado: finalizacao.resultado ?? null,
      velocidadeMediaKmh: finalizacao.velocidadeMediaKmh ?? null,
      rotacaoMediaRpm: finalizacao.rotacaoMediaRpm ?? null,
      inclinacaoGraus: finalizacao.inclinacaoGraus ?? null,
      observacoes: finalizacao.observacoes?.trim() || teste.observacoes,
    });
    return teste;
  }

  /** Cancela um planejado ou em andamento, guardando o motivo. */
  function cancelar(testeId: string, cancelamento: CancelamentoTeste): TesteCampo {
    const teste = achar(testeId);
    if (teste.estado !== 'planejado' && teste.estado !== 'em-andamento') {
      throw new ErroRepositorio(
        'transicao-invalida',
        'Só testes planejados ou em andamento podem ser cancelados.',
      );
    }
    Object.assign(teste, {
      estado: 'cancelado',
      fim: teste.estado === 'em-andamento' ? agoraIso() : null,
      observacoes: cancelamento.motivo?.trim() || teste.observacoes,
    });
    return teste;
  }

  return { buscar, resumo, comparar, criar, iniciar, finalizar, cancelar };
}
