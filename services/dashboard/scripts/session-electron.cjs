/** Exercita a ponte verdadeira em janela oculta e perfil exclusivo do ensaio. */
const { app, BrowserWindow, session } = require('electron');
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const { resolve } = require('node:path');

app.setPath('userData', process.env.VERS_PROOF_PROFILE);
BrowserWindow.prototype.show = function manterOculta() { /* O ensaio não abre janela visível. */ };
const prazo = setTimeout(() => { console.error('Prazo do Electron excedido'); app.exit(1); }, 80000);
let renovacoes = 0;

/** Invoca somente a API pública do preload, no renderer real. */
async function executar(janela) {
  const chamar = codigo => janela.webContents.executeJavaScript(codigo);
  const nomePerfil = `${process.env.ELECTRON_RENDERER_URL ? 'Dev' : 'Build'} Perfil Electron real`;
  const perfil = () => chamar('window.vers.sessao.perfil()');
  /** Aguarda estado da interface real, sem depender de temporização fixa do React. */
  async function esperar(codigo, descricao) {
    const limite = Date.now() + 10000;
    while (!await chamar(codigo)) {
      if (Date.now() > limite) throw new Error(`Interface não chegou a: ${descricao}`);
      await new Promise(ok => setTimeout(ok, 50));
    }
  }
  /** Preenche um campo controlado pelo React, simulando evento de entrada do DOM. */
  async function preencher(rotulo, valor) {
    await chamar(`(() => {
      const label = [...document.querySelectorAll('label')].find(l => l.textContent.trim() === ${JSON.stringify(rotulo)});
      const campo = label && document.getElementById(label.htmlFor);
      if (!campo) return false;
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(campo, ${JSON.stringify(valor)});
      campo.dispatchEvent(new Event('input', {bubbles:true}));
      return true;
    })()`).then(ok => assert.ok(ok, `Campo ausente: ${rotulo}`));
  }
  /** Aciona botão pelo texto que o usuário encontra na tela. */
  async function clicar(texto) {
    const ok = await chamar(`(() => { const raiz = document.querySelector('[role="dialog"]') ?? document; const b = [...raiz.querySelectorAll('button')].find(b => b.textContent.trim() === ${JSON.stringify(texto)}); if (!b || b.disabled) return false; b.click(); return true; })()`);
    assert.ok(ok, `Botão indisponível: ${texto}`);
  }
  /** Seleciona recurso pelo controle nativo, preservando o caminho real do hook. */
  async function selecionar(rotulo, valor) {
    const ok = await chamar(`(() => { const l = [...document.querySelectorAll('label')].find(l => l.textContent.trim() === ${JSON.stringify(rotulo)}); const campo = l && document.getElementById(l.htmlFor); if (!campo || campo.disabled) return false; campo.value = ${JSON.stringify(valor)}; campo.dispatchEvent(new Event('change', {bubbles:true})); return true; })()`);
    assert.ok(ok, `Seleção indisponível: ${rotulo}`);
  }
  /** Cadastra pelo formulário de veículos e aguarda confirmação persistida. */
  async function criarVeiculo(placa) {
    await clicar('Novo veículo');
    await esperar(`!![...document.querySelectorAll('label')].find(l => l.textContent.trim() === 'Placa')`, 'formulário de veículo');
    await preencher('Placa', placa); await clicar('Salvar veículo');
    await esperar(`document.body.textContent.includes('Veículo cadastrado.')`, 'veículo salvo');
  }
  /** Entra pelo formulário e aguarda a área autenticada, não apenas resposta IPC. */
  async function entrarPelaTela(email) {
    await esperar(`!!document.querySelector('input[type="email"]')`, 'formulário de login');
    await preencher('E-mail', email); await preencher('Senha', 'Desktop-Sintetico-123!');
    await clicar('Entrar');
    await esperar(`document.body.textContent.includes('Autenticação e cadastro reais')`, 'área autenticada');
  }
  if (process.env.VERS_PROOF_STAGE === 'login') {
    const inicial = await perfil();
    assert.equal(inicial.status, 401, `perfil inicial: ${JSON.stringify(inicial)}`);
    const invalido = await chamar(`window.vers.sessao.entrar({email:${JSON.stringify(process.env.VERS_PROOF_EMAIL)},password:'incorreta'})`);
    assert.equal(invalido.status, 401, `login inválido: ${JSON.stringify(invalido)}`);
    const novo = JSON.stringify({ email: process.env.VERS_PROOF_NEW_EMAIL, password: 'Desktop-Sintetico-123!', displayName: 'Conta pendente sintética' });
    assert.equal((await chamar(`window.vers.sessao.registrar(${novo})`)).ok, true);
    assert.equal((await perfil()).status, 401);
    await entrarPelaTela(process.env.VERS_PROOF_EMAIL);
    assert.equal((await perfil()).usuario.email, process.env.VERS_PROOF_EMAIL);
    await chamar(`document.querySelector('a[href="#/configuracoes"]').click()`);
    await esperar(`!![...document.querySelectorAll('label')].find(l => l.textContent.trim() === 'Nome completo')`, 'perfil editável');
    assert.equal(await chamar(`document.querySelector('input[type="file"]').disabled`), true);
    await preencher('Nome completo', nomePerfil);
    await clicar('Salvar alterações');
    await esperar(`document.body.textContent.includes('Alterações salvas.')`, 'perfil salvo');
    assert.equal((await perfil()).usuario.displayName, nomePerfil);
    await chamar(`document.querySelector('a[href="#/veiculo-instalacao"]').click()`);
    await esperar(`!![...document.querySelectorAll('select')].find(s => [...s.options].some(o => o.value === ${JSON.stringify(process.env.VERS_PROOF_INSTALLATION)}))`, 'duas instalações disponíveis');
    assert.equal(await chamar(`document.body.textContent.includes('Selecione uma instalação para consultar seus dados.')`), true);
    await selecionar('Instalação exibida', process.env.VERS_PROOF_INSTALLATION);
    await esperar(`document.body.textContent.includes('Configuração desktop 1 · v1')`, 'configuração escolhida');
    assert.equal(await chamar(`document.body.textContent.includes('Harvester LTC3588')`), false);
    await selecionar('Instalação exibida', process.env.VERS_PROOF_INSTALLATION_TWO);
    await esperar(`document.body.textContent.includes('Configuração desktop 2 · v1')`, 'troca de instalação');
    assert.equal(await chamar(`document.body.textContent.includes('Configuração desktop 1 · v1')`), false);
    // A energia vem dos blocos da instalação escolhida, sem somar DAY/INVALID ou manter o recurso anterior.
    await chamar(`document.querySelector('a[href="#/energia"]').click()`);
    await esperar(`!![...document.querySelectorAll('[role="radio"]')].find(b => b.textContent.trim() === 'Semana')`, 'período da energia');
    await clicar('Semana');
    await esperar(`document.body.textContent.includes('700,00 mWh')`, 'energia da segunda instalação');
    await selecionar('Instalação exibida', process.env.VERS_PROOF_INSTALLATION);
    await esperar(`document.body.textContent.includes('300,00 mWh') && document.body.textContent.includes('2 de 168 horas utilizáveis')`, 'soma e cobertura oficiais');
    assert.equal(await chamar(`document.body.textContent.includes('0 inválidas')`), false);
    assert.equal(await chamar(`!!document.querySelector('details[open]')`), false);
    const consultaEnergia = { page: 1, periodFrom: process.env.VERS_PROOF_ENERGY_FROM, periodTo: process.env.VERS_PROOF_ENERGY_TO };
    const blocos = await chamar(`window.vers.ensaios.energia(${JSON.stringify(process.env.VERS_PROOF_INSTALLATION)}, ${JSON.stringify(consultaEnergia)})`);
    assert.equal(blocos.ok, true); assert.equal(blocos.data.length, 3);
    assert.ok(blocos.data.every(b => b.periodType === 'HOUR' && b.testId === null));
    // Intercepta o download real antes de qualquer gravação fora do perfil temporário.
    let nomeCsv = '';
    janela.webContents.session.once('will-download', (_evento, item) => { nomeCsv = item.getFilename(); item.cancel(); });
    await chamar(`window.__versCsvProva = null; window.__versCriarURL = URL.createObjectURL; URL.createObjectURL = b => { b.text().then(t => { window.__versCsvProva = t; }); return window.__versCriarURL.call(URL, b); }; void 0;`);
    await clicar('Exportar blocos CSV');
    await esperar(`typeof window.__versCsvProva === 'string'`, 'CSV completo da janela');
    const csv = await chamar('window.__versCsvProva');
    assert.equal(csv.trimEnd().split('\r\n').length, 169);
    assert.ok(csv.includes('America/Sao_Paulo') && csv.includes('Inválida') && csv.includes('Ausente'));
    const limiteDownload = Date.now() + 5000;
    while (!nomeCsv && Date.now() < limiteDownload) await new Promise(ok => setTimeout(ok, 25));
    assert.ok(nomeCsv.startsWith('vers-energia-'));
    await chamar(`URL.createObjectURL = window.__versCriarURL; delete window.__versCriarURL; delete window.__versCsvProva; document.querySelector('a[href="#/visao-geral"]').click()`);
    await esperar(`document.body.textContent.includes('300,00 mWh')`, 'mesmo resumo na visão geral');
    // O fluxo de planejamento passa pelo formulário e escolhe a configuração conhecida da bancada.
    await chamar(`document.querySelector('a[href="#/testes"]').click()`);
    await esperar(`!![...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Novo teste')`, 'tela de testes reais');
    await clicar('Novo teste');
    await esperar(`!![...document.querySelectorAll('label')].find(l => l.textContent.trim() === 'Configuração do teste')`, 'planejamento real');
    await selecionar('Instalação exibida', process.env.VERS_PROOF_INSTALLATION);
    const configuracoesTeste = await chamar(`window.vers.cadastro.configuracoes(${JSON.stringify(process.env.VERS_PROOF_INSTALLATION)}, 1)`);
    assert.equal(configuracoesTeste.ok, true);
    const configuracaoId = configuracoesTeste.data[0].id;
    await esperar(`!![...document.querySelectorAll('select option')].find(o => o.value === ${JSON.stringify(configuracaoId)})`, 'configuração do teste carregada');
    await selecionar('Configuração do teste', configuracaoId);
    await preencher('Nome do teste', 'Percurso Electron sintético'); await preencher('Local', 'Bancada local');
    await clicar('Planejar'); await esperar(`!document.querySelector('[role="dialog"]')`, 'teste planejado');
    await esperar(`!![...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Iniciar teste')`, 'teste disponível para iniciar');
    await clicar('Iniciar teste');
    await esperar(`!!document.querySelector('[role="dialog"]')`, 'confirmação de início');
    await clicar('Iniciar');
    await esperar(`!document.querySelector('[role="dialog"]') && !![...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Finalizar teste')`, 'teste iniciado');
    assert.equal(await chamar(`document.body.textContent.includes('Contador do dispositivo')`), true);
    assert.equal(await chamar(`document.body.textContent.includes('Bateria 68%')`), false);
    await clicar('Finalizar teste');
    await esperar(`!!document.querySelector('[role="dialog"]')`, 'formulário de finalização');
    await clicar('Finalizar');
    await esperar(`!document.querySelector('[role="dialog"]') && document.body.textContent.includes('Nenhum teste em andamento')`, 'teste finalizado');
    const historico = await chamar('window.vers.ensaios.listar({})');
    assert.equal(historico.ok, true); assert.equal(historico.data.length, 1);
    const testeFinal = historico.data[0];
    assert.equal(testeFinal.status, 'COMPLETED'); assert.ok(testeFinal.startedAt && testeFinal.endedAt);
    assert.equal(testeFinal.installationId, process.env.VERS_PROOF_INSTALLATION);
    const segundoTeste = await chamar(`window.vers.ensaios.criar(${JSON.stringify({ installationId: process.env.VERS_PROOF_INSTALLATION,
      configurationId: configuracaoId, name: 'Cancelamento Electron sintético', terrain: 'CITY', testLocation: 'Bancada local' })})`);
    assert.equal(segundoTeste.ok, true);
    const segundoTesteId = segundoTeste.data.id;
    assert.equal((await chamar(`window.vers.ensaios.iniciar(${JSON.stringify(segundoTesteId)})`)).data.status, 'RUNNING');
    assert.equal((await chamar(`window.vers.ensaios.cancelar(${JSON.stringify(segundoTesteId)}, {reason:'Encerramento da prova'})`)).data.status, 'CANCELLED');
    assert.equal((await chamar(`window.vers.ensaios.resumos(${JSON.stringify(testeFinal.id)})`)).ok, true);
    assert.equal((await chamar(`window.vers.ensaios.comparar(${JSON.stringify([testeFinal.id, segundoTesteId])})`)).ok, true);
    const semAmostras = await chamar(`window.vers.ensaios.amostras(${JSON.stringify(testeFinal.id)}, {})`);
    assert.equal(semAmostras.ok, true); assert.equal(semAmostras.meta.totalItems, 0);
    await chamar(`localStorage.setItem('vers:prova-teste-alheio', ${JSON.stringify(testeFinal.id)})`);
    await chamar(`document.querySelector('a[href="#/telemetria"]').click()`);
    await esperar(`document.body.textContent.includes('Consulta periódica a cada 10 s') && document.body.textContent.includes('Nenhuma amostra neste teste.')`, 'telemetria real vazia');
    await chamar(`document.querySelector('a[href="#/veiculos"]').click()`);
    await esperar(`!![...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Novo veículo')`, 'cadastro de veículos');
    await criarVeiculo(process.env.VERS_PROOF_PLATE_ONE);
    await clicar('Editar'); await preencher('Modelo', 'Modelo editado no Electron'); await clicar('Salvar alterações');
    await esperar(`document.body.textContent.includes('Alterações salvas.')`, 'edição persistida');
    await clicar('Tornar principal'); await esperar(`!!document.querySelector('[role="dialog"]')`, 'confirmação de principal'); await clicar('Tornar principal');
    await esperar(`!document.querySelector('[role="dialog"]')`, 'principal confirmado');
    await criarVeiculo(process.env.VERS_PROOF_PLATE_TWO);
    const lista = await chamar('window.vers.cadastro.veiculos(1)');
    assert.equal(lista.ok, true);
    const primeiro = lista.data.find(v => v.licensePlate === process.env.VERS_PROOF_PLATE_ONE);
    const segundo = lista.data.find(v => v.licensePlate === process.env.VERS_PROOF_PLATE_TWO);
    assert.equal(primeiro.model, 'Modelo editado no Electron'); assert.equal(primeiro.isPrimary, true);
    await chamar(`[...document.querySelectorAll('button')].find(b => b.getAttribute('aria-label') === 'Ver Modelo editado no Electron').click()`);
    await clicar('Remover'); await esperar(`!!document.querySelector('[role="dialog"]')`, 'remoção com substituto');
    await selecionar('Novo veículo principal', segundo.id); await clicar('Remover veículo');
    await esperar(`document.body.textContent.includes('Veículo removido.')`, 'remoção confirmada');
    const depois = await chamar('window.vers.cadastro.veiculos(1)');
    assert.equal(depois.data.some(v => v.id === primeiro.id), false);
    assert.equal(depois.data.find(v => v.id === segundo.id).isPrimary, true);
    const cookies = await session.fromPartition('persist:vers-api').cookies.get({});
    assert.equal(cookies.filter(c => ['vers_access', 'vers_refresh'].includes(c.name)).length, 2);
    assert.ok(cookies.every(c => c.httpOnly));
    assert.deepEqual(await janela.webContents.session.cookies.get({}), []);
    assert.equal(await chamar('document.cookie'), '');
  } else if (process.env.VERS_PROOF_STAGE === 'resume') {
    await esperar(`document.body.textContent.includes('Autenticação e cadastro reais')`, 'sessão restaurada');
    assert.equal((await perfil()).usuario.email, process.env.VERS_PROOF_EMAIL);
    const listaRestaurada = await chamar('window.vers.cadastro.veiculos(1)');
    assert.equal(listaRestaurada.data.find(v => v.licensePlate === process.env.VERS_PROOF_PLATE_TWO).isPrimary, true);
    await session.fromPartition('persist:vers-api').cookies.remove('http://localhost:53000', 'vers_access');
    const antes = renovacoes;
    const leituras = await chamar('Promise.all([window.vers.sessao.perfil(), window.vers.sessao.perfil()])');
    assert.ok(leituras.every(r => r.ok)); assert.equal(renovacoes - antes, 1);
    assert.equal((await perfil()).ok, true);
    await chamar(`document.querySelector('a[href="#/configuracoes"]').click()`);
    await esperar(`!![...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Encerrar todas as sessões')`, 'sessões');
    await clicar('Encerrar todas as sessões'); await clicar('Encerrar sessões');
    await esperar(`!!document.querySelector('input[type="email"]')`, 'logout-all confirmado');
    assert.equal((await perfil()).status, 401);
    await entrarPelaTela(process.env.VERS_PROOF_SECOND_EMAIL);
    assert.equal((await perfil()).usuario.email, process.env.VERS_PROOF_SECOND_EMAIL);
    assert.equal((await chamar('window.vers.cadastro.veiculos(1)')).data.length, 0);
    const negar = await chamar(`window.vers.cadastro.atualizarVeiculo(${JSON.stringify(process.env.VERS_PROOF_VEHICLE)}, {model:'Acesso alheio'})`);
    assert.equal(negar.status, 404);
    const negarConfiguracao = await chamar(`window.vers.cadastro.configuracoes(${JSON.stringify(process.env.VERS_PROOF_INSTALLATION)}, 1)`);
    assert.equal(negarConfiguracao.status, 404);
    assert.equal((await chamar(`window.vers.ensaios.energia(${JSON.stringify(process.env.VERS_PROOF_INSTALLATION)}, ${JSON.stringify({ page: 1,
      periodFrom: process.env.VERS_PROOF_ENERGY_FROM, periodTo: process.env.VERS_PROOF_ENERGY_TO })})`)).status, 404);
    const testeAlheio = await chamar(`localStorage.getItem('vers:prova-teste-alheio')`);
    assert.ok(testeAlheio);
    assert.equal((await chamar(`window.vers.ensaios.amostras(${JSON.stringify(testeAlheio)}, {})`)).status, 404);
    assert.equal((await chamar(`window.vers.ensaios.iniciar(${JSON.stringify(testeAlheio)})`)).status, 404);
    await chamar(`localStorage.removeItem('vers:prova-teste-alheio')`);
    await esperar(`document.body.textContent.includes('Nenhum veículo principal definido')`, 'conta sem veículo');
    const rascunho = JSON.stringify({ email: process.env.VERS_PROOF_SECOND_EMAIL, placa: process.env.VERS_PROOF_PLATE_ONE, fabricante: '', modelo: '', ano: '' });
    await chamar(`localStorage.setItem('vers:veiculo-do-cadastro', ${JSON.stringify(rascunho)}); window.location.hash = '#/primeiro-veiculo';`);
    await esperar(`!![...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Cadastrar veículo')`, 'primeiro veículo');
    await clicar('Cadastrar veículo');
    await esperar(`document.body.textContent.includes('Autenticação e cadastro reais')`, 'primeiro veículo persistido');
    const primeiroDaConta = await chamar('window.vers.cadastro.veiculos(1)');
    assert.equal(primeiroDaConta.data.length, 1); assert.equal(primeiroDaConta.data[0].isPrimary, true);
    assert.equal(await chamar(`document.body.textContent.includes('Perfil Electron real')`), false);
    await chamar(`document.querySelector('button[aria-label="Sair"]').click()`);
    await esperar(`!!document.querySelector('input[type="email"]')`, 'logout da segunda conta');
  } else assert.equal((await perfil()).status, 401);
  console.log(`PROVA_OK ${process.env.VERS_PROOF_STAGE}`);
}

app.once('browser-window-created', (_evento, janela) => {
  janela.webContents.once('did-finish-load', () => {
    executar(janela).then(() => { clearTimeout(prazo); app.exit(0); })
      .catch(erro => { console.log(`PROVA_FALHA ${erro.message}`); app.exit(1); });
  });
});

/** Adiciona identidade de auditoria apenas nas requisições do processo de teste. */
app.whenReady().then(() => {
  session.fromPartition('persist:vers-api').webRequest.onBeforeSendHeaders((detalhes, concluir) => {
    if (detalhes.method === 'POST' && detalhes.url.endsWith('/auth/refresh')) renovacoes++;
    concluir({ requestHeaders: { ...detalhes.requestHeaders, 'X-Request-Id': process.env.VERS_PROOF_ID } });
  });
});
void import(pathToFileURL(resolve(__dirname, '../out/main/index.js')).href);
