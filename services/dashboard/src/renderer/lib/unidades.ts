/**
 * Unidades de exibição escolhidas nas Configurações.
 *
 * Os dados do VERS ficam sempre em mW, mWh e m/s² (como o backend entrega);
 * a conversão acontece só na hora de exibir. Os formatadores de
 * `lib/format.ts` leem daqui a unidade preferida, para que todas as telas
 * mudem juntas.
 */

import { usePreferencias, type Unidades } from '@/stores/preferencias';

/** Joules por mWh (1 mWh = 3,6 J). */
export const JOULES_POR_MWH = 3.6;

/** m/s² por g (gravidade padrão). */
export const MS2_POR_G = 9.80665;

/** Unidades preferidas no momento. */
export function unidadesAtuais(): Unidades {
  return usePreferencias.getState().unidades;
}

/**
 * Rótulo da unidade básica de uma grandeza ("mW" ou "W", "mWh" ou "J",
 * "m/s²" ou "g"), para legendas e cabeçalhos de tabela.
 */
export function rotuloUnidade(grandeza: keyof Unidades): string {
  return unidadesAtuais()[grandeza];
}
