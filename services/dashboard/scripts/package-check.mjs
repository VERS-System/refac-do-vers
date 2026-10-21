/** Confere conteúdo permitido e hash do instalador, sem extrair segredos ou executar instalação. */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { resolve, dirname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const dashboard = resolve(dirname(fileURLToPath(import.meta.url)), '..');
// Usa a ferramenta já instalada pelo pnpm, sem acrescentar dependência de execução ao app.
const deposito = resolve(dashboard, '../../node_modules/.pnpm');
const versoes = (await readdir(deposito)).filter(n => n.startsWith('@electron+asar@'));
assert.equal(versoes.length, 1, 'Selecione explicitamente a ferramenta asar quando houver múltiplas versões');
const carregar = createRequire(import.meta.url);
const asar = carregar(resolve(deposito, versoes[0], 'node_modules/@electron/asar'));
const pasta = resolve(dashboard, '../../output/desktop-delivery');
const arquivo = resolve(pasta, 'win-unpacked/resources/app.asar');
const arquivos = asar.listPackage(arquivo).map(a => a.replaceAll('\\', '/'));
assert.ok(arquivos.includes('/out/main/index.js') && arquivos.includes('/out/preload/index.cjs') && arquivos.includes('/out/renderer/index.html'));
assert.ok(!arquivos.some(a => /(^|[/\\])\.env(?:\.|$)|\.(?:pem|key|pfx)$/i.test(a)), 'Arquivo sensível no pacote');
for (const nome of ['/out/main/index.js', '/out/preload/index.cjs']) {
  const fonte = asar.extractFile(arquivo, normalize(nome.slice(1))).toString();
  assert.equal(fonte, await readFile(resolve(dashboard, nome.slice(1)), 'utf8'), 'Pacote diverge do build validado');
  assert.ok(!/desktop-access-somente|Desktop-Sintetico-123|synthetic-one-only|backend-test-only/.test(fonte), 'Credencial de ensaio incluída');
}
const instalador = 'VERS Dashboard Setup 0.1.0.exe';
const bytes = await readFile(resolve(pasta, instalador));
assert.equal(bytes.subarray(0, 2).toString(), 'MZ');
const hash = createHash('sha256').update(bytes).digest('hex');
await writeFile(resolve(pasta, 'SHA256SUMS.txt'), `${hash}  ${instalador}\n`);
console.log(`OK pacote: ${arquivos.length} entradas; instalador ${bytes.length} bytes; SHA256 ${hash}`);
