/**
 * Erros tipados do repositório de dados do VERS.
 *
 * As ações (planejar, iniciar, finalizar, cancelar…) podem ser recusadas pelo
 * backend por motivos diferentes, e a tela precisa saber qual para mostrar a
 * mensagem certa. O repositório de exemplo lança estes mesmos erros, para que
 * as telas tratem as recusas igual farão com a API real.
 */

/** Motivos de recusa, alinhados às respostas de erro do backend. */
export type CodigoErro =
  | 'conflito'
  | 'transicao-invalida'
  | 'validacao'
  | 'nao-encontrado'
  | 'indisponivel'
  | 'credenciais-invalidas'
  | 'limite-tentativas';

/**
 * Erro com código e mensagem em português pronta para a tela.
 *
 * Estende `Error` para funcionar com o TanStack Query e com `try/catch`
 * comuns; o código permite decidir o tratamento sem comparar textos.
 */
export class ErroRepositorio extends Error {
  readonly codigo: CodigoErro;

  constructor(codigo: CodigoErro, mensagem: string) {
    super(mensagem);
    this.name = 'ErroRepositorio';
    this.codigo = codigo;
  }
}
