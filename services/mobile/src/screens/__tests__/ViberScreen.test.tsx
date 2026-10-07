/**
 * Testes unitários da tela do Viber (Task 11, lote 11a).
 *
 * Existe para travar o scaffold visual e a rota interna: título, conversa
 * vazia inicial e voltar por callback, sem rede, cálculo ou lógica de IA.
 * As mensagens chegam por props nos próximos lotes (fixtures até o
 * contrato do ai-service); nada é buscado, persistido ou decidido aqui.
 */

import { fireEvent, render } from '@testing-library/react-native';
import { ViberScreen } from '../ViberScreen';

describe('ViberScreen (11a)', () => {
  /** Apresenta título e conversa vazia inicial. */
  it('apresenta título e conversa vazia inicial', () => {
    const { getByTestId, getByText } = render(<ViberScreen />);

    expect(getByTestId('viber-screen')).toBeTruthy();
    expect(getByText('Viber')).toBeTruthy();
    expect(getByTestId('viber-empty')).toBeTruthy();
  });

  /** Volta ao fluxo anterior por callback puro, sem regra de navegação interna. */
  it('volta ao acionar o botão voltar', () => {
    const onBack = jest.fn();
    const { getByRole } = render(<ViberScreen onBack={onBack} />);

    fireEvent.press(getByRole('button', { name: 'Voltar' }));

    expect(onBack).toHaveBeenCalledTimes(1);
  });
});

describe('ViberScreen histórico (11b)', () => {
  const MESSAGES = [
    { id: 'm1', role: 'viber' as const, text: 'Olá! Sou o Viber. Como posso ajudar?' },
    { id: 'm2', role: 'user' as const, text: 'Bom dia, Viber!' },
  ];

  /** Exibe o histórico com as mensagens informadas, sem o vazio. */
  it('exibe o histórico quando informado', () => {
    const { getByTestId, getByText, queryByTestId } = render(
      <ViberScreen messages={MESSAGES} />,
    );

    expect(getByTestId('viber-history')).toBeTruthy();
    expect(getByText('Olá! Sou o Viber. Como posso ajudar?')).toBeTruthy();
    expect(getByText('Bom dia, Viber!')).toBeTruthy();
    expect(queryByTestId('viber-empty')).toBeNull();
  });

  /** Identifica de forma acessível quem enviou cada mensagem. */
  it('identifica usuário e Viber por rótulo acessível', () => {
    const { getByLabelText } = render(<ViberScreen messages={MESSAGES} />);

    expect(getByLabelText('Viber: Olá! Sou o Viber. Como posso ajudar?')).toBeTruthy();
    expect(getByLabelText('Você: Bom dia, Viber!')).toBeTruthy();
  });

  /** Exibe o avatar do Viber com a logo e a inicial do usuário. */
  it('exibe os avatares da conversa', () => {
    const { getByLabelText, getByText } = render(
      <ViberScreen messages={MESSAGES} userInitial="A" />,
    );

    expect(getByLabelText('Avatar do Viber')).toBeTruthy();
    expect(getByText('A')).toBeTruthy();
  });

  /** Mantém só o vazio quando nenhuma mensagem é informada. */
  it('mantém o vazio sem mensagens', () => {
    const { getByTestId, queryByTestId } = render(<ViberScreen />);

    expect(getByTestId('viber-empty')).toBeTruthy();
    expect(queryByTestId('viber-history')).toBeNull();
  });
});
