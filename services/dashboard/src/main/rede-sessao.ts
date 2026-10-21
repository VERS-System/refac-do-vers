/** Adapta net.request para preservar Origin e cookies na partição exclusiva. */
import type { Net, Session } from 'electron';

/** Usa a pilha Chromium sem as restrições de cabeçalhos do fetch do renderer. */
export function fetchDaSessao(net: Pick<Net, 'request'>, sessao: Session): Session['fetch'] {
  return (input, opcoes = {}) => new Promise((resolver, rejeitar) => {
    if (opcoes.body != null && typeof opcoes.body !== 'string') {
      rejeitar(new Error('Corpo deve ser JSON serializado')); return;
    }
    const pedido = net.request({ url: String(input), method: opcoes.method ?? 'GET',
      session: sessao, useSessionCookies: true, redirect: 'error',
      origin: 'http://localhost:5174',
      headers: Object.fromEntries(new Headers(opcoes.headers).entries()),
    });
    const signal = opcoes.signal;
    /** Encerra conexão no prazo, sem repetir a operação que pode ter sido recebida. */
    const abortar = () => { pedido.abort(); rejeitar(new Error('Conexão interrompida')); };
    pedido.once('error', rejeitar);
    pedido.once('close', () => signal?.removeEventListener('abort', abortar));
    pedido.once('response', resposta => {
      const partes: Buffer[] = [];
      let tamanho = 0;
      resposta.on('error', rejeitar);
      resposta.on('aborted', () => rejeitar(new Error('Resposta interrompida')));
      resposta.on('data', parte => {
        tamanho += parte.length;
        if (tamanho > 1024 * 1024) abortar();
        else partes.push(Buffer.from(parte));
      });
      resposta.once('end', () => {
        resolver(new Response(resposta.statusCode === 204 ? null : Buffer.concat(partes), { status: resposta.statusCode }));
      });
    });
    if (signal?.aborted) { abortar(); return; }
    signal?.addEventListener('abort', abortar, { once: true });
    pedido.end(opcoes.body ?? undefined);
  });
}
