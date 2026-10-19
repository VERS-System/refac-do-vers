/**
 * Onda decorativa do card "Vibração RMS" do VERS.
 *
 * Desenha uma senoide estilizada em dourado, como o "osciloscópio" da
 * referência. É ilustrativa: não representa amostras reais (o RMS e a
 * frequência dominante estão em texto no card). Fase 5: a onda corre devagar
 * na horizontal (`onda-correndo`), deslocando um ciclo por volta; o caminho
 * tem um ciclo a mais, fora da área, para a emenda não aparecer. Parada com
 * "Reduzir movimento".
 */

import type { CSSProperties } from 'react';
import { cn } from '@/lib/cn';

export interface OndaVibracaoProps {
  /** Quantidade de ciclos completos na largura (padrão: 4). */
  ciclos?: number;
  className?: string;
}

const LARGURA = 240;
const ALTURA = 48;
/** Altura de cada crista/vale a partir do centro. */
const AMPLITUDE = 14;

/**
 * Monta o caminho da onda com uma curva quadrática por meia-onda.
 *
 * Cada meia-onda vai do eixo central ao próximo cruzamento, com o ponto de
 * controle acima (crista) ou abaixo (vale), alternando. `ciclos` cabem na
 * largura; o caminho segue por mais um ciclo, para a onda poder correr.
 */
function montarCaminho(ciclos: number): string {
  const meiasOndasVisiveis = Math.max(1, Math.round(ciclos * 2));
  const passo = LARGURA / meiasOndasVisiveis;
  const meiasOndas = meiasOndasVisiveis + 2;
  const centro = ALTURA / 2;
  let caminho = `M 0 ${centro}`;
  for (let i = 0; i < meiasOndas; i++) {
    const controleY = i % 2 === 0 ? centro - 2 * AMPLITUDE : centro + 2 * AMPLITUDE;
    caminho += ` Q ${passo * i + passo / 2} ${controleY} ${passo * (i + 1)} ${centro}`;
  }
  return caminho;
}

/** Renderiza a onda esticada na largura do contêiner. */
export function OndaVibracao({ ciclos = 4, className }: OndaVibracaoProps) {
  const ciclo = LARGURA / Math.max(0.5, ciclos);
  return (
    <svg
      aria-hidden="true"
      viewBox={`0 0 ${LARGURA} ${ALTURA}`}
      preserveAspectRatio="none"
      className={cn('h-12 w-full overflow-hidden text-accent', className)}
    >
      <path
        data-slot="onda"
        className="onda-correndo"
        style={{ '--ciclo': `${ciclo}px` } as CSSProperties}
        d={montarCaminho(ciclos)}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
