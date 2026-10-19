/**
 * Consultas compostas de telemetria sobre o repositório.
 *
 * A API entrega as amostras em páginas de no máximo 100 itens. Para exportar
 * um teste inteiro em CSV é preciso juntar todas as páginas, e esta é a
 * peça que faz isso, igual para o exemplo e para a API real.
 */

import type { RepositorioVers } from './repositorio';
import type { AmostraTelemetria, ConsultaTelemetria } from './tipos';

/** Maior página aceita pelo backend. */
const TAMANHO_PAGINA_EXPORTACAO = 100;

/**
 * Busca todas as amostras que atendem à consulta, página por página.
 *
 * Mantém os filtros (teste, qualidade, intervalo) e ignora a paginação
 * recebida. Para quando já juntou o total ou uma página vem vazia, o que
 * evita laço infinito se o total mudar no meio da busca.
 */
export async function buscarTodasAmostras(
  repositorio: RepositorioVers,
  consulta: ConsultaTelemetria,
): Promise<AmostraTelemetria[]> {
  const todas: AmostraTelemetria[] = [];
  for (let pagina = 1; ; pagina++) {
    const resposta = await repositorio.obterAmostrasTelemetria({
      ...consulta,
      pagina,
      tamanhoPagina: TAMANHO_PAGINA_EXPORTACAO,
    });
    todas.push(...resposta.itens);
    if (resposta.itens.length === 0 || todas.length >= resposta.total) return todas;
  }
}
