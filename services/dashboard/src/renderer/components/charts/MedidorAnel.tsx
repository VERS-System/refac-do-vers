/**
 * Anel de progresso do KPI "Eficiência ponta a ponta" do VERS.
 *
 * Um círculo de fundo e um arco dourado que cobre o percentual, com um
 * símbolo opcional no centro (η, de eficiência).
 */

import { cn } from '@/lib/cn';

export interface MedidorAnelProps {
  /** Percentual de 0 a 100; ausente conta como 0. */
  percentual: number | null;
  /** Texto curto no centro do anel (ex.: "η"). */
  simbolo?: string;
  className?: string;
}

const RAIO = 22;
const ESPESSURA = 4;
const CIRCUNFERENCIA = 2 * Math.PI * RAIO;

/**
 * Renderiza o anel.
 *
 * O arco usa `stroke-dasharray` ("preenchido total"): o traço cobre só a
 * fração do percentual e o resto fica vazio. A rotação de -90° faz o arco
 * começar no topo. É decorativo; o valor está no texto do card.
 */
export function MedidorAnel({ percentual, simbolo, className }: MedidorAnelProps) {
  const fracao = Math.min(Math.max((percentual ?? 0) / 100, 0), 1);
  const tamanho = 2 * (RAIO + ESPESSURA);
  return (
    <div className={cn('relative grid size-14 shrink-0 place-items-center', className)}>
      <svg
        aria-hidden="true"
        viewBox={`0 0 ${tamanho} ${tamanho}`}
        className="absolute inset-0 size-full -rotate-90"
      >
        <circle
          cx={tamanho / 2}
          cy={tamanho / 2}
          r={RAIO}
          fill="none"
          strokeWidth={ESPESSURA}
          className="stroke-surface-raised"
        />
        <circle
          data-slot="progresso"
          cx={tamanho / 2}
          cy={tamanho / 2}
          r={RAIO}
          fill="none"
          strokeWidth={ESPESSURA}
          strokeLinecap="round"
          strokeDasharray={`${fracao * CIRCUNFERENCIA} ${CIRCUNFERENCIA}`}
          className="stroke-accent"
        />
      </svg>
      {simbolo && (
        <span aria-hidden="true" className="relative font-mono text-xs text-accent">
          {simbolo}
        </span>
      )}
    </div>
  );
}
