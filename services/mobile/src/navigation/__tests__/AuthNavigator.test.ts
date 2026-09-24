/**
 * Testes da configuração do navegador de autenticação.
 */

import { AUTH_SCREEN_OPTIONS } from '../AuthNavigator';

describe('AuthNavigator', () => {
  /**
   * A transição padrão com suavização (fade) sobrepõe as telas e deixa uma
   * "sombra" da logo durante o movimento das barras; por isso a troca de tela
   * deve ser instantânea, sem animação de cruzamento.
   */
  it('não aplica suavização de transição entre as telas', () => {
    expect(AUTH_SCREEN_OPTIONS.animation).toBe('none');
  });

  /** O cabeçalho nativo permanece oculto para manter o layout dos mockups. */
  it('mantém o cabeçalho nativo oculto', () => {
    expect(AUTH_SCREEN_OPTIONS.headerShown).toBe(false);
  });
});