/**
 * Testes unitários das regras visuais usadas para validar senhas no Cadastro.
 */

import { render } from '@testing-library/react-native';
import { PasswordRequirements, evaluatePassword } from '../PasswordRequirements';

describe('PasswordRequirements', () => {
  /** Confirma que a função avalia individualmente todas as regras definidas. */
  it('avalia tamanho, maiúscula, caractere especial e espaços', () => {
    expect(evaluatePassword('Password123!')).toEqual({
      hasMinimumLength: true,
      hasNoSpaces: true,
      hasSpecialCharacter: true,
      hasUppercase: true,
    });

    expect(evaluatePassword('senha curta')).toEqual({
      hasMinimumLength: true,
      hasNoSpaces: false,
      hasSpecialCharacter: false,
      hasUppercase: false,
    });
  });

  /** Garante que leitores de tela recebam o estado atual de cada requisito. */
  it('informa visual e semanticamente quais regras foram atendidas', () => {
    const { getByLabelText } = render(<PasswordRequirements password="Password123!" />);

    expect(getByLabelText('Mínimo de 8 caracteres: atendido')).toBeTruthy();
    expect(getByLabelText('Uma letra maiúscula: atendido')).toBeTruthy();
    expect(getByLabelText('Um caractere especial: atendido')).toBeTruthy();
    expect(getByLabelText('Sem espaços: atendido')).toBeTruthy();
  });
});
