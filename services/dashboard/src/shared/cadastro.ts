/** Operações públicas fixas do cadastro; URLs, cookies e cabeçalhos não cruzam IPC. */
import type { Vehicle, CreateVehicleRequest, UpdateVehicleRequest, Installation, Configuration, PaginationMeta } from '@vers/shared-types';
import type { ResultadoSessao } from './sessao';

export type ResultadoCadastro<T> = { ok: true; data: T; meta?: PaginationMeta } | Extract<ResultadoSessao, { ok: false }>;
export interface PonteCadastro {
  veiculos(pagina: number): Promise<ResultadoCadastro<Vehicle[]>>;
  criarVeiculo(dados: CreateVehicleRequest): Promise<ResultadoCadastro<Vehicle>>;
  atualizarVeiculo(id: string, dados: UpdateVehicleRequest): Promise<ResultadoCadastro<Vehicle>>;
  removerVeiculo(id: string, substitutoId?: string): Promise<ResultadoCadastro<null>>;
  instalacoes(veiculoId: string, pagina: number): Promise<ResultadoCadastro<Installation[]>>;
  configuracoes(instalacaoId: string, pagina: number): Promise<ResultadoCadastro<Configuration[]>>;
}
