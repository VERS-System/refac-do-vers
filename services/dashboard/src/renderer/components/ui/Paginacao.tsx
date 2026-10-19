/**
 * Paginação das tabelas do app desktop do VERS (amostras da Telemetria,
 * histórico de testes).
 *
 * Rodapé com o intervalo exibido ("Mostrando 1 a 20 de 265 amostras"), a
 * página atual sobre o total e os botões Anterior e Próxima, desativados nas
 * pontas.
 */

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { formatarNumero } from '@/lib/format';
import { Button } from './Button';

export interface PaginacaoProps {
  /** Página atual, a partir de 1. */
  pagina: number;
  /** Itens por página. */
  tamanho: number;
  total: number;
  /** Nome dos itens no plural ("amostras", "testes"). */
  unidade: string;
  onTrocar: (pagina: number) => void;
}

/** Renderiza o rodapé; sem itens, mostra "0 a 0" e uma página só. */
export function Paginacao({ pagina, tamanho, total, unidade, onTrocar }: PaginacaoProps) {
  const paginas = Math.max(1, Math.ceil(total / tamanho));
  const primeiro = total === 0 ? 0 : (pagina - 1) * tamanho + 1;
  const ultimo = Math.min(pagina * tamanho, total);
  return (
    <div className="mt-4 flex flex-col gap-3 border-t border-line-subtle pt-4 font-mono text-xs text-fg-muted sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <p>{`Mostrando ${formatarNumero(primeiro)} a ${formatarNumero(ultimo)} de ${formatarNumero(total)} ${unidade}`}</p>
      <div className="flex items-center justify-between gap-2 sm:justify-start sm:gap-3">
        <Button
          variant="secondary"
          icon={ChevronLeft}
          disabled={pagina <= 1}
          onClick={() => onTrocar(pagina - 1)}
        >
          Anterior
        </Button>
        <span className="whitespace-nowrap text-fg">{`${pagina} de ${paginas}`}</span>
        <Button
          variant="secondary"
          icon={ChevronRight}
          disabled={pagina >= paginas}
          onClick={() => onTrocar(pagina + 1)}
        >
          Próxima
        </Button>
      </div>
    </div>
  );
}
