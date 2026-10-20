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
      const campo = document.getElementById(label.htmlFor);
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(campo, ${JSON.stringify(valor)});
      campo.dispatchEvent(new Event('input', {bubbles:true}));
    })()`);
  }
  /** Aciona botão pelo texto que o usuário encontra na tela. */
  async function clicar(texto) {
    await chamar(`(() => { const raiz = document.querySelector('[role="dialog"]') ?? document; [...raiz.querySelectorAll('button')].find(b => b.textContent.trim() === ${JSON.stringify(texto)}).click(); })()`);
  }
  /** Seleciona recurso pelo controle nativo, preservando o caminho real do hook. */
  async function selecionar(rotulo, valor) {
    await chamar(`(() => { const l = [...document.querySelectorAll('label')].find(l => l.textContent.trim() === ${JSON.stringify(rotulo)}); const campo = document.getElementById(l.htmlFor); campo.value = ${JSON.stringify(valor)}; campo.dispatchEvent(new Event('change', {bubbles:true})); })()`);
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
