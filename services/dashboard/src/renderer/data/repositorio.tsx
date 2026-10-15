/**
 * Interface do repositório de dados do app desktop e seu provedor React.
 *
 * As telas e os hooks só conhecem esta interface. Hoje ela é atendida pelo
 * repositório de exemplo (`repositorioMock.ts`); quando a API existir, uma
 * nova implementação entra no `RepositorioProvider` sem mudar as telas.
 */

import { createContext, useContext, type ReactNode } from 'react';
import type { Periodo } from '@/stores/periodo';
import type {
  AmostraTelemetria,
  AtualizacaoPerfil,
  AtualizacaoVeiculo,
  Credenciais,
  NovaConta,
  Configuracao,
  Instalacao,
  LinhaLog,
  NovoVeiculo,
  Revisao,
  AmostraVibracao,
  CancelamentoTeste,
  ConsultaTelemetria,
  ConsultaTestes,
  ContextoViber,
  ConversaViber,
  EnvioViber,
  MensagemViber,
  FinalizacaoTeste,
  ItemComparacao,
  NovoTeste,
  ResumoTeste,
  PaginaDe,
  TesteCampo,
  Bateria,
  CadeiaConversao,
  CurvaDoDia,
  Dispositivo,
  ResumoDia,
  ResumoEnergia,
  SerieTensaoBateria,
  Usuario,
  Veiculo,
  Vibracao,
} from './tipos';

/** Períodos com resumo por dia (a Hora é só um trecho da curva de hoje). */
export type PeriodoComDias = Exclude<Periodo, 'hora'>;

export interface RepositorioVers {
  /** Relógio do repositório (fixo no exemplo, real na API). */
  agora(): Date;
  /**
   * Resumo de energia do período: Hora (última hora de hoje), Dia (hoje),
   * Semana (última semana completa) ou Mês (do dia 1 até hoje).
   */
  obterResumoEnergia(periodo: Periodo): Promise<ResumoEnergia>;
  /**
   * Dias do período, um por barra nos gráficos e por linha no "Resumo por
   * dia": Dia (só hoje), Semana (última semana completa) ou Mês (do dia 1
   * até hoje).
   */
  obterDias(periodo: PeriodoComDias): Promise<ResumoDia[]>;
  /** Curva de potência de hoje até agora. */
  obterCurvaDoDia(): Promise<CurvaDoDia>;
  /** Amostras simultâneas de vibração e potência do período (dispersão da Energia). */
  obterAmostrasVibracao(periodo: Periodo): Promise<AmostraVibracao[]>;
  /** Tensão e carga da bateria ao longo de hoje, até agora. */
  obterTensaoBateria(): Promise<SerieTensaoBateria>;
  buscarTestes(consulta: ConsultaTestes): Promise<PaginaDe<TesteCampo>>;
  obterResumoTeste(testeId: string): Promise<ResumoTeste | null>;
  compararTestes(testeIds: string[]): Promise<ItemComparacao[]>;
  criarTeste(novo: NovoTeste): Promise<TesteCampo>;
  iniciarTeste(testeId: string): Promise<TesteCampo>;
  finalizarTeste(testeId: string, finalizacao: FinalizacaoTeste): Promise<TesteCampo>;
  cancelarTeste(testeId: string, cancelamento: CancelamentoTeste): Promise<TesteCampo>;
  obterAmostrasTelemetria(consulta: ConsultaTelemetria): Promise<PaginaDe<AmostraTelemetria>>;
  obterCadeiaAoVivo(): Promise<CadeiaConversao>;
  obterBateria(): Promise<Bateria>;
  obterVibracao(): Promise<Vibracao>;
  obterVeiculoAtivo(): Promise<Veiculo>;
  obterVeiculos(): Promise<Veiculo[]>;
  criarVeiculo(novo: NovoVeiculo): Promise<Veiculo>;
  atualizarVeiculo(veiculoId: string, atualizacao: AtualizacaoVeiculo): Promise<Veiculo>;
  obterInstalacao(veiculoId: string): Promise<Instalacao | null>;
  obterConfiguracoes(instalacaoId: string): Promise<Configuracao[]>;
  obterRevisoes(): Promise<Revisao[]>;
  obterLogsDispositivo(dispositivoId: string): Promise<LinhaLog[]>;
  obterContextosViber(): Promise<ContextoViber[]>;
  obterConversasViber(): Promise<ConversaViber[]>;
  obterMensagensViber(conversaId: string): Promise<MensagemViber[]>;
  criarConversaViber(): Promise<ConversaViber>;
  enviarMensagemViber(envio: EnvioViber): Promise<MensagemViber[]>;
  obterDispositivo(): Promise<Dispositivo>;
  obterUsuarioAtual(): Promise<Usuario>;
  atualizarPerfil(atualizacao: AtualizacaoPerfil): Promise<Usuario>;
  encerrarSessoes(): Promise<void>;
  /** Entra com e-mail e senha (`POST /auth/login`) e devolve o perfil. */
  entrar(credenciais: Credenciais): Promise<Usuario>;
  /** Cria a conta pendente de confirmação (`POST /auth/register`). */
  registrar(conta: NovaConta): Promise<void>;
}

const ContextoRepositorio = createContext<RepositorioVers | null>(null);

/** Disponibiliza o repositório para a árvore de componentes. */
export function RepositorioProvider({
  repositorio,
  children,
}: {
  repositorio: RepositorioVers;
  children: ReactNode;
}) {
  return (
    <ContextoRepositorio.Provider value={repositorio}>{children}</ContextoRepositorio.Provider>
  );
}

/**
 * Lê o repositório do contexto.
 *
 * Lança erro fora do `RepositorioProvider`: é um erro de montagem do app e
 * deve aparecer logo no desenvolvimento, não como dados vazios.
 */
export function useRepositorio(): RepositorioVers {
  const repositorio = useContext(ContextoRepositorio);
  if (!repositorio) {
    throw new Error('useRepositorio precisa estar dentro de um RepositorioProvider.');
  }
  return repositorio;
}
