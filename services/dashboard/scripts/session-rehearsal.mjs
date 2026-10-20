/** Prova sessão com backend compilado, PostgreSQL/Redis locais e Electron real. */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomUUID, randomInt, createHmac } from 'node:crypto';
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
const { TELEMETRY_CALCULATION_VERSION } = requireBackend(resolve(backend, 'dist/services/backend/src/modules/data/telemetry-calculation.js'));
const database = 'postgresql://vers_test:vers_test_local_only@127.0.0.1:55432/vers_test?schema=public';
const secret = 'desktop-access-somente-sintetico-123';
const id = randomUUID();
const email = `${id}@desktop.invalid`;
const segundoId = randomUUID();
const segundoEmail = `${segundoId}@desktop.invalid`;
const novosEmails = ['dev', 'build'].map(modo => `${id}-${modo}@desktop.invalid`);
const veiculoId = randomUUID();
const instalacoes = [randomUUID(), randomUUID()];
// Oráculo civil da bancada atual (sem horário de verão); regras históricas ficam nos testes de período.
const diaBrasilia = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
const segunda = new Date(`${diaBrasilia}T12:00:00.000Z`);
segunda.setUTCDate(segunda.getUTCDate() - (segunda.getUTCDay() + 6) % 7);
const fimSemana = `${segunda.toISOString().slice(0, 10)}T03:00:00.000Z`;
segunda.setUTCDate(segunda.getUTCDate() - 7);
const inicioSemana = `${segunda.toISOString().slice(0, 10)}T03:00:00.000Z`;
const placas = ['QAA', 'QBB', 'QCC'].map(prefixo => `${prefixo}${String(randomInt(10000)).padStart(4, '0')}`);
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
        VERS_PROOF_SECOND_EMAIL: segundoEmail, VERS_PROOF_NEW_EMAIL: `${id}-${modo}@desktop.invalid`,
        VERS_PROOF_VEHICLE: veiculoId, VERS_PROOF_INSTALLATION: instalacoes[0], VERS_PROOF_INSTALLATION_TWO: instalacoes[1],
        VERS_PROOF_PLATE_ONE: placas[1], VERS_PROOF_PLATE_TWO: placas[2],
        VERS_PROOF_ENERGY_FROM: inicioSemana, VERS_PROOF_ENERGY_TO: fimSemana,
        ...(modo === 'dev' ? { ELECTRON_RENDERER_URL: 'http://localhost:5175' } : {}) },
    });
    let evidencia = '';
    processo.stdout.on('data', valor => {
      const texto = valor.toString(); evidencia += texto;
      for (const linha of texto.split(/\r?\n/)) if (/^PROVA_MARCO [a-z-]+$/.test(linha)) console.log(linha);
    });
    const prazo = setTimeout(() => { processo.kill(); falha(new Error('Electron excedeu prazo')); }, 90000);
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

/** Limpa exclusivamente veículos criados pelas duas contas sintéticas deste ensaio. */
async function limparVeiculosExtras() {
  await prisma.$transaction(async tx => {
    const links = await tx.userVehicle.findMany({ where: { userId: { in: [id, segundoId] }, vehicleId: { not: veiculoId } }, select: { vehicleId: true } });
    await tx.userVehicle.deleteMany({ where: { userId: { in: [id, segundoId] }, vehicleId: { in: links.map(v => v.vehicleId) } } });
    await tx.vehicle.deleteMany({ where: { id: { in: links.map(v => v.vehicleId) } } });
  });
}

/** Remove apenas ensaios das contas exclusivas desta execução, antes dos vínculos históricos SetNull. */
async function limparEnsaios() {
  const proprios = await prisma.test.findMany({ where: { createdById: { in: [id, segundoId] } }, select: { id: true } });
  const testIds = proprios.map(t => t.id);
  await prisma.$transaction([
    prisma.energySummary.deleteMany({ where: { testId: { in: testIds } } }),
    prisma.telemetrySample.deleteMany({ where: { testId: { in: testIds } } }),
    prisma.test.deleteMany({ where: { id: { in: testIds } } }),
  ]);
}

