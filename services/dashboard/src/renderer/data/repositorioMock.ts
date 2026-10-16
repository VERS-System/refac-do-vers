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
  emailValido,
  enriquecerCadeia,
  horarioParaMinutos,
  minutosParaHorario,
  recortarUltimosMinutos,
  resumirCurva,
  resumirDia,
  resumirDias,
  senhaValida,
  variacaoPercentual,
} from './calculos';
import { gerarTensaoBateria } from './fixtures/bateria';
import { gerarCurvaDoDia } from './fixtures/curva';
import { gerarAmostrasTelemetria } from './fixtures/telemetria';
import { TESTES_HOJE } from './fixtures/testes';
import { gerarAmostrasVibracao } from './fixtures/vibracao';
import {
  AGORA_EXEMPLO,
  AMOSTRAS_VIBRACAO,
  CURVA_HOJE,
  ENERGIA_HOJE_P2_A_P4,
  FUSO_EXEMPLO,
  SEMENTE_TELEMETRIA,
  ENERGIA_SEMANA_ANTERIOR_MWH,
  HOJE_EXEMPLO,
  SEMANA_EXEMPLO,
} from './fixtures/medicoes';
import {
  BATERIA_EXEMPLO,
  CADEIA_AO_VIVO,
  CONFIGURACOES_EXEMPLO,
  DISPOSITIVO_EXEMPLO,
  INSTALACAO_EXEMPLO,
  LOG_DISPOSITIVO_EXEMPLO,
  REVISOES_EXEMPLO,
  USUARIO_EXEMPLO,
  VIBRACAO_EXEMPLO,
} from './fixtures/sistema';
import type { PeriodoComDias, RepositorioVers } from './repositorio';
import { criarCadastroEmMemoria } from './cadastroEmMemoria';
import { criarTestesEmMemoria } from './testesEmMemoria';
import { criarViberEmMemoria } from './viberEmMemoria';
import { ErroRepositorio } from './erros';
import type {
  AmostraTelemetria,
  AtualizacaoPerfil,
  Credenciais,
  NovaConta,
  AmostraVibracao,
  ConsultaTelemetria,
  CurvaDoDia,
  DiaMedido,
  PaginaDe,
  ResumoEnergia,
  SerieTensaoBateria,
  Usuario,
} from './tipos';

export interface OpcoesRepositorioMock {
  /** Relógio usado pelo repositório (padrão: o "agora" fixo do exemplo). */
  agora?: () => Date;
  /** Atraso artificial das respostas, para ver estados de carregamento. */
  latenciaMs?: number;
}

/** Minutos da janela do período Hora. */
const MINUTOS_HORA = 60;

/** Tamanho de página padrão e máximo das amostras, como no backend. */
const TAMANHO_PAGINA_PADRAO = 20;
const TAMANHO_PAGINA_MAXIMO = 100;

