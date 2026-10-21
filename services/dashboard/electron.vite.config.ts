/**
 * Configuração do electron-vite para o app desktop do VERS.
 *
 * Compila em conjunto os três alvos do Electron:
 * - main: processo principal (janela, ciclo de vida do app);
 * - preload: ponte segura entre o processo principal e a interface;
 * - renderer: a interface React, com Tailwind v4. No build, o `index.html`
 *   ganha a política de conteúdo (CSP) de `src/main/seguranca.ts`.
 */

import { resolve } from 'node:path';
import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import type { InlineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { POLITICA_CSP } from './src/main/seguranca';

// Impede leitura automática de .env, inclusive após os defaults do electron-vite.
const semArquivoEnv: Pick<InlineConfig, 'envFile'> = { envFile: false };

/**
 * Injeta a CSP no `index.html` só no build: no desenvolvimento o Vite usa
 * script inline (React Refresh) e websocket, que a política bloquearia.
 */
function politicaDeConteudo(): Plugin {
  return {
    name: 'vers-politica-de-conteudo',
    apply: 'build',
    transformIndexHtml: () => [
      {
        tag: 'meta',
        attrs: { 'http-equiv': 'Content-Security-Policy', content: POLITICA_CSP },
        injectTo: 'head-prepend',
      },
    ],
  };
}

export default defineConfig({
  main: {
    ...semArquivoEnv,
    plugins: [externalizeDepsPlugin()],
  },
  preload: {
    ...semArquivoEnv,
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        // O preload sai em CommonJS porque preloads em sandbox não aceitam ESM.
        output: { format: 'cjs', entryFileNames: '[name].cjs' },
      },
    },
  },
  renderer: {
    ...semArquivoEnv,
    root: resolve(__dirname, 'src/renderer'),
    resolve: {
      alias: { '@': resolve(__dirname, 'src/renderer') },
    },
    plugins: [react(), tailwindcss(), politicaDeConteudo()],
    // O cliente HTTP usa a URL relativa /api/v1; em desenvolvimento ela vai para a API local.
    server: {
      host: 'localhost',
      port: 5174,
      strictPort: true,
      proxy: { '/api': { target: 'http://localhost:3000', changeOrigin: true } },
    },
    build: {
      rollupOptions: {
        input: resolve(__dirname, 'src/renderer/index.html'),
      },
    },
  },
});
