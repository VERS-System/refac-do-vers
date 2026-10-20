/**
 * Números pseudoaleatórios reproduzíveis para gerar as fixtures de exemplo.
 *
 * As fixtures precisam de variação "natural" (ruído na curva, dispersão da
 * vibração), mas os testes e os prints têm de mostrar sempre o mesmo
 * resultado. Por isso tudo sai de um gerador com semente fixa.
 */

/**
 * Gerador pseudoaleatório Mulberry32: pequeno, rápido e reproduzível.
 *
 * Devolve uma função que, a cada chamada, dá um número em [0, 1). A mesma
 * semente produz sempre a mesma sequência.
 */
export function mulberry32(semente: number): () => number {
  let estado = semente >>> 0;
  return () => {
    estado = (estado + 0x6d2b79f5) >>> 0;
    let t = estado;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Ruído com distribuição normal (média 0, desvio 1) pelo método de Box-Muller.
 *
 * Transforma dois números uniformes do gerador num valor normal, que imita
 * melhor o ruído de medição do que um uniforme.
 */
export function normal(aleatorio: () => number): number {
  const u = Math.max(aleatorio(), Number.EPSILON);
  const v = aleatorio();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
