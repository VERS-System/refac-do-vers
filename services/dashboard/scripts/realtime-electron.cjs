/** Prova avisos reais Redis/Socket.IO/REST na interface, usando somente fixtures próprias. */
const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const { resolve } = require('node:path');
const { randomUUID } = require('node:crypto');
const { session } = require('electron');
const { io } = require('socket.io-client');
const requireBackend = createRequire(resolve(__dirname, '../../backend/package.json'));
const { PrismaClient } = requireBackend('@prisma/client');
const Redis = requireBackend('ioredis');

/** Faz alterações persistidas e avisos separados: o evento nunca fornece o valor à tela. */
module.exports = async function provarTempoReal(janela, { chamar, esperar, selecionar, clicar, entrarPelaTela }) {
  const prisma = new PrismaClient({ datasources: { db: { url: 'postgresql://vers_test:vers_test_local_only@127.0.0.1:55432/vers_test?schema=public' } } });
  const redis = new Redis({ host: '127.0.0.1', port: 56379, lazyConnect: true, retryStrategy: () => null });
  const instalacao = process.env.VERS_PROOF_INSTALLATION;
  const recurso = { type: 'installation', id: instalacao };
  let socket; let original;
  /** Publica aviso contratual antigo e repetível para provar que a data não funciona como cursor. */
  const avisar = (r = recurso) => redis.publish(`vers:v1:realtime:${r.type}:${r.id}`, JSON.stringify({
    version: 1, type: 'data.updated', resource: r, occurredAt: '2020-01-01T00:00:00.000Z',
  }));
  /** Aguarda ACK real com prazo e sem imprimir mensagens, cookies ou respostas brutas. */
  async function assinar(r) { return socket.timeout(5000).emitWithAck('subscribe', { version: 1, resource: r }); }
  /** Confere o KPI nomeado, evitando coincidências com eixos, tabelas ou a outra instalação. */
  const energia = texto => esperar(`document.querySelector('[aria-label="Energia dos blocos utilizáveis"]')?.textContent.includes(${JSON.stringify(texto)})`, `energia ${texto}`);
  try {
    console.log('PROVA_MARCO inicio');
    await prisma.$connect(); await redis.connect();
    original = await prisma.energySummary.findFirstOrThrow({ where: { installationId: instalacao, periodType: 'HOUR', quality: 'GOOD' } });
    const lista = await chamar('window.vers.cadastro.veiculos(1)');
    const principal = lista.data.find(v => v.isPrimary);
    assert.ok(principal);
    assert.equal((await chamar(`window.vers.cadastro.atualizarVeiculo(${JSON.stringify(process.env.VERS_PROOF_VEHICLE)}, {isPrimary:true})`)).ok, true);
    await new Promise(ok => { janela.webContents.once('did-finish-load', ok); janela.webContents.reload(); });
    await esperar(`document.body.textContent.includes('Autenticação e cadastro reais')`, 'sessão após recarga');
    await chamar(`document.querySelector('a[href="#/energia"]').click()`);
    await esperar(`!!document.querySelector('select')`, 'seletor de instalação');
    await selecionar('Instalação exibida', instalacao); await clicar('Semana'); await energia('300,00');
    await esperar(`document.querySelector('[aria-label="Tempo real"]')?.textContent.startsWith('Tempo real conectado.')`, 'ACK inicial');
    console.log('PROVA_MARCO assinatura');
    const cookies = await session.fromPartition('persist:vers-api').cookies.get({ url: 'http://localhost:53000/api/v1', name: 'vers_access' });
    assert.equal(cookies.length, 1);
    socket = io('http://localhost:53000/realtime', { transports: ['websocket'], reconnection: false, forceNew: true,
      extraHeaders: { Origin: 'http://localhost:5174', Cookie: `vers_access=${cookies[0].value}` } });
    await new Promise((ok, falha) => { socket.once('connect', ok); socket.once('connect_error', erro => falha(new Error(`Segundo cliente indisponível: ${['UNAUTHENTICATED', 'REALTIME_UNAVAILABLE', 'LIMIT_EXCEEDED', 'websocket error'].includes(erro.message) ? erro.message : 'transporte'}`))); });
    assert.equal((await assinar(recurso)).ok, true);
    assert.equal((await assinar({ type: 'installation', id: randomUUID() })).code, 'RESOURCE_UNAVAILABLE');
    let recebidos = 0; socket.on('data.updated', () => recebidos++);
    await prisma.energySummary.update({ where: { id: original.id }, data: { recoveredEnergyWh: 0.4 } });
    await Promise.all(Array.from({ length: 20 }, () => avisar())); await energia('600,00');
    assert.ok(recebidos > 0, 'Segundo cliente não recebeu o aviso');
    await selecionar('Instalação exibida', process.env.VERS_PROOF_INSTALLATION_TWO); await energia('700,00');
    await esperar(`document.querySelector('[aria-label="Tempo real"]')?.textContent.startsWith('Tempo real conectado.')`, 'ACK da segunda instalação');
    await prisma.energySummary.update({ where: { id: original.id }, data: { recoveredEnergyWh: 0.6 } }); await avisar();
    assert.equal(await chamar(`document.querySelector('[aria-label="Energia dos blocos utilizáveis"]').textContent.includes('700,00')`), true);
    await selecionar('Instalação exibida', instalacao); await energia('800,00');
    await esperar(`document.querySelector('[aria-label="Tempo real"]')?.textContent.startsWith('Tempo real conectado.')`, 'reassinatura da instalação');
    // Apenas o Redis isolado da bancada: encerra a conexão Pub/Sub, sem parar containers de uso.
    await redis.call('CLIENT', 'KILL', 'TYPE', 'pubsub');
    await esperar(`document.querySelector('[aria-label="Tempo real"]')?.textContent.includes('desconectado')`, 'queda do Redis');
    await prisma.energySummary.update({ where: { id: original.id }, data: { recoveredEnergyWh: 0.3 } });
    // Não publica: o novo snapshot após ACK deve recuperar a mudança perdida.
    await esperar(`document.querySelector('[aria-label="Tempo real"]')?.textContent.startsWith('Tempo real conectado.')`, 'recuperação do Redis'); await energia('500,00');
    console.log('PROVA_MARCO redis-recuperado');
    const teste = await prisma.test.findFirstOrThrow({ where: { createdById: process.env.VERS_PROOF_ID, status: 'COMPLETED' } });
    await chamar(`document.querySelector('a[href="#/telemetria"]').click()`);
    await esperar(`!!document.querySelector('section[aria-label="Amostras do teste"] select')`, 'teste na telemetria');
    await selecionar('Teste', teste.id);
    console.log('PROVA_MARCO teste-selecionado');
    await esperar(`document.querySelector('[aria-label="Tempo real"]')?.textContent.startsWith('Tempo real conectado.')`, 'ACK do teste');
    console.log('PROVA_MARCO teste-assinado');
    const amostra = await prisma.telemetrySample.create({ data: { testId: teste.id, installationId: teste.installationId,
      sampleIndex: 0, capturedAt: teste.startedAt, voltageV: 7.25, currentA: 0.2, powerW: 1.45,
      accumulatedEnergyWh: 0.123, quality: 'VALID' } });
    console.log('PROVA_MARCO amostra-persistida');
    const inicioAviso = Date.now(); await avisar({ type: 'test', id: teste.id });
    await esperar(`document.querySelector('section[aria-label="Amostras do teste"]')?.textContent.includes('7,25')`, 'amostra por aviso de teste');
    assert.ok(Date.now() - inicioAviso < 5000, 'A atualização não deve depender do intervalo REST de10s');
    console.log('PROVA_MARCO amostra-visivel');
    await prisma.telemetrySample.delete({ where: { id: amostra.id } });
    // Volta à instalação para provocar revalidação de sessão por aviso autorizado.
    await chamar(`document.querySelector('a[href="#/energia"]').click()`);
    await esperar(`document.querySelector('[aria-label="Tempo real"]')?.textContent.startsWith('Tempo real conectado.')`, 'ACK antes da revogação');
    socket.disconnect();
    await prisma.refreshSession.updateMany({ where: { userId: process.env.VERS_PROOF_ID, revokedAt: null }, data: { revokedAt: new Date() } });
    await avisar(); await esperar(`!!document.querySelector('input[type="email"]')`, 'revogação da sessão refletida na tela');
    console.log('PROVA_MARCO sessao-revogada');
    assert.equal(await chamar(`!!document.querySelector('[aria-label="Energia dos blocos utilizáveis"]')`), false);
    await entrarPelaTela(process.env.VERS_PROOF_SECOND_EMAIL);
    await esperar(`document.body.textContent.includes('Nenhum veículo principal definido')`, 'conta B sem instalação');
    await new Promise(ok => setTimeout(ok, 100));
    // A conta B tenta assinar a instalação A pela ponte verdadeira e recebe negação genérica.
    const observacao = randomUUID();
    await chamar(`window.__versNegacao = null; window.__versRemover = window.vers.tempoReal.receber(a => { if(a.observacao === ${JSON.stringify(observacao)}) window.__versNegacao = a.tipo; }); void 0`);
    await chamar(`window.vers.tempoReal.observar(${JSON.stringify({ observacao, recursos: [recurso] })})`);
    await esperar(`window.__versNegacao === 'recurso-indisponivel'`, 'negação da assinatura alheia');
    await chamar(`window.__versRemover(); delete window.__versNegacao; delete window.__versRemover; document.querySelector('button[aria-label="Sair"]').click();`);
    await entrarPelaTela(process.env.VERS_PROOF_EMAIL);
    await prisma.energySummary.update({ where: { id: original.id }, data: { recoveredEnergyWh: original.recoveredEnergyWh } });
    assert.equal((await chamar(`window.vers.cadastro.atualizarVeiculo(${JSON.stringify(principal.id)}, {isPrimary:true})`)).ok, true);
    console.log('OK tempo real: dois clientes, rajada, data antiga, troca, queda Redis, snapshot perdido, telemetria positiva, revogação e conta alheia');
  } finally {
    socket?.disconnect();
    if (original) await prisma.energySummary.update({ where: { id: original.id }, data: { recoveredEnergyWh: original.recoveredEnergyWh } });
    redis.disconnect(); await prisma.$disconnect();
  }
};
