/**
 * Aviso exibido no conteúdo das telas que ainda não foram implementadas.
 *
 * Usado na Fase 2 do roadmap do frontend desktop, quando o shell e as rotas
 * já existem mas o conteúdo de cada tela só chega na Fase 4.
 */

import { Card } from '@/components/ui/Card';

export interface EmConstrucaoProps {
  /** Nome do arquivo de referência em `design-reference/`, sem extensão. */
  referencia: string;
}

/** Renderiza um card simples indicando a referência visual da tela. */
export function EmConstrucao({ referencia }: EmConstrucaoProps) {
  return (
    <Card className="flex flex-col gap-1">
      <p className="text-sm font-medium text-fg">Conteúdo desta tela em construção</p>
      <p className="text-[13px] text-fg-muted">
        Implementação prevista na Fase 4. Referência: <span className="font-mono">{referencia}</span>
      </p>
    </Card>
  );
}