/** Intervalo da série de tensão da bateria, em minutos. */
const INTERVALO_TENSAO_MINUTOS = 5;

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
  const mesAtual = HOJE_EXEMPLO.slice(0, 7);
  const diasDoMes = [...SEMANA_EXEMPLO.filter((dia) => dia.data.startsWith(mesAtual)), hoje];
  const diasPorPeriodo: Record<PeriodoComDias, DiaMedido[]> = {
    dia: [hoje],
    semana: SEMANA_EXEMPLO,
    mes: diasDoMes,
  };
  const amostrasVibracao = gerarAmostrasVibracao({
    ...AMOSTRAS_VIBRACAO,
    diasAnteriores: SEMANA_EXEMPLO,
    hoje: { data: HOJE_EXEMPLO, pontos: curva.pontos },
  });
  const inicioDaHora = minutosParaHorario(horarioParaMinutos(CURVA_HOJE.ate) - MINUTOS_HORA);
  const tensaoBateria: SerieTensaoBateria = {
    data: HOJE_EXEMPLO,
    intervaloMinutos: INTERVALO_TENSAO_MINUTOS,
    pontos: gerarTensaoBateria({
      pontos: curva.pontos,
      energiaHoje: hoje.energia,
      capacidadeMwh: BATERIA_EXEMPLO.capacidadeMah * BATERIA_EXEMPLO.tensaoNominalV,
      cargaFinalPercentual: BATERIA_EXEMPLO.cargaPercentual,
      intervaloMinutos: INTERVALO_TENSAO_MINUTOS,
    }),
  };
  const mediaDiariaSemana =
    SEMANA_EXEMPLO.reduce((soma, dia) => soma + dia.energia.p1, 0) / SEMANA_EXEMPLO.length;
  const amostrasMaisRecentesPrimeiro = gerarAmostrasTelemetria({
    data: HOJE_EXEMPLO,
    fuso: FUSO_EXEMPLO,
    pontos: curva.pontos,
    testes: TESTES_HOJE,
    piezosTotal: VIBRACAO_EXEMPLO.piezosTotal,
    leituraFinal: {
      vibracaoRmsMs2: VIBRACAO_EXEMPLO.rmsMs2,
      temperaturaC: VIBRACAO_EXEMPLO.temperaturaBlocoC,
      piezosAtivos: VIBRACAO_EXEMPLO.piezosAtivos,
    },
    semente: SEMENTE_TELEMETRIA,
  }).reverse();

  /**
   * Consulta paginada de amostras, como o backend: só as do teste pedido,
   * filtradas por qualidade e intervalo, da mais recente para a mais antiga,
   * com página a partir de 1 e tamanho entre 1 e 100 (padrão 20).
   */
  function consultarAmostras(consulta: ConsultaTelemetria): PaginaDe<AmostraTelemetria> {
    const tamanhoPagina = Math.min(
      Math.max(Math.trunc(consulta.tamanhoPagina ?? TAMANHO_PAGINA_PADRAO), 1),
      TAMANHO_PAGINA_MAXIMO,
    );
    const pagina = Math.max(Math.trunc(consulta.pagina ?? 1), 1);
    const de = consulta.de ? Date.parse(consulta.de) : -Infinity;
    const ate = consulta.ate ? Date.parse(consulta.ate) : Infinity;
    const filtradas = amostrasMaisRecentesPrimeiro.filter((amostra) => {
      const instante = Date.parse(amostra.capturadaEm);
      return (
        amostra.testeId === consulta.testeId &&
        (!consulta.qualidade || amostra.qualidade === consulta.qualidade) &&
        instante >= de &&
        instante <= ate
      );
    });
    const inicio = (pagina - 1) * tamanhoPagina;
    return {
      itens: filtradas.slice(inicio, inicio + tamanhoPagina),
      total: filtradas.length,
      pagina,
      tamanhoPagina,
    };
  }

  const amostrasEmOrdem = [...amostrasMaisRecentesPrimeiro].reverse();
  const cadastro = criarCadastroEmMemoria(agora);
  const usuario: Usuario = structuredClone(USUARIO_EXEMPLO);
  const testes = criarTestesEmMemoria({
    agora,
    amostrasDoTeste: (testeId) => amostrasEmOrdem.filter((amostra) => amostra.testeId === testeId),
  });
  const viber = criarViberEmMemoria({
    agora,
    primeiroNome: USUARIO_EXEMPLO.nome.split(' ')[0],
    resumo: (periodo) => resumir(periodo),
    diasDaSemana: () => SEMANA_EXEMPLO.map(resumirDia),
    teste: (codigo) => testes.buscar({ tamanhoPagina: 100 }).itens.find((t) => t.codigo === codigo),
    testeEmAndamento: () => testes.buscar({ status: 'em-andamento', tamanhoPagina: 1 }).itens[0],
    resumoTeste: (testeId) => testes.resumo(testeId),
    amostrasDoTeste: (testeId) => amostrasEmOrdem.filter((amostra) => amostra.testeId === testeId),
    revisoes: REVISOES_EXEMPLO,
    configuracoes: CONFIGURACOES_EXEMPLO,
  });

  /** Devolve uma cópia do valor depois da latência configurada. */
  function responder<T>(valor: T): Promise<T> {
    const copia = structuredClone(valor);
    if (latencia <= 0) return Promise.resolve(copia);
    return new Promise((resolver) => setTimeout(() => resolver(copia), latencia));
  }

  /**
   * Executa uma operação e responde como a API: cópia do resultado depois da
   * latência, ou a recusa (`ErroRepositorio`) como promessa rejeitada.
   */
  function executar<T>(operacao: () => T): Promise<T> {
    try {
      return responder(operacao());
    } catch (erro) {
      return Promise.reject(erro);
    }
  }

  /**
   * Edita o perfil como o backend (`UpdateUserProfileRequest`): só nome e
   * foto; nome vazio é recusado.
   */
  function atualizarPerfil(atualizacao: AtualizacaoPerfil): Usuario {
    if (atualizacao.nome !== undefined) {
      const nome = atualizacao.nome.trim();
      if (!nome) throw new ErroRepositorio('validacao', 'Informe o nome.');
      usuario.nome = nome;
    }
    if (atualizacao.foto !== undefined) usuario.foto = atualizacao.foto ?? undefined;
    return usuario;
  }

  /**
   * Login de exemplo: valida como o `LoginDto` (e-mail válido, senha
   * preenchida) e aceita qualquer credencial válida, entrando sempre na conta
   * de exemplo. Não há autenticação real antes da API.
   */
  function entrar(credenciais: Credenciais): Usuario {
    if (!emailValido(credenciais.email)) {
      throw new ErroRepositorio('validacao', 'Informe um e-mail válido.');
    }
    if (!credenciais.senha) throw new ErroRepositorio('validacao', 'Informe a senha.');
    return usuario;
  }

  /**
   * Cadastro de exemplo: valida como o `RegisterDto` e não guarda nada. Como
   * o backend, responde igual para e-mail novo ou já cadastrado, para não
   * revelar quais contas existem.
   */
  function registrar(conta: NovaConta): void {
    if (!emailValido(conta.email)) {
      throw new ErroRepositorio('validacao', 'Informe um e-mail válido.');
    }
    if (!senhaValida(conta.senha)) {
      throw new ErroRepositorio('validacao', 'A senha não atende a todos os requisitos.');
    }
  }

  /** Amostras de vibração dentro do intervalo do período. */
  function amostrasDoPeriodo(periodo: Periodo): AmostraVibracao[] {
    switch (periodo) {
      case 'hora':
        return amostrasVibracao.filter((a) => a.data === HOJE_EXEMPLO && a.horario >= inicioDaHora);
      case 'dia':
        return amostrasVibracao.filter((a) => a.data === HOJE_EXEMPLO);
      case 'semana':
        return amostrasVibracao.filter((a) => SEMANA_EXEMPLO.some((dia) => dia.data === a.data));
      case 'mes':
        return amostrasVibracao.filter((a) => a.data.startsWith(mesAtual));
    }
  }

  /** Calcula o resumo de cada período a partir das medições. */
  function resumir(periodo: Periodo): ResumoEnergia {
    switch (periodo) {
      case 'hora':
        return resumirCurva(
          'hora',
          curva.data,
          recortarUltimosMinutos(curva.pontos, MINUTOS_HORA),
          curva.intervaloMinutos,
        );
      case 'dia': {
        const resumo = resumirDias('dia', [hoje]);
        const variacao = variacaoPercentual(hoje.energia.p1, mediaDiariaSemana);
        return variacao === null
          ? resumo
          : {
              ...resumo,
              comparacao: { referencia: 'media-semanal', variacaoPercentual: variacao },
            };
      }
      case 'semana': {
        const resumo = resumirDias('semana', SEMANA_EXEMPLO);
        const variacao = variacaoPercentual(
          resumo.energiaRecuperadaMwh,
          ENERGIA_SEMANA_ANTERIOR_MWH,
        );
        return variacao === null
          ? resumo
          : {
              ...resumo,
              comparacao: { referencia: 'semana-anterior', variacaoPercentual: variacao },
            };
      }
      case 'mes':
        return resumirDias('mes', diasDoMes);
    }
  }

  return {
    agora,
    obterResumoEnergia: (periodo) => responder(resumir(periodo)),
    obterDias: (periodo) => responder(diasPorPeriodo[periodo].map(resumirDia)),
    obterCurvaDoDia: () => responder(curva),
    obterAmostrasVibracao: (periodo) => responder(amostrasDoPeriodo(periodo)),
    obterTensaoBateria: () => responder(tensaoBateria),
    buscarTestes: (consulta) => executar(() => testes.buscar(consulta)),
    obterResumoTeste: (testeId) => executar(() => testes.resumo(testeId)),
    compararTestes: (testeIds) => executar(() => testes.comparar(testeIds)),
    criarTeste: (novo) => executar(() => testes.criar(novo)),
    iniciarTeste: (testeId) => executar(() => testes.iniciar(testeId)),
    finalizarTeste: (testeId, finalizacao) =>
      executar(() => testes.finalizar(testeId, finalizacao)),
    cancelarTeste: (testeId, cancelamento) =>
      executar(() => testes.cancelar(testeId, cancelamento)),
    obterAmostrasTelemetria: (consulta) => responder(consultarAmostras(consulta)),
    obterCadeiaAoVivo: () => responder(enriquecerCadeia(AGORA_EXEMPLO, CADEIA_AO_VIVO)),
    obterBateria: () => responder(BATERIA_EXEMPLO),
    obterVibracao: () => responder(VIBRACAO_EXEMPLO),
    obterVeiculoAtivo: () => executar(() => cadastro.principal()),
    obterVeiculos: () => executar(() => cadastro.listar()),
    criarVeiculo: (novo) => executar(() => cadastro.criar(novo)),
    removerVeiculo: (veiculoId, substitutoId) =>
      executar(() => cadastro.remover(veiculoId, substitutoId)),
    atualizarVeiculo: (veiculoId, atualizacao) =>
      executar(() => cadastro.atualizar(veiculoId, atualizacao)),
    obterInstalacao: (veiculoId) =>
      responder(
        veiculoId === INSTALACAO_EXEMPLO.veiculoId
          ? { ...INSTALACAO_EXEMPLO, dispositivo: DISPOSITIVO_EXEMPLO }
          : null,
      ),
    obterConfiguracoes: (instalacaoId) =>
      responder(
        CONFIGURACOES_EXEMPLO.filter((configuracao) => configuracao.instalacaoId === instalacaoId),
      ),
    obterRevisoes: () => responder(REVISOES_EXEMPLO),
    obterContextosViber: () => executar(() => viber.contextos()),
    obterConversasViber: () => executar(() => viber.listarConversas()),
    obterMensagensViber: (conversaId) => executar(() => viber.listarMensagens(conversaId)),
    criarConversaViber: () => executar(() => viber.criarConversa()),
    enviarMensagemViber: (envio) => executar(() => viber.enviar(envio)),
    obterLogsDispositivo: (dispositivoId) =>
      responder(dispositivoId === DISPOSITIVO_EXEMPLO.id ? LOG_DISPOSITIVO_EXEMPLO : []),
    obterDispositivo: () => responder(DISPOSITIVO_EXEMPLO),
    obterUsuarioAtual: () => responder(usuario),
    atualizarPerfil: (atualizacao) => executar(() => atualizarPerfil(atualizacao)),
    encerrarSessoes: () => responder(undefined),
    entrar: (credenciais) => executar(() => entrar(credenciais)),
    registrar: (conta) => executar(() => registrar(conta)),
  };
}
