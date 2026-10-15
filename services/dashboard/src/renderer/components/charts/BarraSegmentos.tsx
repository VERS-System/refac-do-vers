/**
 * Barra de segmentos do KPI "Potência instantânea" do VERS.
 *
 * Mostra um valor numa escala de 0 a `maximo` como uma fileira de segmentos
 * (cheios, um parcial e vazios), no estilo de medidor de nível da referência.
 */

import { cn } from '@/lib/cn';

export interface BarraSegmentosProps {
  valor: number;
  maximo: number;
  /** Quantidade de segmentos (padrão: 8). */
  segmentos?: number;
  /** Nome acessível do medidor (ex.: "Nível de potência"). */
  rotulo: string;
  /** Cor dos segmentos acesos: dourado (padrão, sinais ao vivo) ou verde (carga da bateria). */
  tom?: TomSegmentos;
  className?: string;
}

export type TomSegmentos = 'accent' | 'success';

type EstadoSegmento = 'cheio' | 'parcial' | 'vazio';

const CLASSES_SEGMENTO: Record<TomSegmentos, Record<EstadoSegmento, string>> = {
  accent: { cheio: 'bg-accent', parcial: 'bg-accent/50', vazio: 'bg-surface-raised' },
  success: { cheio: 'bg-success', parcial: 'bg-success/50', vazio: 'bg-surface-raised' },
};

/**
 * Calcula o estado de cada segmento.
 *
 * O valor vira "segmentos preenchidos" (212 de 400 em 8 = 4,24): a parte
 * inteira são os cheios e a sobra, se houver, acende um segmento parcial.
 * O valor é preso entre 0 e o máximo.
 */
function calcularEstados(valor: number, maximo: number, segmentos: number): EstadoSegmento[] {
  const proporcao = maximo > 0 ? Math.min(Math.max(valor / maximo, 0), 1) : 0;
  const preenchidos = proporcao * segmentos;
  const cheios = Math.floor(preenchidos);
  return Array.from({ length: segmentos }, (_, i) => {
    if (i < cheios) return 'cheio';
    if (i === cheios && preenchidos > cheios) return 'parcial';
    return 'vazio';
  });
}

/**
 * Renderiza a barra como um medidor (`role="meter"`) com valor, mínimo e
 * máximo, para que a informação não dependa só das cores dos segmentos.
 */
export function BarraSegmentos({
  valor,
  maximo,
  segmentos = 8,
  rotulo,
  tom = 'accent',
  className,
}: BarraSegmentosProps) {
  return (
    <div
      role="meter"
      aria-label={rotulo}
      aria-valuenow={valor}
      aria-valuemin={0}
      aria-valuemax={maximo}
      className={cn('flex gap-1', className)}
    >
      {calcularEstados(valor, maximo, segmentos).map((estado, i) => (
        <span
          key={i}
          data-slot="segmento"
          data-estado={estado}
          className={cn('h-2 flex-1 rounded-full', CLASSES_SEGMENTO[tom][estado])}
        />
      ))}
    </div>
  );
}
