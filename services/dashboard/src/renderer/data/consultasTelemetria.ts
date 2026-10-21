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
/** Limita memória e duração; exportações maiores precisam de contrato dedicado. */
const LIMITE_AMOSTRAS_EXPORTACAO = 10_000;

/**
 * Busca todas as amostras que atendem à consulta, página por página.
 *
 * Mantém os filtros (teste, qualidade, intervalo) e ignora a paginação
 * recebida. Recusa paginação inconsistente para não baixar um CSV parcial.
 * shortcut: total/IDs não equivalem a snapshot; evoluir API se houver edição concorrente com total constante.
 */
export async function buscarTodasAmostras(
  repositorio: RepositorioVers,
  consulta: ConsultaTelemetria,
): Promise<AmostraTelemetria[]> {
  const todas: AmostraTelemetria[] = [];
  const ids = new Set<string>();
  let total: number | undefined;
  for (let pagina = 1; pagina <= LIMITE_AMOSTRAS_EXPORTACAO / TAMANHO_PAGINA_EXPORTACAO; pagina++) {
    const resposta = await repositorio.obterAmostrasTelemetria({
      ...consulta,
      pagina,
      tamanhoPagina: TAMANHO_PAGINA_EXPORTACAO,
    });
    if (!Number.isSafeInteger(resposta.total) || resposta.total < 0 ||
      resposta.total > LIMITE_AMOSTRAS_EXPORTACAO) {
      throw new Error('Exportação indisponível: limite de 10.000 amostras ou total inválido.');
    }
    total ??= resposta.total;
    const esperado = Math.min(TAMANHO_PAGINA_EXPORTACAO, total - todas.length);
    if (resposta.total !== total || resposta.pagina !== pagina ||
      resposta.tamanhoPagina !== TAMANHO_PAGINA_EXPORTACAO || resposta.itens.length !== esperado) {
      throw new Error('Exportação interrompida: paginação alterada ou incompleta.');
    }
    for (const amostra of resposta.itens) {
      if (!amostra.id || ids.has(amostra.id) || amostra.testeId !== consulta.testeId) {
        throw new Error('Exportação interrompida: amostra repetida ou de outro teste.');
      }
      ids.add(amostra.id);
      todas.push(amostra);
    }
    if (todas.length === total) return todas;
  }
  throw new Error('Exportação interrompida: limite de páginas excedido.');
}
