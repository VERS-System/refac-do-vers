/** Exercita a ponte verdadeira em janela oculta e perfil exclusivo do ensaio. */
const { app, BrowserWindow, session } = require('electron');
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const { resolve } = require('node:path');

app.setPath('userData', process.env.VERS_PROOF_PROFILE);
BrowserWindow.prototype.show = function manterOculta() { /* O ensaio não abre janela visível. */ };
const prazo = setTimeout(() => { console.error('Prazo do Electron excedido'); app.exit(1); }, 40000);
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
    await chamar(`[...document.querySelectorAll('button')].find(b => b.textContent.trim() === ${JSON.stringify(texto)}).click()`);
  }
  /** Entra pelo formulário e aguarda a área autenticada, não apenas resposta IPC. */
  async function entrarPelaTela(email) {
    await esperar(`!!document.querySelector('input[type="email"]')`, 'formulário de login');
    await preencher('E-mail', email); await preencher('Senha', 'Desktop-Sintetico-123!');
    await clicar('Entrar');
    await esperar(`document.body.textContent.includes('Autenticação real · demais áreas em demonstração')`, 'área autenticada');
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
    const cookies = await session.fromPartition('persist:vers-api').cookies.get({});
    assert.equal(cookies.filter(c => ['vers_access', 'vers_refresh'].includes(c.name)).length, 2);
    assert.ok(cookies.every(c => c.httpOnly));
    assert.deepEqual(await janela.webContents.session.cookies.get({}), []);
    assert.equal(await chamar('document.cookie'), '');
  } else if (process.env.VERS_PROOF_STAGE === 'resume') {
    await esperar(`document.body.textContent.includes('Autenticação real · demais áreas em demonstração')`, 'sessão restaurada');
    assert.equal((await perfil()).usuario.email, process.env.VERS_PROOF_EMAIL);
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
