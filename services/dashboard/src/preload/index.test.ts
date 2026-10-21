/** Confere que a ponte expõe somente operações fixas e remove o listener exato. */
import { expect, it, vi } from 'vitest';
import type { PonteTempoReal } from '../shared/realtime';

const electron = vi.hoisted(() => ({
  contextBridge: { exposeInMainWorld: vi.fn() },
  ipcRenderer: { invoke: vi.fn().mockResolvedValue({ ok: true }), on: vi.fn(), removeListener: vi.fn() },
}));
vi.mock('electron', () => electron);

it('expõe observação limitada e repassa somente o aviso, sem o evento IPC', async () => {
  await import('./index');
  const ponte = electron.contextBridge.exposeInMainWorld.mock.calls[0][1].tempoReal as PonteTempoReal;
  const dados = { observacao: '11111111-1111-4111-8111-111111111111', recursos: [] };
  await ponte.observar(dados);
  expect(electron.ipcRenderer.invoke).toHaveBeenCalledWith('vers:tempo-real', dados);
  const ouvir = vi.fn(); const remover = ponte.receber(ouvir);
  const [canal, callback] = electron.ipcRenderer.on.mock.calls[0];
  expect(canal).toBe('vers:tempo-real:aviso');
  const aviso = { observacao: dados.observacao, tipo: 'desconectado' };
  callback({ sender: 'não expor' }, aviso);
  expect(ouvir).toHaveBeenCalledExactlyOnceWith(aviso);
  remover(); expect(electron.ipcRenderer.removeListener).toHaveBeenCalledWith(canal, callback);
  expect(Object.keys(ponte).sort()).toEqual(['observar', 'receber']);
});
