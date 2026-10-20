/** Prova sessão com backend compilado, PostgreSQL/Redis locais e Electron real. */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomUUID, createHmac } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { createServer as netServer } from 'node:net';
import { createServer } from 'vite';
import { loadConfigFromFile } from 'electron-vite';
import electron from 'electron';

const dashboard = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const backend = resolve(dashboard, '../backend');
const requireBackend = createRequire(resolve(backend, 'package.json'));
const { PrismaClient } = requireBackend('@prisma/client');
const { hash } = requireBackend('bcrypt');
const Redis = requireBackend('ioredis');
const database = 'postgresql://vers_test:vers_test_local_only@127.0.0.1:55432/vers_test?schema=public';
const secret = 'desktop-access-somente-sintetico-123';
const id = randomUUID();
const email = `${id}@desktop.invalid`;
const prisma = new PrismaClient({ datasources: { db: { url: database } } });
const redis = new Redis({ host: '127.0.0.1', port: 56379, lazyConnect: true, retryStrategy: () => null });
const ambiente = Object.fromEntries(['SystemRoot', 'PATH', 'TEMP', 'TMP', 'APPDATA', 'LOCALAPPDATA'].filter(k => process.env[k]).map(k => [k, process.env[k]]));
let child;
let vite;
let pasta;

/** Recusa porta ocupada para preservar processos existentes. */
async function portaLivre(porta) {
  await new Promise((ok, falha) => {
    const probe = netServer(); probe.once('error', falha);
    probe.listen(porta, '127.0.0.1', () => probe.close(ok));
  });
}

/** Aguarda prontidão real com prazo sem exibir configuração ou credenciais. */
async function pronto() {
  const prazo = Date.now() + 25000;
  while (Date.now() < prazo && child.exitCode === null) {
    try { if ((await fetch('http://127.0.0.1:53000/api/v1/health/ready')).ok) return; } catch { /* Aguarda bootstrap. */ }
    await new Promise(ok => setTimeout(ok, 200));
  }
  throw new Error('Backend de ensaio indisponível');
}

/** Executa nova instância oculta, reutilizando somente o perfil do próprio cenário. */
async function provar(modo, etapa, perfil) {
  await new Promise((ok, falha) => {
    const processo = spawn(electron, [resolve(dashboard, 'scripts/session-electron.cjs')], {
      cwd: dashboard, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...ambiente, VERS_DESKTOP_API_URL: 'http://localhost:53000/api/v1',
        VERS_PROOF_EMAIL: email, VERS_PROOF_ID: id, VERS_PROOF_PROFILE: perfil, VERS_PROOF_STAGE: etapa,
        ...(modo === 'dev' ? { ELECTRON_RENDERER_URL: 'http://localhost:5175' } : {}) },
    });
    let evidencia = '';
    processo.stdout.on('data', valor => { evidencia += valor.toString(); });
    const prazo = setTimeout(() => { processo.kill(); falha(new Error('Electron excedeu prazo')); }, 50000);
    processo.once('error', erro => { clearTimeout(prazo); falha(erro); });
    processo.once('exit', codigo => {
      clearTimeout(prazo);
      try { assert.equal(codigo, 0, `Falha no Electron: ${modo}/${etapa}: ${evidencia}`); assert.ok(evidencia.includes(`PROVA_OK ${etapa}`)); console.log(`OK Electron ${modo}/${etapa}`); ok(); }
      catch (erro) { falha(erro); }
    });
    // Somente mensagens de erro; a ponte não imprime respostas ou cookies.
    processo.stderr.on('data', valor => { if (valor.toString().includes('Assertion')) console.error('Falha de assert no Electron'); });
  });
}

try {
  await portaLivre(53000); await portaLivre(5175);
  await prisma.$connect(); await redis.connect();
  pasta = await mkdtemp(resolve(tmpdir(), 'vers-desktop-session-'));
  await prisma.user.create({ data: { id, email, passwordHash: await hash('Desktop-Sintetico-123!', 10), status: 'ACTIVE' } });
  child = spawn(process.execPath, [resolve(backend, 'dist/services/backend/src/main.js')], {
    cwd: backend, windowsHide: true, stdio: 'ignore', env: { ...ambiente,
      NODE_ENV: 'test', PORT: '53000', API_PREFIX: 'api/v1', DATABASE_URL: database,
      REDIS_HOST: '127.0.0.1', REDIS_PORT: '56379', CORS_ORIGINS: 'http://localhost:5174',
      JWT_ACCESS_SECRET: secret, JWT_REFRESH_SECRET: 'desktop-refresh-somente-sintetico-123',
      JWT_ACCESS_EXPIRATION: '15m', JWT_REFRESH_EXPIRATION: '7d',
      RATE_LIMIT_TTL_SECONDS: '60', RATE_LIMIT_MAX_REQUESTS: '1000', MQTT_ENABLED: 'false' },
  });
  await pronto();
  const configuracao = await loadConfigFromFile({ command: 'serve', mode: 'development' }, resolve(dashboard, 'electron.vite.config.ts'), dashboard);
  vite = await createServer({ ...configuracao.config.renderer, configFile: false, envFile: false,
    server: { host: 'localhost', port: 5175, strictPort: true } });
  await vite.listen();
  for (const modo of ['dev', 'build']) {
    const perfil = resolve(pasta, modo);
    for (const etapa of ['login', 'resume', 'logged-out']) await provar(modo, etapa, perfil);
  }
} finally {
  if (child && child.exitCode === null) {
    await new Promise(ok => { child.once('exit', ok); child.kill(); });
  }
  await vite?.close();
  await prisma.auditEvent.deleteMany({ where: { requestId: id } });
  await prisma.user.deleteMany({ where: { id } });
  const digest = createHmac('sha256', secret).update(email).digest('hex');
  if (redis.status === 'ready') await redis.del(`auth:login:${digest}:count`, `auth:login:${digest}:lock`);
  redis.disconnect(); await prisma.$disconnect();
  if (pasta) {
    assert.ok(dirname(pasta) === tmpdir() && pasta.includes('vers-desktop-session-'));
    await rm(pasta, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  }
}
