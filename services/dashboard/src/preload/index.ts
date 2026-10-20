/**
 * Preload do app desktop do VERS.
 *
 * Expõe informações do sistema e operações fixas de sessão.
 * A interface roda isolada do Node; tudo que ela acessa do
 * Electron passa por este objeto `window.vers`.
 */

import { contextBridge, ipcRenderer } from 'electron';
import type { PonteSessao } from '../shared/sessao';

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
};

contextBridge.exposeInMainWorld('vers', {
  plataforma: process.platform,
  sessao,
});
