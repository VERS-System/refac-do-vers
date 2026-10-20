/**
 * Minicurva (sparkline) dos cards de KPI do VERS.
 *
 * Mostra só a forma de uma série, sem eixos (por exemplo a energia do dia no
 * card "Energia recuperada hoje"). É SVG puro: leve e sem depender do
 * Recharts para um desenho tão simples.
 */

import { cn } from '@/lib/cn';

export interface SparklineProps {
  valores: readonly number[];
  className?: string;
}

/** Largura e altura do sistema de coordenadas do SVG (a escala real vem do CSS). */
const LARGURA = 100;
const ALTURA = 32;
/** Folga vertical para o traço não ser cortado no topo e na base. */
const MARGEM = 2;

/**
 * Converte os valores em pontos "x,y" da polilinha.
 *
 * X distribui os valores de ponta a ponta; Y normaliza entre o mínimo e o
 * máximo (invertido, porque no SVG o y cresce para baixo). Uma série
 * constante fica no meio da altura.
 */
function calcularPontos(valores: readonly number[]): string {
  const minimo = Math.min(...valores);
  const amplitude = Math.max(...valores) - minimo;
  const alturaUtil = ALTURA - 2 * MARGEM;
  return valores
    .map((valor, i) => {
      const x = (i / (valores.length - 1)) * LARGURA;
      const proporcao = amplitude > 0 ? (valor - minimo) / amplitude : 0.5;
      const y = MARGEM + (1 - proporcao) * alturaUtil;
      return `${Number(x.toFixed(2))},${Number(y.toFixed(2))}`;
    })
    .join(' ');
}

/**
 * Renderiza a minicurva em dourado, esticada na largura do card.
 *
 * É decorativa (`aria-hidden`): o valor que importa está no texto do card.
 * Com menos de dois valores não há linha a desenhar.
 */
export function Sparkline({ valores, className }: SparklineProps) {
  if (valores.length < 2) return null;
  return (
    <svg
      aria-hidden="true"
      viewBox={`0 0 ${LARGURA} ${ALTURA}`}
      preserveAspectRatio="none"
      className={cn('h-8 w-full overflow-visible text-accent', className)}
    >
      <polyline
        data-slot="linha"
        points={calcularPontos(valores)}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
