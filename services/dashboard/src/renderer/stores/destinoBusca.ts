/**
 * Destino escolhido na busca geral, entregue à tela que ele abre.
 *
 * A busca guarda o item (um teste, um veículo ou uma seção das
 * Configurações) e navega; a tela, ao montar, consome o destino do seu tipo
 * uma vez só e mostra o item. Fica fora da navegação (`state` do roteador)
 * porque várias telas são montadas sem roteador nos testes. Nada precisa
 * reagir à mudança, então basta uma variável do módulo. Plano em
 * `.AIs/docs/plans/desktop-frontend-fase-5.md`.
 */

export type DestinoBusca =
  /** `indice`: posição do teste na lista completa (do mais recente), para achar a página. */
  | { tipo: 'teste'; id: string; indice: number }
  | { tipo: 'veiculo'; id: string }
  | { tipo: 'secao'; id: string };

let pendente: DestinoBusca | null = null;

/** Guarda o destino, substituindo o anterior. */
export function definirDestino(destino: DestinoBusca): void {
  pendente = destino;
}

/** Entrega e apaga o destino, se for do tipo pedido; senão, `null`. */
export function consumirDestino(tipo: DestinoBusca['tipo']): DestinoBusca | null {
  if (pendente?.tipo !== tipo) return null;
  const destino = pendente;
  pendente = null;
  return destino;
}
