/**
 * Testes unitários dos estados de feedback compartilhados do aplicativo VERS.
 */

import { fireEvent, render } from '@testing-library/react-native';
import { Text } from 'react-native';
import { Feedback } from '../Feedback';

describe('Feedback', () => {
  /** Exibe a mensagem de carregamento, com padrão quando não informada. */
  it('exibe carregamento', () => {
    const { getByText, rerender } = render(<Feedback.Loading />);

    expect(getByText('Carregando...')).toBeTruthy();

    rerender(<Feedback.Loading message="Buscando dados..." />);

    expect(getByText('Buscando dados...')).toBeTruthy();
  });

  /** Exibe título, mensagem e ação do estado vazio. */
  it('exibe vazio com ação', () => {
    const onAction = jest.fn();
    const { getByRole, getByText } = render(
      <Feedback.Empty
        actionLabel="Cadastrar veículo"
        message="Nada por aqui ainda."
        onAction={onAction}
        title="Sem dados"
      />,
    );

    expect(getByText('Sem dados')).toBeTruthy();
    expect(getByText('Nada por aqui ainda.')).toBeTruthy();

    fireEvent.press(getByRole('button', { name: 'Cadastrar veículo' }));

    expect(onAction).toHaveBeenCalledTimes(1);
  });

  /** O vazio sem ação não exibe botão. */
  it('oculta a ação do vazio quando não informada', () => {
    const { queryByRole } = render(<Feedback.Empty title="Sem dados" />);

    expect(queryByRole('button')).toBeNull();
  });

  /** Exibe erro com repetição. */
  it('exibe erro com repetição', () => {
    const onRetry = jest.fn();
    const { getByRole, getByText } = render(
      <Feedback.Error message="Falha ao carregar." onRetry={onRetry} />,
    );

    expect(getByText('Falha ao carregar.')).toBeTruthy();

    fireEvent.press(getByRole('button', { name: 'Tentar novamente' }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  /** O erro sem onRetry não exibe botão. */
  it('oculta a repetição do erro quando não informada', () => {
    const { queryByRole } = render(<Feedback.Error message="Falha." />);

    expect(queryByRole('button')).toBeNull();
  });

  /** Exibe indisponibilidade offline com repetição opcional. */
  it('exibe offline', () => {
    const onRetry = jest.fn();
    const { getByRole, getByText, rerender } = render(
      <Feedback.Offline onRetry={onRetry} />,
    );

    expect(getByText('Sem conexão.')).toBeTruthy();

    fireEvent.press(getByRole('button', { name: 'Tentar novamente' }));

    expect(onRetry).toHaveBeenCalledTimes(1);

    rerender(<Feedback.Offline message="Wi-Fi desligado." />);

    expect(getByText('Wi-Fi desligado.')).toBeTruthy();
  });

  /** Permite conteúdo extra sem quebrar os estados. */
  it('renderiza children auxiliares', () => {
    const { getByText } = render(
      <Feedback.Empty title="Sem dados">
        <Text>Extra</Text>
      </Feedback.Empty>,
    );

    expect(getByText('Extra')).toBeTruthy();
  });

  /** Anuncia erro e offline via live-region (Task 00 - Item 6c). */
  it('expõe live-region nos estados de erro e offline', () => {
    const error = render(<Feedback.Error message="Falha." testID="erro" />);
    const offline = render(<Feedback.Offline testID="offline" />);

    expect(error.getByTestId('erro').props.accessibilityLiveRegion).toBe('assertive');
    expect(offline.getByTestId('offline').props.accessibilityLiveRegion).toBe('polite');
  });
});
