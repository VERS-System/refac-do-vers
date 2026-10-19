/**
 * Busca geral da barra superior (Fase 5): procura nas telas, nas seções das
 * Configurações, nos testes e nos veículos, sem backend.
 *
 * Compara sem diferenciar maiúsculas nem acentos; cada palavra do termo
 * precisa aparecer no título, no detalhe ou nos termos extras do item. Um
 * termo que começa com "#" procura só testes (é como os códigos aparecem,
 * "#024"), para não achar "2024" num nome de carro. O título que começa com o
 * termo vem antes; o resto mantém a ordem do índice. Sem termo, sugere as
 * telas. Plano em `.AIs/docs/plans/desktop-frontend-fase-5.md`.
 */

export type GrupoBusca = 'Tela' | 'Configurações' | 'Teste' | 'Veículo';

export interface ItemBusca {
  id: string;
  titulo: string;
  /** Texto curto ao lado do título (placa, terreno e data). */
  detalhe?: string;
  grupo: GrupoBusca;
  /** Rota aberta ao escolher o item. */
  rota: string;
  /** Outras palavras que acham o item, sem aparecer na lista. */
  termos?: string[];
}

/** Minúsculas, sem acentos e sem "#", para comparar. */
function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/#/g, '').trim();
}

/** Procura o termo nos itens e devolve até `limite` resultados. */
export function buscar(itens: ItemBusca[], termo: string, limite = 8): ItemBusca[] {
  const consulta = normalizar(termo);
  if (!consulta) return itens.filter((item) => item.grupo === 'Tela').slice(0, limite);
  const soTestes = termo.trim().startsWith('#');
  const palavras = consulta.split(/\s+/);

  const achados: { item: ItemBusca; prioridade: number }[] = [];
  for (const item of itens) {
    if (soTestes && item.grupo !== 'Teste') continue;
    const titulo = normalizar(item.titulo);
    const texto = normalizar([item.titulo, item.detalhe, ...(item.termos ?? [])].join(' '));
    if (!palavras.every((palavra) => texto.includes(palavra))) continue;
    achados.push({ item, prioridade: titulo.startsWith(consulta) ? 0 : 1 });
  }
  // `sort` é estável: dentro da mesma prioridade, fica a ordem do índice.
  return achados
    .sort((a, b) => a.prioridade - b.prioridade)
    .slice(0, limite)
    .map(({ item }) => item);
}
