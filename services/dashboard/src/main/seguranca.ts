/**
 * Regras de segurança do app desktop empacotado (Fase 5).
 *
 * - `POLITICA_CSP`: a política de conteúdo injetada no `index.html` do build
 *   (ver `electron.vite.config.ts`). Só código do próprio app roda; estilos
 *   inline são liberados porque React e Recharts usam o atributo `style`;
 *   imagens `blob:` e `data:` cobrem a foto do perfil e o CSV exportado; a
 *   conexão vai à API local (o endereço da API em produção ainda não existe
 *   e precisa entrar aqui quando existir). No desenvolvimento a política não
 *   é aplicada, porque o Vite injeta script inline e usa websocket.
 * - `navegacaoPermitida`: a janela só navega dentro do próprio app (trocar
 *   de tela muda só o hash); qualquer saída é bloqueada no processo
 *   principal.
 *
 * Plano em `.AIs/docs/plans/desktop-frontend-fase-5.md`.
 */

/** Diretivas da política, uma por linha para facilitar a revisão. */
const DIRETIVAS: Record<string, string[]> = {
  'default-src': ["'self'"],
  'script-src': ["'self'"],
  'style-src': ["'self'", "'unsafe-inline'"],
  'img-src': ["'self'", 'data:', 'blob:'],
  'font-src': ["'self'", 'data:'],
  'connect-src': ["'self'", 'http://localhost:3000', 'ws://localhost:3000'],
  'object-src': ["'none'"],
  'base-uri': ["'none'"],
  'form-action': ["'self'"],
  'frame-src': ["'none'"],
};

export const POLITICA_CSP = Object.entries(DIRETIVAS)
  .map(([nome, valores]) => `${nome} ${valores.join(' ')}`)
  .join('; ');

/** Endereço sem o hash (a rota do HashRouter), para comparar a página. */
function semHash(url: URL): string {
  return `${url.protocol}//${url.host}${url.pathname}`;
}

/** `true` se `destino` é a mesma página do app (só a rota muda). */
export function navegacaoPermitida(destino: string, atual: string): boolean {
  try {
    return semHash(new URL(destino)) === semHash(new URL(atual));
  } catch {
    return false;
  }
}