try {
  await portaLivre(53000); await portaLivre(5175);
  await prisma.$connect(); await redis.connect();
  pasta = await mkdtemp(resolve(tmpdir(), 'vers-desktop-session-'));
  await prisma.user.create({ data: { id, email, passwordHash: await hash('Desktop-Sintetico-123!', 10), status: 'ACTIVE' } });
  await prisma.user.create({ data: { id: segundoId, email: segundoEmail, passwordHash: await hash('Desktop-Sintetico-123!', 10), status: 'ACTIVE', displayName: 'Segunda conta sintética' } });
  await prisma.vehicle.create({ data: { id: veiculoId, licensePlate: placas[0], model: 'Veículo da bancada desktop',
    users: { create: { userId: id, relationship: 'OWNER', isPrimary: true } } } });
  for (const [indice, instalacaoId] of instalacoes.entries()) {
    await prisma.versInstallation.create({ data: { id: instalacaoId, vehicleId: veiculoId,
      systemModel: `Montagem desktop ${indice + 1}`, status: indice ? 'MAINTENANCE' : 'ACTIVE',
      configurations: { create: { name: `Configuração desktop ${indice + 1}`, version: 1,
        activePiezoCount: 3 + indice, piezoAssociation: 'PARALLEL', installationPoint: 'Bancada isolada', storageType: 'CAPACITOR' } },
      ...(indice === 0 ? { devices: { create: { deviceUid: `desktop-${id}`, name: 'Dispositivo sintético desktop', status: 'ONLINE' } } } : {}),
    } });
  }
  // Resumos persistidos conhecidos provam leitura/soma/cobertura; não substituem o ensaio de ingestão MQTT.
  for (const [indice, [instalacaoId, energia, qualidade, tipo]] of [
    [instalacoes[0], 0.1, 'GOOD', 'HOUR'], [instalacoes[0], 0.2, 'PARTIAL', 'HOUR'],
    [instalacoes[0], 7, 'INVALID', 'HOUR'], [instalacoes[1], 0.7, 'GOOD', 'HOUR'],
    [instalacoes[0], 100, 'GOOD', 'DAY'],
  ].entries()) {
    const periodStart = new Date(Date.parse(inicioSemana) + (tipo === 'HOUR' && instalacaoId === instalacoes[0] ? indice : 0) * 3600000);
    await prisma.energySummary.create({ data: { installationId: instalacaoId, testId: null, periodType: tipo,
      periodStart, periodEnd: new Date(periodStart.getTime() + (tipo === 'DAY' ? 24 : 1) * 3600000),
      recoveredEnergyWh: energia, averagePowerW: qualidade === 'INVALID' ? null : energia, peakPowerW: qualidade === 'INVALID' ? null : energia,
      quality: qualidade, sampleCount: qualidade === 'INVALID' ? 0 : 10, calculatedAt: new Date(), calculationVersion: TELEMETRY_CALCULATION_VERSION } });
  }
  child = spawn(process.execPath, [resolve(dashboard, 'scripts/realtime-backend.cjs')], {
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
    cacheDir: resolve(pasta, 'node_modules/.vite'),
    server: { host: 'localhost', port: 5175, strictPort: true } });
  await vite.listen();
  for (const modo of ['dev', 'build']) {
    await limparEnsaios();
    await limparVeiculosExtras();
    await prisma.userVehicle.updateMany({ where: { userId: id }, data: { isPrimary: false } });
    await prisma.userVehicle.update({ where: { userId_vehicleId: { userId: id, vehicleId: veiculoId } }, data: { isPrimary: true } });
    const perfil = resolve(pasta, modo);
    for (const etapa of ['login', 'realtime', 'resume', 'logged-out']) await provar(modo, etapa, perfil);
    assert.equal(await prisma.userVehicle.count({ where: { userId: id, isPrimary: true, vehicle: { licensePlate: placas[2] } } }), 1);
    assert.equal(await prisma.vehicle.count({ where: { id: veiculoId, model: 'Veículo da bancada desktop' } }), 1);
    assert.equal(await prisma.test.count({ where: { createdById: id, status: 'COMPLETED' } }), 1);
    assert.equal(await prisma.test.count({ where: { createdById: id, status: 'CANCELLED' } }), 1);
  }
  assert.equal(await prisma.user.count({ where: { email: { in: novosEmails }, status: 'PENDING_VERIFICATION' } }), 2);
  assert.equal(await prisma.refreshSession.count({ where: { userId: { in: [id, segundoId] }, revokedAt: null } }), 0);
  console.log('OK cadastros pendentes e sessões revogadas no banco');
} finally {
  if (child && child.exitCode === null) {
    await new Promise(ok => { child.once('exit', ok); child.kill(); });
  }
  await vite?.close();
  try {
  await prisma.auditEvent.deleteMany({ where: { requestId: id } });
  await limparEnsaios();
  await prisma.energySummary.deleteMany({ where: { installationId: { in: instalacoes } } });
  await limparVeiculosExtras();
  await prisma.userVehicle.deleteMany({ where: { userId: { in: [id, segundoId] }, vehicleId: veiculoId } });
  await prisma.vehicle.deleteMany({ where: { id: veiculoId } });
  await prisma.user.deleteMany({ where: { OR: [{ id: { in: [id, segundoId] } }, { email: { in: novosEmails } }] } });
  for (const conta of [email, segundoEmail, ...novosEmails]) {
    const digest = createHmac('sha256', secret).update(conta).digest('hex');
    if (redis.status === 'ready') await redis.del(`auth:login:${digest}:count`, `auth:login:${digest}:lock`);
  }
  } finally {
  redis.disconnect(); await prisma.$disconnect();
  if (pasta) {
    assert.ok(dirname(pasta) === tmpdir() && pasta.includes('vers-desktop-session-'));
    await rm(pasta, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  }
  }
}
