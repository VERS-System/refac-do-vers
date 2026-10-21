/**
 * Configuração dos testes unitários do app desktop (Vitest + jsdom).
 *
 * Executada por `npm run test:unit`. Usa jsdom para simular o DOM do
 * renderer e carrega `src/renderer/test/setup.ts`, que registra os matchers
 * do Testing Library e limpa o DOM entre os testes.
 */

import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  envDir: false,
  plugins: [react()],
  resolve: {
    alias: { '@': resolve(__dirname, 'src/renderer') },
  },
  test: {
    environment: 'jsdom',
    // Workers em thread: no Windows o pool de processos estoura o tempo de inicialização.
    pool: 'threads',
    setupFiles: [resolve(__dirname, 'src/renderer/test/setup.ts')],
    include: ['src/**/*.test.{ts,tsx}'],
    css: false,
    // Os testes de tela digitam campo a campo e levam de 1 a 3 s; com a
    // máquina carregada passam dos 5 s padrão. 15 s dá folga sem esconder
    // um teste travado.
    testTimeout: 15_000,
  },
});
