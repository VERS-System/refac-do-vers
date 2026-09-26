/**
 * Testes unitários da navegação inferior principal do aplicativo.
 */

import { fireEvent, render } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { BottomNavigation } from '../BottomNavigation';
import { TAB_ORDER, type MainTab } from '../../navigation/tabs';

describe('BottomNavigation', () => {
  /** Encaminha a aba selecionada e informa semanticamente a aba ativa. */
  it('seleciona a área de bateria', () => {
    const onTabPress = jest.fn();
    const { getByRole } = render(
      <BottomNavigation activeTab="home" onTabPress={onTabPress} />,
    );

    expect(getByRole('button', { name: 'Início' }).props.accessibilityState).toEqual({
      selected: true,
    });

    fireEvent.press(getByRole('button', { name: 'Bateria' }));
    expect(onTabPress).toHaveBeenCalledWith('battery');
  });

  /** Garante que a aba de diagnóstico do veículo permanece fora do escopo. */
  it('não expõe atalho de diagnóstico do veículo', () => {
    const { queryByRole } = render(<BottomNavigation activeTab="home" />);

    expect(queryByRole('button', { name: 'Diagnóstico' })).toBeNull();
    expect(queryByRole('button', { name: 'Abrir diagnóstico do carro' })).toBeNull();
  });

  /** Varredura permanente: nenhuma aba, em nenhum estado, expõe diagnóstico. */
  it('não expõe diagnóstico em nenhuma aba ativa (Task 00 - Item 6a)', () => {
    const tabs: MainTab[] = [...TAB_ORDER];

    for (const activeTab of tabs) {
      const { queryByRole, queryByText, unmount } = render(
        <BottomNavigation activeTab={activeTab} />,
      );

      expect(queryByRole('button', { name: 'Diagnóstico' })).toBeNull();
      expect(queryByRole('button', { name: 'Abrir diagnóstico do carro' })).toBeNull();
      expect(queryByText('Your car Diagnostic')).toBeNull();

      unmount();
    }
  });

  /** Garante que o botão central usa a imagem versAlt fornecida pelo programador. */
  it('exibe a marca versAlt no botão central', () => {
    const { getByTestId, queryByTestId } = render(<BottomNavigation activeTab="vers" />);

    expect(getByTestId('vers-brand-image')).toBeTruthy();
    expect(queryByTestId('vers-logo')).toBeNull();
  });

  /** Garante que a marca central tem porte comparável aos ícones de 25px. */
  it('mantém a marca central no porte dos demais ícones', () => {
    const { getByTestId } = render(<BottomNavigation activeTab="vers" />);
    const style = StyleSheet.flatten(getByTestId('vers-brand-image').props.style);

    expect(style.width).toBeLessThanOrEqual(30);
    expect(style.height).toBeLessThanOrEqual(30);
  });
});
