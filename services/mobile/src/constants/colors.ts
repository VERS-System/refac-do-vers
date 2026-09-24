/**
 * Centraliza a paleta do aplicativo mobile do VERS em fonte única.
 *
 * `primary` é o dourado canônico; `accent` e `gold` são aliases intencionais.
 * `dark` e `background` compartilham o valor por pertencerem ao mesmo fundo,
 * com nomes distintos por papel semântico. `tabActive` é o fundo da aba
 * selecionada, antes hardcoded como `#292819` na navegação inferior.
 */
export const colors = {
  primary: '#d8c95a',
  secondary: '#b8aa45',
  accent: '#d8c95a',
  gold: '#d8c95a',
  white: '#f4f4f4',
  logoLight: '#d9d9d9',
  logoGold: '#d5c462',
  gray: '#878787',
  dark: '#0c0c0c',
  background: '#0c0c0c',
  surface: '#1a1a1a',
  border: '#626262',
  tabActive: '#292819',
  error: '#ef5350',
  success: '#6fbd72',
} as const;
