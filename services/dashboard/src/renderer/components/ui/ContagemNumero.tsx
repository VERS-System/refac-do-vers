/**
 * Contagem do valor de um KPI (o CountUp do DESIGN.md).
 *
 * O número sobe do que estava na tela (zero, na primeira vez) até o valor
 * novo em 600 ms, desacelerando no fim, para que uma mudança de leitura seja
 * percebida sem esconder o dado. O leitor de tela recebe só o valor final,
 * desde o início; a parte que conta fica escondida dele. Com "Reduzir
 * movimento" (do app ou do sistema), o valor aparece direto. Plano em
 * `.AIs/docs/plans/desktop-frontend-fase-5.md`.
 */

import { useEffect, useRef, useState } from 'react';
import { useMovimentoReduzido } from '@/hooks/useMovimentoReduzido';

/** Duração da contagem: um momento de chegada, curto o bastante para não parecer atraso. */
const DURACAO_MS = 600;

/** Desaceleração exponencial: chega rápido perto do valor e assenta devagar. */
function desacelerar(t: number): number {
  return t >= 1 ? 1 : 1 - 2 ** (-10 * t);
}

export interface ContagemNumeroProps {
  numero: number;
  /** Formata cada passo da contagem (ex.: `(n) => formatarPotencia(n).valor`). */
  formatar: (numero: number) => string;
}

/** Mostra o número contando até `numero`, ou direto com menos movimento. */
export function ContagemNumero({ numero, formatar }: ContagemNumeroProps) {
  const reduzido = useMovimentoReduzido();
  const [exibido, setExibido] = useState(reduzido ? numero : 0);
  // O valor na tela a cada quadro, para a próxima contagem partir dele.
  const atual = useRef(exibido);

  useEffect(() => {
    if (reduzido) {
      atual.current = numero;
      setExibido(numero);
      return;
    }
    const inicio = atual.current;
    const comeco = performance.now();
    let quadro = 0;
    /** Avança a contagem pelo tempo decorrido desde o começo. */
    const passo = () => {
      const progresso = desacelerar((performance.now() - comeco) / DURACAO_MS);
      atual.current = inicio + (numero - inicio) * progresso;
      setExibido(atual.current);
      if (progresso < 1) quadro = requestAnimationFrame(passo);
    };
    quadro = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(quadro);
  }, [numero, reduzido]);

  if (reduzido) return <>{formatar(numero)}</>;
  return (
    <>
      <span aria-hidden="true">{formatar(exibido)}</span>
      <span className="sr-only">{formatar(numero)}</span>
    </>
  );
}
