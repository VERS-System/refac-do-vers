/**
 * Texto e tom do badge de cada estado da bateria.
 *
 * Compartilhado pelos cards de bateria da Visão geral e da tela Energia,
 * para que o mesmo estado apareça sempre com o mesmo nome e a mesma cor.
 */

import type { BadgeTone } from '@/components/ui/Badge';
import type { Bateria } from '@/data/tipos';

export const ESTADOS_BATERIA: Record<Bateria['estado'], { texto: string; tom: BadgeTone }> = {
  carregando: { texto: 'Carregando', tom: 'accent' },
  descarregando: { texto: 'Descarregando', tom: 'warning' },
  ociosa: { texto: 'Ociosa', tom: 'neutral' },
};
