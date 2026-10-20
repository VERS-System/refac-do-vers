/**
 * Preload do app desktop do VERS.
 *
 * Expõe informações do sistema e operações fixas de sessão.
 * A interface roda isolada do Node; tudo que ela acessa do
 * Electron passa por este objeto `window.vers`.
 */

import { contextBridge, ipcRenderer } from 'electron';
import type { PonteSessao } from '../shared/sessao';
import type { PonteCadastro } from '../shared/cadastro';
import type { PonteEnsaios } from '../shared/ensaios';

/** Expõe operações fixas; o renderer nunca escolhe canal, URL ou cabeçalhos. */
const sessao: PonteSessao = {
  /** Solicita login sem expor o transporte à interface. */
  entrar: dados => ipcRenderer.invoke('vers:sessao', 'entrar', dados),
  /** Consulta o perfil usando os cookies exclusivos do main. */
  perfil: () => ipcRenderer.invoke('vers:sessao', 'perfil'),
  /** Solicita rotação da sessão sem receber JWTs. */
  renovar: () => ipcRenderer.invoke('vers:sessao', 'renovar'),
  /** Encerra a sessão no servidor antes de confirmar sucesso. */
  sair: () => ipcRenderer.invoke('vers:sessao', 'sair'),
  /** Solicita cadastro pendente sem iniciar sessão. */
  registrar: dados => ipcRenderer.invoke('vers:sessao', 'registrar', dados),
  /** Salva somente os campos públicos editáveis do perfil. */
  atualizarPerfil: dados => ipcRenderer.invoke('vers:sessao', 'atualizarPerfil', dados),
  /** Revoga todas as sessões da conta autenticada. */
  sairDeTodas: () => ipcRenderer.invoke('vers:sessao', 'sairDeTodas'),
};

/** Encaminha somente ações de cadastro conhecidas, sem expor o IPC bruto. */
const cadastro: PonteCadastro = {
  /** Lista uma página fixa de veículos próprios. */
  veiculos: pagina => ipcRenderer.invoke('vers:cadastro', 'veiculos', { pagina }),
  /** Cria veículo com os campos públicos aceitos. */
  criarVeiculo: dados => ipcRenderer.invoke('vers:cadastro', 'criarVeiculo', dados),
  /** Edita o UUID informado, com autorização conferida no servidor. */
  atualizarVeiculo: (id, dados) => ipcRenderer.invoke('vers:cadastro', 'atualizarVeiculo', { id, dados }),
  /** Desvincula veículo e informa substituto somente quando solicitado. */
  removerVeiculo: (id, substitutoId) => ipcRenderer.invoke('vers:cadastro', 'removerVeiculo', { id, ...(substitutoId ? { substitutoId } : {}) }),
  /** Lista instalações exclusivamente do veículo informado. */
  instalacoes: (id, pagina) => ipcRenderer.invoke('vers:cadastro', 'instalacoes', { id, pagina }),
  /** Lista versões somente da instalação selecionada. */
  configuracoes: (id, pagina) => ipcRenderer.invoke('vers:cadastro', 'configuracoes', { id, pagina }),
};

/** Encaminha ensaios por operações fixas, sem acesso ao transporte ou à identidade. */
const ensaios: PonteEnsaios = {
  /** Consulta blocos horários completos exclusivamente da instalação solicitada. */
  energia: (id, query) => ipcRenderer.invoke('vers:ensaios', 'energia', { id, query }),
  /** Consulta histórico e filtros públicos. */
  listar: query => ipcRenderer.invoke('vers:ensaios', 'listar', query),
  /** Planeja com instalação e configuração explícitas. */
  criar: dados => ipcRenderer.invoke('vers:ensaios', 'criar', dados),
  /** Inicia usando o relógio do servidor. */
  iniciar: id => ipcRenderer.invoke('vers:ensaios', 'iniciar', { id, dados: {} }),
  /** Encerra com informações fornecidas pelo operador. */
  finalizar: (id, dados) => ipcRenderer.invoke('vers:ensaios', 'finalizar', { id, dados }),
  /** Cancela sem apagar amostras. */
  cancelar: (id, dados) => ipcRenderer.invoke('vers:ensaios', 'cancelar', { id, dados }),
  /** Consulta uma página de amostras do teste. */
  amostras: (id, query) => ipcRenderer.invoke('vers:ensaios', 'amostras', { id, query }),
  /** Consulta exclusivamente o resumo TEST. */
  resumos: id => ipcRenderer.invoke('vers:ensaios', 'resumos', { id, query: {} }),
  /** Consulta resumos dos testes selecionados. */
  comparar: testIds => ipcRenderer.invoke('vers:ensaios', 'comparar', { testIds }),
};

contextBridge.exposeInMainWorld('vers', {
  plataforma: process.platform,
  sessao,
  cadastro,
  ensaios,
});
