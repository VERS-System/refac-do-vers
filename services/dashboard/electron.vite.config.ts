/**
 * Configuração do electron-vite para o app desktop do VERS.
 *
 * Compila em conjunto os três alvos do Electron:
 * - main: processo principal (janela, ciclo de vida do app);
 * - preload: ponte segura entre o processo principal e a interface;
 * - renderer: a interface React, com Tailwind v4.
 */

import { resolve } from 'node:path';
import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        // O preload sai em CommonJS porque preloads em sandbox não aceitam ESM.
        output: { format: 'cjs', entryFileNames: '[name].cjs' },
      },
    },
  },
  renderer: {
    root: resolve(__dirname, 'src/renderer'),
    resolve: {
      alias: { '@': resolve(__dirname, 'src/renderer') },
    },
    plugins: [react(), tailwindcss()],
    // O cliente HTTP usa a URL relativa /api/v1; em desenvolvimento ela vai para a API local.
    server: {
      proxy: { '/api': { target: 'http://localhost:3000', changeOrigin: true } },
    },
    build: {
      rollupOptions: {
        input: resolve(__dirname, 'src/renderer/index.html'),
      },
    },
  },
});
