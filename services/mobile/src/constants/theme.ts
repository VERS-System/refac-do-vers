/**
 * Expõe o tema do aplicativo mobile do VERS como ponto único de acesso.
 *
 * Reúne `colors`, `layout` (com `spacing` e `radii`) e `typography` para que
 * as telas não importem tokens avulsos nem repitam valores mágicos.
 */
import { colors } from './colors';
import { layout } from './layout';

export const theme = {
  colors,
  layout,
  spacing: layout.spacing,
  radii: layout.radii,
  typography: {
    h1: { fontSize: 28, fontWeight: '800' as const },
    h2: { fontSize: 22, fontWeight: '700' as const },
    body: { fontSize: 16, fontWeight: '400' as const },
    caption: { fontSize: 12, fontWeight: '400' as const },
  },
} as const;
