/**
 * Geração de CSV no formato que o Excel em português abre direto.
 *
 * O Excel pt-BR usa vírgula como separador decimal, então as colunas são
 * separadas por ponto e vírgula. O arquivo começa com BOM (marca de ordem de
 * bytes) para o Excel reconhecer UTF-8 e mostrar os acentos corretamente.
 */

const SEPARADOR = ';';
const FIM_DE_LINHA = '\r\n';
const BOM = '﻿';

/**
 * Prepara um campo: entre aspas (com aspas internas dobradas) quando contém
 * o separador, aspas ou quebra de linha, como pede a RFC 4180.
 */
function escaparCampo(campo: string): string {
  return /[;"\r\n]/.test(campo) ? `"${campo.replace(/"/g, '""')}"` : campo;
}

/**
 * Monta o texto do CSV a partir do cabeçalho e das linhas já formatadas.
 *
 * Os valores chegam como texto (já com vírgula decimal, datas DD/MM/AAAA),
 * para que o CSV seja idêntico ao que a tela mostra.
 */
export function gerarCsv(
  cabecalho: readonly string[],
  linhas: readonly (readonly string[])[],
): string {
  const registros = [cabecalho, ...linhas].map((linha) => linha.map(escaparCampo).join(SEPARADOR));
  return BOM + registros.map((registro) => registro + FIM_DE_LINHA).join('');
}
