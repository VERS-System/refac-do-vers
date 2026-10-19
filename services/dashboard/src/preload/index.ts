/**
 * Preload do app desktop do VERS.
 *
 * Expõe à interface, de forma controlada, apenas as informações do sistema
 * que ela precisa. A interface roda isolada do Node; tudo que ela acessa do
 * Electron passa por este objeto `window.vers`.
 */

import { contextBridge } from 'electron';

contextBridge.exposeInMainWorld('vers', {
  plataforma: process.platform,
});
