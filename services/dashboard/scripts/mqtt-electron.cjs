/** Verifica o simulador existente pelo broker TLS até amostras e resumo no Electron real. */
const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const { resolve } = require('node:path');
const { readFileSync } = require('node:fs');
const carregar = createRequire(resolve(__dirname, '../../backend/package.json'));
const { connectAsync } = carregar('mqtt');
const { createSimulatedMessage } = carregar(resolve(__dirname, '../../backend/dist/services/backend/src/modules/mqtt/mqtt-simulator.js'));

/** Planeja/inicia pelo contrato público, publica e confere duplicata e energia de nove intervalos de1s. */
module.exports = async function provarMqtt(janela, { chamar, esperar, selecionar }) {
  console.log('PROVA_MARCO mqtt-inicio');
  assert.equal(process.env.NODE_ENV, 'test');
  const veiculo = process.env.VERS_PROOF_VEHICLE; const instalacao = process.env.VERS_PROOF_INSTALLATION;
  const anteriores = await chamar('window.vers.cadastro.veiculos(1)'); const principal = anteriores.data.find(v => v.isPrimary);
  const configuracoes = await chamar(`window.vers.cadastro.configuracoes(${JSON.stringify(instalacao)},1)`);
  assert.equal(configuracoes.ok, true);
  const criado = await chamar(`window.vers.ensaios.criar(${JSON.stringify({ installationId: instalacao,
    configurationId: configuracoes.data[0].id, name: 'Ensaio MQTT TLS simulado', terrain: 'OTHER', testLocation: 'Bancada local' })})`);
  assert.equal(criado.ok, true); const testeId = criado.data.id;
  console.log('PROVA_MARCO mqtt-planejado');
  const iniciado = await chamar(`window.vers.ensaios.iniciar(${JSON.stringify(testeId)})`); assert.equal(iniciado.ok, true);
  assert.equal((await chamar(`window.vers.cadastro.atualizarVeiculo(${JSON.stringify(veiculo)},{isPrimary:true})`)).ok, true);
  await new Promise(ok => { janela.webContents.once('did-finish-load', ok); janela.webContents.reload(); });
  await esperar(`document.body.textContent.includes('Autenticação e cadastro reais')`, 'sessão MQTT');
  await chamar(`document.querySelector('a[href="#/telemetria"]').click()`);
  await esperar(`!!document.querySelector('section[aria-label="Amostras do teste"] select')`, 'seletor MQTT');
  await selecionar('Teste', testeId);
  await esperar(`document.querySelector('[aria-label="Tempo real"]')?.textContent.startsWith('Tempo real conectado.')`, 'assinatura MQTT');
  console.log('PROVA_MARCO mqtt-assinado');
  // Dez segundos após iniciar garantem que todas as capturas do lote pertençam ao teste em execução.
  const restante = Date.parse(iniciado.data.startedAt) + 10500 - Date.now();
  if (restante > 0) await new Promise(ok => setTimeout(ok, restante));
  const mensagem = await createSimulatedMessage(process.env.VERS_PROOF_MQTT_STATE, 'vers-sim-001', testeId, new Date(Date.now() - 9000));
  console.log('PROVA_MARCO mqtt-gerado');
  const publisher = await connectAsync('mqtts://localhost:58883', { username: 'vers-sim-001', password: 'synthetic-one-only',
    ca: readFileSync(process.env.VERS_PROOF_CERTIFICATE), rejectUnauthorized: true, reconnectPeriod: 0, connectTimeout: 5000 });
  try {
    const topic = 'vers/v1/devices/vers-sim-001/telemetry'; const payload = JSON.stringify(mensagem);
    await publisher.publishAsync(topic, payload, { qos: 1 });
    console.log('PROVA_MARCO mqtt-publicado');
    await esperar(`document.querySelector('section[aria-label="Amostras do teste"]')?.textContent.includes('4,00')`, 'amostras MQTT na tela');
    console.log('PROVA_MARCO mqtt-visivel');
    const consultar = () => chamar(`window.vers.ensaios.amostras(${JSON.stringify(testeId)},{page:1,pageSize:100})`);
    const primeira = await consultar(); assert.equal(primeira.ok, true); assert.equal(primeira.meta.totalItems, 10);
    console.log('PROVA_MARCO mqtt-consultado');
    assert.ok(primeira.data.every(a => a.powerW === 2 && a.quality === 'VALID'));
    console.log('PROVA_MARCO mqtt-amostras-validas');
    await publisher.publishAsync(topic, payload, { qos: 1 });
    await new Promise(ok => setTimeout(ok, 500)); assert.equal((await consultar()).meta.totalItems, 10);
    assert.equal((await chamar(`window.vers.ensaios.finalizar(${JSON.stringify(testeId)},{status:'COMPLETED',outcome:'SATISFACTORY'})`)).ok, true);
    console.log('PROVA_MARCO mqtt-finalizado');
    // O contrato permite recuperação periódica de60s após término; não forçar cálculo pelo teste.
    let resumo; const limite = Date.now() + 65000;
    do {
      resumo = await chamar(`window.vers.ensaios.resumos(${JSON.stringify(testeId)})`);
      assert.ok(resumo.ok, `Resumo recusado: ${resumo.status ?? 0}/${resumo.erro ?? 'desconhecido'}`);
      if (resumo.ok && resumo.data.length === 1) break;
      assert.ok(Date.now() < limite, 'Resumo TEST não ficou disponível no ciclo de recuperação');
      await new Promise(ok => setTimeout(ok, 250));
    } while (true);
    console.log('PROVA_MARCO mqtt-resumo-lido');
    assert.equal(resumo.data[0].sampleCount, 10); assert.ok(Math.abs(resumo.data[0].recoveredEnergyWh - 18 / 3600) < 1e-10);
    await chamar(`localStorage.setItem('vers:prova-teste-alheio',${JSON.stringify(testeId)})`);
    console.log('PROVA_MARCO mqtt-isolamento-preparado');
    assert.equal((await chamar(`window.vers.cadastro.atualizarVeiculo(${JSON.stringify(principal.id)},{isPrimary:true})`)).ok, true);
    console.log('OK MQTT TLS: simulador10 amostras, duplicata idempotente e resumo18/3600Wh');
    // O controlador encerra somente este processo depois da confirmação dos asserts acima.
    console.log('PROVA_OK mqtt');
  } finally {
    console.log('PROVA_MARCO mqtt-encerrando');
    publisher.end(true);
  }
};
