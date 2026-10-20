/**
 * Diz se a animação feita em JavaScript deve parar.
 *
 * O CSS global já desliga animações e transições com "Reduzir movimento"
 * (preferência do app) ou `prefers-reduced-motion` (preferência do sistema),
 * mas não alcança o que é desenhado por código, como a contagem dos KPIs e
 * as ondas do Login. Esses efeitos leem este hook. Sem `matchMedia` (como no
 * ambiente de testes) não dá para saber a preferência do sistema, então o
 * movimento é considerado reduzido. Plano em
 * `.AIs/docs/plans/desktop-frontend-fase-5.md`.
 */

import { useSyncExternalStore } from 'react';
import { usePreferencias } from '@/stores/preferencias';

const CONSULTA = '(prefers-reduced-motion: reduce)';

/** A consulta do sistema, ou `null` onde não há `matchMedia`. */
function consultaDoSistema(): MediaQueryList | null {
  return typeof window.matchMedia === 'function' ? window.matchMedia(CONSULTA) : null;
}

/** Acompanha mudanças da preferência do sistema enquanto o app está aberto. */
function assinar(avisar: () => void): () => void {
  const consulta = consultaDoSistema();
  consulta?.addEventListener('change', avisar);
  return () => consulta?.removeEventListener('change', avisar);
}

/** O sistema pede menos movimento (ou não há como saber). */
function sistemaReduz(): boolean {
  return consultaDoSistema()?.matches ?? true;
}

/** `true` se o app ou o sistema pedem menos movimento. */
export function useMovimentoReduzido(): boolean {
  const doApp = usePreferencias((estado) => estado.reduzirMovimento);
  const doSistema = useSyncExternalStore(assinar, sistemaReduz, () => true);
  return doApp || doSistema;
}
