/**
 * Substitui ícones dependentes de fontes nativas por texto durante testes Jest.
 */

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');

  /** Mantém as propriedades relevantes do ícone sem carregar fontes do Expo. */
  function MockIcon({ name, ...props }) {
    return React.createElement(Text, { ...props, testID: `icon-${name}` }, name);
  }

  MockIcon.glyphMap = {};

  return { Ionicons: MockIcon };
});
