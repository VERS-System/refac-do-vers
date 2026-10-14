/**
 * Configuração do Vite para rodar só a interface no navegador.
 *
 * Usada pelo script `dev:web` para desenvolver e comparar as telas com as
 * referências do Stitch sem abrir o Electron. Reaproveita os mesmos plugins e
 * o mesmo alias `@` do renderer definido em `electron.vite.config.ts`.
 */

import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  root: resolve(__dirname, 'src/renderer'),
  resolve: {
    alias: { '@': resolve(__dirname, 'src/renderer') },
  },
  plugins: [react(), tailwindcss()],
  server: {
    // Porta própria para não colidir com outros projetos Vite (5173).
    port: 5180,
    // O cliente HTTP usa a URL relativa /api/v1; em desenvolvimento ela vai para a API local.
    proxy: { '/api': { target: 'http://localhost:3000', changeOrigin: true } },
  },
});
