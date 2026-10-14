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
  Bateria,
  CadeiaConversao,
  CurvaDoDia,
  Dispositivo,
  ResumoDia,
  ResumoEnergia,
  Usuario,
  Veiculo,
  Vibracao,
} from './tipos';

/** Períodos que se dividem em dias (Hora e Dia são uma curva só). */
export type PeriodoComDias = Extract<Periodo, 'semana' | 'mes'>;

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
   * dia": Semana (última semana completa) ou Mês (do dia 1 até hoje).
   */
  obterDias(periodo: PeriodoComDias): Promise<ResumoDia[]>;
  /** Curva de potência de hoje até agora. */
  obterCurvaDoDia(): Promise<CurvaDoDia>;
  obterCadeiaAoVivo(): Promise<CadeiaConversao>;
  obterBateria(): Promise<Bateria>;
  obterVibracao(): Promise<Vibracao>;
  obterVeiculoAtivo(): Promise<Veiculo>;
  obterDispositivo(): Promise<Dispositivo>;
  obterUsuarioAtual(): Promise<Usuario>;
}

const ContextoRepositorio = createContext<RepositorioVers | null>(null);

/** Disponibiliza o repositório para a árvore de componentes. */
export function RepositorioProvider({ repositorio, children }: { repositorio: RepositorioVers; children: ReactNode }) {
  return <ContextoRepositorio.Provider value={repositorio}>{children}</ContextoRepositorio.Provider>;
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
