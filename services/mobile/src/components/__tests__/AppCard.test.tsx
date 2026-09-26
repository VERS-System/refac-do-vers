/**
 * Testes unitários do cartão compartilhado do aplicativo VERS.
 */

import { fireEvent, render } from '@testing-library/react-native';
import { Text } from 'react-native';
import { AppCard } from '../AppCard';
import { theme } from '../../constants/theme';

describe('AppCard', () => {
  /** Renderiza o conteúdo interno dentro do cartão. */
  it('renderiza os filhos', () => {
    const { getByText } = render(
      <AppCard>
        <Text>Conteúdo</Text>
      </AppCard>,
    );

    expect(getByText('Conteúdo')).toBeTruthy();
  });

  /** Expõe rótulo acessível quando informado. */
  it('aplica rótulo de acessibilidade', () => {
    const { getByLabelText } = render(
      <AppCard accessibilityLabel="Cartão de energia">
        <Text>Energia</Text>
      </AppCard>,
    );

    expect(getByLabelText('Cartão de energia')).toBeTruthy();
  });

  /** Usa o raio padrão do tema sem impedir estilos extras. */
  it('usa o raio do tema e aceita estilo extra', () => {
    const { getByTestId } = render(
      <AppCard testID="card" style={{ height: 164 }}>
        <Text>Altura</Text>
      </AppCard>,
    );

    const style = getByTestId('card').props.style;
    const flat = Array.isArray(style) ? Object.assign({}, ...style) : style;

    expect(flat.borderRadius).toBe(theme.radii.xl);
    expect(flat.height).toBe(164);
  });

  /** Vira botão acessível quando onPress é informado. */
  it('dispara onPress como botão', () => {
    const onPress = jest.fn();
    const { getByRole } = render(
      <AppCard accessibilityLabel="Abrir uso da bateria" onPress={onPress}>
        <Text>Bateria</Text>
      </AppCard>,
    );

    fireEvent.press(getByRole('button', { name: 'Abrir uso da bateria' }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
