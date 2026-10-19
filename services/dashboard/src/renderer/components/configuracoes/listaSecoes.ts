/**
 * Seções do painel de ajustes das Configurações, na ordem da tela.
 *
 * Fica fora da página para a busca geral (barra superior) indexar as seções
 * sem carregar a tela inteira.
 */

export const SECOES_CONFIGURACOES = [
  { id: 'perfil', rotulo: 'Perfil' },
  { id: 'unidades', rotulo: 'Unidades e exibição' },
  { id: 'alertas', rotulo: 'Alertas' },
  { id: 'tarifa', rotulo: 'Tarifa de energia' },
  { id: 'sessoes', rotulo: 'Sessões e segurança' },
  { id: 'sobre', rotulo: 'Sobre o VERS' },
] as const;
