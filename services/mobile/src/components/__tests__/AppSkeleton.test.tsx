/**
 * Testes unitários do placeholder de carregamento do aplicativo VERS.
 */

import { render } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { AppSkeleton } from '../AppSkeleton';
import { theme } from '../../constants/theme';

describe('AppSkeleton', () => {
  /** Renderiza o placeholder com identificador de teste. */
  it('renderiza o skeleton', () => {
    const { getByTestId } = render(<AppSkeleton />);

    expect(getByTestId('app-skeleton')).toBeTruthy();
  });

  /** Aplica as dimensões informadas sem quebrar o padrão do tema. */
  it('aplica dimensões personalizadas', () => {
    const { getByTestId } = render(
      <AppSkeleton height={164} testID="skeleton-card" width={340} />,
    );

    const style = StyleSheet.flatten(getByTestId('skeleton-card').props.style);

    expect(style.height).toBe(164);
    expect(style.width).toBe(340);
    expect(style.borderRadius).toBe(theme.radii.md);
  });

  /** Usa os padrões do tema quando nada é informado. */
  it('usa padrões do tema', () => {
    const { getByTestId } = render(<AppSkeleton />);

    const style = StyleSheet.flatten(getByTestId('app-skeleton').props.style);

    expect(style.height).toBe(16);
    expect(style.width).toBe('100%');
    expect(style.backgroundColor).toBe(theme.colors.surface);
  });
});
