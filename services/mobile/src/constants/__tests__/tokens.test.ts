/**
 * Garante que os tokens visuais do mobile tenham fonte única e sem hex duplicado.
 */

import { colors } from '../colors';
import { layout } from '../layout';
import { theme } from '../theme';

describe('tokens visuais (Task 00 - F1)', () => {
  it('expõe o fundo ativo da aba como token semântico', () => {
    expect(colors.tabActive).toBe('#292819');
  });

  it('usa o token de fundo como fonte única do background', () => {
    expect(colors.background).toBe('#0c0c0c');
    expect(colors.dark).toBe(colors.background);
  });

  it('mantém aliases dourados apontando para o primário', () => {
    expect(colors.gold).toBe(colors.primary);
    expect(colors.accent).toBe(colors.primary);
  });

  it('expõe escala de espaçamento e raio no layout', () => {
    expect(layout.spacing.md).toBe(layout.padding);
    expect(layout.radii.md).toBe(layout.radius);
    expect(layout.bottomNavHeight).toBe(64);
  });

  it('centraliza cores, layout e tipografia no theme', () => {
    expect(theme.colors).toBe(colors);
    expect(theme.layout).toBe(layout);
    expect(theme.typography.body.fontSize).toBe(16);
  });

  /** Garante que o theme é a porta única para raios usados nas telas. */
  it('expõe via theme os raios aplicados nas telas', () => {
    expect(theme.radii.pill).toBe(100);
    expect(theme.radii.xl).toBe(34);
    expect(theme.radii.lg).toBe(22);
  });

  /** Garante que o theme expõe a escala de espaçamento das telas. */
  it('expõe via theme a escala de espaçamento', () => {
    expect(theme.spacing.xs).toBe(4);
    expect(theme.spacing.sm).toBe(8);
    expect(theme.spacing.md).toBe(16);
    expect(theme.spacing.lg).toBe(24);
    expect(theme.spacing.xl).toBe(32);
  });
});
