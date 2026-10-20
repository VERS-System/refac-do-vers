// Protege o carregador real do Prisma e seu merger em subprocessos sem carregar arquivos de ambiente.
import { execFileSync } from 'node:child_process';

describe('Compatibilidade do carregador Prisma', () => {
  it('carrega schema e migrations da configuração versionada sem erro', () => {
    // O subprocesso usa o CLI real fora do ambiente de módulos do Jest, sem acessar banco.
    execFileSync(process.execPath, ['-e', `
      const assert = require('node:assert/strict');
      const path = require('node:path');
      const { createRequire } = require('node:module');
      const fromPrisma = createRequire(require.resolve('prisma/config'));
      const { loadConfigFromFile } = fromPrisma('@prisma/config');
      (async () => {
        const loaded = await loadConfigFromFile({ configRoot: process.cwd() });
        assert.equal(loaded.error, undefined);
        assert.equal(loaded.config.schema, path.resolve('prisma/schema.prisma'));
        assert.equal(loaded.config.migrations.path, path.resolve('prisma/migrations'));
      })().catch(() => { process.exitCode = 1; });
    `], { cwd: process.cwd(), env: { SystemRoot: process.env.SystemRoot }, timeout: 15000, stdio: 'pipe' });
  });

  it('o merger resolvido pelo Prisma suporta objetos circulares sem esgotar a pilha', () => {
    // Resolve pelo pai exato para detectar regressão do override, sem adicionar dependência direta.
    execFileSync(process.execPath, ['-e', `
      const assert = require('node:assert/strict');
      const { createRequire } = require('node:module');
      const fromPrisma = createRequire(require.resolve('prisma/config'));
      const fromConfig = createRequire(fromPrisma.resolve('@prisma/config'));
      const { deepmerge } = fromConfig('deepmerge-ts');
      const left = { schema: 'schema.prisma' }; left.self = left;
      const right = { migrations: { path: 'migrations' } }; right.self = right;
      const merged = deepmerge(left, right);
      assert.equal(merged.schema, 'schema.prisma');
      assert.equal(merged.migrations.path, 'migrations');
    `], { cwd: process.cwd(), env: { SystemRoot: process.env.SystemRoot }, timeout: 15000, stdio: 'pipe' });
  });
});
