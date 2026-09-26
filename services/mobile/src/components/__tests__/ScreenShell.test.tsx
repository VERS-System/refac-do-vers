/**
 * Testes unitários do invólucro padrão de telas do aplicativo VERS.
 */

import { render } from '@testing-library/react-native';
import { ScrollView, Text } from 'react-native';
import { ScreenShell } from '../ScreenShell';

describe('ScreenShell (Task 00 - Item 5)', () => {
  /** Renderiza o conteúdo e repassa o identificador à área segura. */
  it('renderiza os filhos com o testID da tela', () => {
    const { getByTestId, getByText } = render(
      <ScreenShell testID="login-screen">
        <Text>Conteúdo</Text>
      </ScreenShell>,
    );

    expect(getByTestId('login-screen')).toBeTruthy();
    expect(getByText('Conteúdo')).toBeTruthy();
  });

  /** Mantém rolagem ativada por padrão para telas estreitas e fontes ampliadas. */
  it('deixa a rolagem ativada por padrão', () => {
    const { UNSAFE_getByType } = render(
      <ScreenShell testID="tela">
        <Text>Conteúdo</Text>
      </ScreenShell>,
    );

    expect(UNSAFE_getByType(ScrollView).props.scrollEnabled).toBe(true);
  });

  /** Permite desativar a rolagem quando a tela não precisa. */
  it('respeita scrollEnabled falso', () => {
    const { UNSAFE_getByType } = render(
      <ScreenShell scrollEnabled={false} testID="tela">
        <Text>Conteúdo</Text>
      </ScreenShell>,
    );

    expect(UNSAFE_getByType(ScrollView).props.scrollEnabled).toBe(false);
  });

  /** Permite estilo extra no container de rolagem. */
  it('aplica contentContainerStyle da tela', () => {
    const { UNSAFE_getByType } = render(
      <ScreenShell contentContainerStyle={{ paddingTop: 30 }} testID="tela">
        <Text>Conteúdo</Text>
      </ScreenShell>,
    );

    const style = UNSAFE_getByType(ScrollView).props.contentContainerStyle;
    const flat = Array.isArray(style) ? Object.assign({}, ...style) : style;

    expect(flat.paddingTop).toBe(30);
    expect(flat.flexGrow).toBe(1);
  });

  /** Renderiza o rodapé fixo fora da rolagem. */
  it('renderiza o footer fora da rolagem', () => {
    const { getByTestId, UNSAFE_getByType } = render(
      <ScreenShell footer={<Text testID="rodape">Nav</Text>} testID="tela">
        <Text>Conteúdo</Text>
      </ScreenShell>,
    );

    expect(getByTestId('rodape')).toBeTruthy();
    expect(UNSAFE_getByType(ScrollView)).toBeTruthy();
  });
});
