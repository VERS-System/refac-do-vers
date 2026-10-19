/** Confere que os comandos e a infraestrutura usam o dashboard como aplicativo Electron. */
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const dashboard = process.cwd();
const repository = resolve(dashboard, '../..');

describe('execução Electron do dashboard', () => {
  /** Evita reintroduzir servidor web/container no fluxo principal do aplicativo desktop. */
  it('mantém Electron no host e remove os atalhos web e Docker antigos', () => {
    const manifest = JSON.parse(readFileSync(resolve(dashboard, 'package.json'), 'utf8'));
    expect(manifest.name).toBe('@vers/dashboard');
    expect(manifest.scripts.dev).toBe('electron-vite dev');
    expect(manifest.scripts['dev:web']).toBeUndefined();
    expect(existsSync(resolve(dashboard, 'vite.web.config.ts'))).toBe(false);
    expect(existsSync(resolve(repository, 'docker/Dockerfile.dashboard'))).toBe(false);
    expect(readFileSync(resolve(repository, 'docker-compose.yml'), 'utf8')).not.toMatch(/^  dashboard:/m);
  });

  /** Porta estável mantém o Origin de desenvolvimento compatível com a allowlist existente. */
  it('fixa origem de desenvolvimento em localhost:5174 sem trocar de porta ocupada', () => {
    const config = readFileSync(resolve(dashboard, 'electron.vite.config.ts'), 'utf8');
    expect(config).toMatch(/host:\s*'localhost'/);
    expect(config).toMatch(/port:\s*5174/);
    expect(config).toMatch(/strictPort:\s*true/);
  });
});
