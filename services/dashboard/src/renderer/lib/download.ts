/**
 * Download de arquivos gerados no próprio app (ex.: o CSV do resumo por dia).
 *
 * Funciona sem backend: o conteúdo vira um Blob, que é baixado por um link
 * temporário. No navegador o arquivo vai para Downloads; no Electron, a
 * janela de salvar do sistema aparece.
 */

/**
 * Baixa `conteudo` com o nome e o tipo MIME informados.
 *
 * Cria uma URL para o Blob, clica num link `<a download>` fora da página e
 * libera a URL em seguida, para não manter o arquivo na memória.
 */
export function baixarArquivo(nome: string, conteudo: string, tipo: string): void {
  const url = URL.createObjectURL(new Blob([conteudo], { type: tipo }));
  const link = document.createElement('a');
  link.href = url;
  link.download = nome;
  link.click();
  URL.revokeObjectURL(url);
}
