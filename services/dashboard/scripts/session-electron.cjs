/** Exercita a ponte verdadeira em janela oculta e perfil exclusivo do ensaio. */
const { app, BrowserWindow, session } = require('electron');
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const { resolve } = require('node:path');

app.setPath('userData', process.env.VERS_PROOF_PROFILE);
BrowserWindow.prototype.show = function manterOculta() { /* O ensaio não abre janela visível. */ };
const prazo = setTimeout(() => { console.error('Prazo do Electron excedido'); app.exit(1); }, 40000);

/** Invoca somente a API pública do preload, no renderer real. */
async function executar(janela) {
  const chamar = codigo => janela.webContents.executeJavaScript(codigo);
  const credenciais = JSON.stringify({ email: process.env.VERS_PROOF_EMAIL, password: 'Desktop-Sintetico-123!' });
  const perfil = () => chamar('window.vers.sessao.perfil()');
  if (process.env.VERS_PROOF_STAGE === 'login') {
    const inicial = await perfil();
    assert.equal(inicial.status, 401, `perfil inicial: ${JSON.stringify(inicial)}`);
    const invalido = await chamar(`window.vers.sessao.entrar({email:${JSON.stringify(process.env.VERS_PROOF_EMAIL)},password:'incorreta'})`);
    assert.equal(invalido.status, 401, `login inválido: ${JSON.stringify(invalido)}`);
    assert.equal((await chamar(`window.vers.sessao.entrar(${credenciais})`)).ok, true);
    assert.equal((await perfil()).usuario.email, process.env.VERS_PROOF_EMAIL);
    const cookies = await session.fromPartition('persist:vers-api').cookies.get({});
    assert.equal(cookies.filter(c => ['vers_access', 'vers_refresh'].includes(c.name)).length, 2);
    assert.ok(cookies.every(c => c.httpOnly));
    assert.deepEqual(await janela.webContents.session.cookies.get({}), []);
    assert.equal(await chamar('document.cookie'), '');
  } else if (process.env.VERS_PROOF_STAGE === 'resume') {
    assert.equal((await perfil()).usuario.email, process.env.VERS_PROOF_EMAIL);
    assert.equal((await chamar('window.vers.sessao.renovar()')).ok, true);
    assert.equal((await perfil()).ok, true);
    assert.equal((await chamar('window.vers.sessao.sair()')).ok, true);
    assert.equal((await perfil()).status, 401);
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
    concluir({ requestHeaders: { ...detalhes.requestHeaders, 'X-Request-Id': process.env.VERS_PROOF_ID } });
  });
});
void import(pathToFileURL(resolve(__dirname, '../out/main/index.js')).href);
