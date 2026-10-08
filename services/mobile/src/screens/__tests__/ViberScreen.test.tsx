/**
 * Testes unitários da tela do Viber (Task 11, lote 11a).
 *
 * Existe para travar o scaffold visual e a rota interna: título, conversa
 * vazia inicial e voltar por callback, sem rede, cálculo ou lógica de IA.
 * As mensagens chegam por props nos próximos lotes (fixtures até o
 * contrato do ai-service); nada é buscado, persistido ou decidido aqui.
 */

import { StyleSheet } from 'react-native';
import { fireEvent, render, within } from '@testing-library/react-native';
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

describe('ViberScreen composição (11c)', () => {
  /** Repassa a digitação e o envio sem validar nada no cliente. */
  it('repassa digitação e envio no modo controlado', () => {
    const onDraftChange = jest.fn();
    const onSend = jest.fn();
    const { getByLabelText, getByRole } = render(
      <ViberScreen draft="Olá, Viber!" onDraftChange={onDraftChange} onSend={onSend} />,
    );

    fireEvent.changeText(getByLabelText('Mensagem para o Viber'), 'Olá, Viber! e mais');
    fireEvent.press(getByRole('button', { name: 'Enviar mensagem' }));

    expect(onDraftChange).toHaveBeenCalledWith('Olá, Viber! e mais');
    expect(onSend).toHaveBeenCalledWith('Olá, Viber!');
  });

  /** Mantém o digitado visível sem callbacks, sem travar a rota. */
  it('mantém o digitado sem callbacks', () => {
    const { getByDisplayValue, getByLabelText } = render(<ViberScreen />);

    fireEvent.changeText(getByLabelText('Mensagem para o Viber'), 'Oi');

    expect(getByDisplayValue('Oi')).toBeTruthy();
  });

  /** Limpa o campo após enviar no modo não-controlado. */
  it('limpa o campo após enviar sem draft', () => {
    const onSend = jest.fn();
    const { getByLabelText, getByRole, queryByDisplayValue } = render(
      <ViberScreen onSend={onSend} />,
    );

    fireEvent.changeText(getByLabelText('Mensagem para o Viber'), 'Oi');
    fireEvent.press(getByRole('button', { name: 'Enviar mensagem' }));

    expect(onSend).toHaveBeenCalledWith('Oi');
    expect(queryByDisplayValue('Oi')).toBeNull();
  });
});

describe('ViberScreen sem abas (fix da referência)', () => {
  /** Troca a navegação por abas pelo composer fixo, como na referência. */
  it('oculta as abas e mantém só o composer no rodapé', () => {
    const { getByTestId, queryByRole } = render(<ViberScreen />);

    expect(getByTestId('viber-composer')).toBeTruthy();
    expect(queryByRole('button', { name: 'Início' })).toBeNull();
    expect(queryByRole('button', { name: 'Bateria' })).toBeNull();
    expect(queryByRole('button', { name: 'Perfil' })).toBeNull();
  });

  /** Garante altura mínima confortável ao composer, como na referência. */
  it('dá altura mínima ao composer', () => {
    const { getByTestId } = render(<ViberScreen />);

    const style = StyleSheet.flatten(getByTestId('viber-composer').props.style);

    expect(style.minHeight).toBe(52);
  });

  /** Mantém o composer acima do teclado, sem sumir atrás dele. */
  it('envolve o composer no ajuste de teclado', () => {
    const { getByTestId } = render(<ViberScreen />);

    expect(
      within(getByTestId('viber-keyboard-avoid')).getByTestId('viber-composer'),
    ).toBeTruthy();
  });
});

describe('ViberScreen selos e referência (11d)', () => {
  /** Avisa quando a resposta é inferência, sem esconder a mensagem. */
  it('sinaliza inferência do Viber', () => {
    const { getByTestId, getByText } = render(
      <ViberScreen
        messages={[{ id: 'm1', kind: 'inference', role: 'viber', text: 'Acho que a bateria rendeu bem.' }]}
      />,
    );

    expect(getByText('Acho que a bateria rendeu bem.')).toBeTruthy();
    expect(getByTestId('viber-kind-seal')).toBeTruthy();
    expect(getByText('Inferência do Viber — pode conter erros')).toBeTruthy();
  });

  /** Avisa quando a resposta é recomendação. */
  it('sinaliza recomendação do Viber', () => {
    const { getByTestId, getByText } = render(
      <ViberScreen
        messages={[{ id: 'm1', kind: 'recommendation', role: 'viber', text: 'Vale revisar os piezos.' }]}
      />,
    );

    expect(getByTestId('viber-kind-seal')).toBeTruthy();
    expect(getByText('Recomendação do Viber — confira antes de agir')).toBeTruthy();
  });

  /** Não sela medição, explicação ou mensagem sem kind. */
  it('omite o selo fora de inferência e recomendação', () => {
    const { queryByTestId, rerender } = render(
      <ViberScreen
        messages={[{ id: 'm1', kind: 'measurement', role: 'viber', text: '12 Wh.' }]}
      />,
    );

    expect(queryByTestId('viber-kind-seal')).toBeNull();

    rerender(
      <ViberScreen
        messages={[{ id: 'm1', role: 'viber', text: 'Entendi.' }]}
      />,
    );

    expect(queryByTestId('viber-kind-seal')).toBeNull();
  });

  /** Exibe o período de referência cru quando informado. */
  it('exibe a referência informada e omite quando ausente', () => {
    const { getByTestId, getByText, queryByTestId, rerender } = render(
      <ViberScreen
        messages={[{ id: 'm1', referenceLabel: 'Últimos 30 dias', role: 'viber', text: 'Resumo.' }]}
      />,
    );

    expect(getByTestId('viber-reference')).toBeTruthy();
    expect(getByText('Últimos 30 dias')).toBeTruthy();

    rerender(<ViberScreen messages={[{ id: 'm1', role: 'viber', text: 'Resumo.' }]} />);

    expect(queryByTestId('viber-reference')).toBeNull();
  });
});
