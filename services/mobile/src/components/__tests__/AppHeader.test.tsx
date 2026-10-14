/**
 * Testes unitários do cabeçalho compartilhado do aplicativo VERS.
 */

import { fireEvent, render } from '@testing-library/react-native';
import { Text } from 'react-native';
import { AppHeader } from '../AppHeader';
import { theme } from '../../constants/theme';

describe('AppHeader', () => {
  /** Exibe o título como cabeçalho acessível. */
  it('renderiza o título', () => {
    const { getByRole } = render(<AppHeader title="Energia" />);

    expect(getByRole('header', { name: 'Energia' })).toBeTruthy();
  });

  /** Exibe o subtítulo somente quando informado. */
  it('renderiza o subtítulo quando informado', () => {
    const { getByText, queryByText, rerender } = render(
      <AppHeader title="Energia" subtitle="Hoje" />,
    );

    expect(getByText('Hoje')).toBeTruthy();

    rerender(<AppHeader title="Energia" />);

    expect(queryByText('Hoje')).toBeNull();
  });

  /** O botão voltar só existe com onBack e dispara uma vez. */
  it('exibe voltar apenas com onBack', () => {
    const onBack = jest.fn();
    const { getByRole, queryByRole, rerender } = render(
      <AppHeader title="Energia" onBack={onBack} />,
    );

    fireEvent.press(getByRole('button', { name: 'Voltar' }));

    expect(onBack).toHaveBeenCalledTimes(1);

    rerender(<AppHeader title="Energia" />);

    expect(queryByRole('button', { name: 'Voltar' })).toBeNull();
  });

  /** Renderiza conteúdo auxiliar à direita quando informado. */
  it('renderiza o trailing', () => {
    const { getByText } = render(
      <AppHeader title="Energia" trailing={<Text>Ação</Text>} />,
    );

    expect(getByText('Ação')).toBeTruthy();
  });

  /** Usa a tipografia do tema no título. */
  it('usa a tipografia do tema', () => {
    expect(theme.typography.h2.fontSize).toBe(22);
    expect(theme.typography.caption.fontSize).toBe(12);
  });
});
