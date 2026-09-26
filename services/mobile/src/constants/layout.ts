/**
 * Centraliza as medidas do aplicativo mobile do VERS em fonte única.
 *
 * `padding`, `radius`, `gap`, `iconSize` e `bottomNavHeight` são mantidos por
 * compatibilidade; `spacing` e `radii` são as escalas canônicas para telas
 * novas não repetirem valores mágicos.
 */
export const layout = {
  padding: 16,
  radius: 12,
  gap: 12,
  iconSize: 24,
  bottomNavHeight: 64,
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  radii: {
    sm: 12,
    md: 12,
    lg: 22,
    xl: 34,
    pill: 100,
  },
} as const;
