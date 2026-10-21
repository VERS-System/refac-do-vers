/** Prepara o ensaio antes do main instalado, mantendo perfil e janela de teste isolados. */
import assert from 'node:assert/strict';

/** Conecta somente ao inspector local reservado pelo controlador e carrega seu helper antes do ready. */
export async function prepararInstalado(porta, helper) {
  const prazo = Date.now() + 15000; let alvo;
  while (!alvo && Date.now() < prazo) {
    try {
      const lista = await (await fetch(`http://127.0.0.1:${porta}/json/list`, { signal: AbortSignal.timeout(1000) })).json();
      alvo = lista.find(t => t.type === 'node');
    } catch { /* Aguarda o processo instalado abrir o inspector de teste. */ }
    if (!alvo) await new Promise(ok => setTimeout(ok, 100));
  }
  assert.ok(alvo, 'Inspector do executável instalado indisponível');
  const endereco = new URL(alvo.webSocketDebuggerUrl);
  assert.equal(endereco.hostname, '127.0.0.1'); assert.equal(endereco.port, String(porta));
  const socket = new WebSocket(endereco); let sequencia = 0; const pendentes = new Map();
  let confirmarPausa; const pausado = new Promise(ok => { confirmarPausa = ok; });
  socket.addEventListener('message', evento => {
    const mensagem = JSON.parse(evento.data);
    if (mensagem.method === 'Debugger.paused') confirmarPausa();
    const pendente = pendentes.get(mensagem.id);
    if (pendente) {
      clearTimeout(pendente.timer); pendentes.delete(mensagem.id);
      if (mensagem.error) pendente.falha(new Error('Comando de inspeção recusado')); else pendente.ok(mensagem.result);
    }
  });
  /** Limita cada comando para falhar sem deixar o main instalado pausado indefinidamente. */
  function enviar(method, params = {}) {
    return new Promise((ok, falha) => {
      const id = ++sequencia;
      const timer = setTimeout(() => { pendentes.delete(id); falha(new Error('Inspector excedeu prazo')); }, 10000);
      pendentes.set(id, { ok, falha, timer }); socket.send(JSON.stringify({ id, method, params }));
    });
  }
  try {
    await new Promise((ok, falha) => { socket.addEventListener('open', ok, { once: true }); socket.addEventListener('error', falha, { once: true }); });
    await enviar('Runtime.enable'); await enviar('Debugger.enable');
    await enviar('Runtime.runIfWaitingForDebugger');
    await Promise.race([pausado, new Promise((_, falha) => setTimeout(() => falha(new Error('Main não pausou antes do ensaio')), 10000))]);
    const resultado = await enviar('Runtime.evaluate', { expression:
      `(() => { const carregar = process.getBuiltinModule('module').createRequire(${JSON.stringify(helper)}); if (carregar('electron').app.isReady()) throw new Error('Isolamento tardio'); carregar(${JSON.stringify(helper)}); return true; })()`, returnByValue: true });
    assert.ok(!resultado.exceptionDetails && resultado.result?.value === true, 'Não foi possível isolar o perfil antes do ready');
    await enviar('Debugger.resume');
  } finally {
    socket.close(); for (const p of pendentes.values()) { clearTimeout(p.timer); p.falha(new Error('Inspector encerrado')); }
  }
}
