/**
 * Onda decorativa do card "Vibração RMS" do VERS.
 *
 * Desenha uma senoide estilizada em dourado, como o "osciloscópio" da
 * referência. É ilustrativa: não representa amostras reais (o RMS e a
 * frequência dominante estão em texto no card). A animação contínua do
 * DESIGN.md entra na Fase 5, respeitando `prefers-reduced-motion`.
 */

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
 * controle acima (crista) ou abaixo (vale), alternando.
 */
function montarCaminho(ciclos: number): string {
  const meiasOndas = Math.max(1, Math.round(ciclos * 2));
  const passo = LARGURA / meiasOndas;
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
  return (
    <svg
      aria-hidden="true"
      viewBox={`0 0 ${LARGURA} ${ALTURA}`}
      preserveAspectRatio="none"
      className={cn('h-12 w-full text-accent', className)}
    >
      <path
        data-slot="onda"
        d={montarCaminho(ciclos)}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
