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

describe('ViberScreen atalhos e contexto (11e)', () => {
  /** Preenche o rascunho ao tocar nos atalhos, sem navegar. */
  it('preenche o rascunho com os atalhos', () => {
    const onDraftChange = jest.fn();
    const { getByRole } = render(
      <ViberScreen draft="" onDraftChange={onDraftChange} />,
    );

    fireEvent.press(getByRole('button', { name: 'Battery usage' }));

    expect(onDraftChange).toHaveBeenCalledWith('Battery usage');

    const uncontrolled = render(<ViberScreen />);
    fireEvent.press(uncontrolled.getByRole('button', { name: 'Money economy' }));

    expect(uncontrolled.getByDisplayValue('Money economy')).toBeTruthy();
  });

  /** Lista só os contextos autorizados e notifica a escolha. */
  it('seleciona contexto entre os autorizados', () => {
    const onContextChange = jest.fn();
    const { getByRole } = render(
      <ViberScreen
        contexts={[
          { id: 'instalacao', label: 'Instalação' },
          { id: 'teste-atual', label: 'Teste atual' },
        ]}
        onContextChange={onContextChange}
      />,
    );

    fireEvent.press(getByRole('button', { name: 'Teste atual' }));

    expect(onContextChange).toHaveBeenCalledWith('teste-atual');
  });

  /** Marca o contexto atual e omite o seletor sem autorizados. */
  it('marca o contexto atual e omite sem autorizados', () => {
    const { getByRole, queryByTestId, rerender } = render(
      <ViberScreen
        contextId="instalacao"
        contexts={[{ id: 'instalacao', label: 'Instalação' }]}
      />,
    );

    expect(getByRole('button', { name: 'Instalação' }).props.accessibilityState).toEqual(
      expect.objectContaining({ selected: true }),
    );

    rerender(<ViberScreen />);

    expect(queryByTestId('viber-contexts')).toBeNull();
  });
});

describe('ViberScreen estados e falha (11f)', () => {
  /** Mostra que o Viber está respondendo durante o envio. */
  it('indica envio em andamento', () => {
    const { getByTestId, getByText } = render(<ViberScreen status="sending" />);

    expect(getByTestId('viber-sending')).toBeTruthy();
    expect(getByText('Viber está respondendo…')).toBeTruthy();
  });

  /** Exibe o erro com repetição, sem apagar o digitado. */
  it('exibe erro com tentar novamente e preserva o rascunho', () => {
    const onRetry = jest.fn();
    const { getByDisplayValue, getByRole, getByTestId, getByText } = render(
      <ViberScreen draft="Oi" onRetry={onRetry} status="error" />,
    );

    expect(getByTestId('viber-error')).toBeTruthy();
    expect(getByText('Não foi possível conversar com o Viber.')).toBeTruthy();
    expect(getByDisplayValue('Oi')).toBeTruthy();

    fireEvent.press(getByRole('button', { name: 'Tentar novamente' }));

    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(getByDisplayValue('Oi')).toBeTruthy();
  });

  /** Avisa a indisponibilidade sem apagar o digitado. */
  it('avisa indisponibilidade e preserva o digitado', () => {
    const { getByDisplayValue, getByTestId, getByText } = render(
      <ViberScreen draft="Oi" status="unavailable" />,
    );

    expect(getByTestId('viber-unavailable')).toBeTruthy();
    expect(getByText('Viber indisponível no momento.')).toBeTruthy();
    expect(getByDisplayValue('Oi')).toBeTruthy();
  });

  /** Mantém o vazio explícito no estado vazio. */
  it('mantém o vazio no estado vazio', () => {
    const { getByTestId } = render(<ViberScreen status="empty" />);

    expect(getByTestId('viber-empty')).toBeTruthy();
  });
});

describe('ViberScreen acessibilidade e layout (11g)', () => {
  /** Expõe nome+papel em todos os botões: voltar, atalhos, contexto, envio e erro. */
  it('expõe nome acessível em botões e atalhos', () => {
    const { getAllByRole } = render(
      <ViberScreen
        contextId="instalacao"
        contexts={[
          { id: 'instalacao', label: 'Instalação' },
          { id: 'teste-atual', label: 'Teste atual' },
        ]}
        messages={[{ id: 'm1', role: 'viber', text: 'Olá!' }]}
        onBack={jest.fn()}
        onRetry={jest.fn()}
        status="error"
      />,
    );

    const buttons = getAllByRole('button');
    expect(buttons.length).toBeGreaterThanOrEqual(7);

    for (const button of buttons) {
      expect(button.props.accessibilityLabel).toBeTruthy();
      expect(button.props.accessibilityRole).toBe('button');
    }
  });

  /** Renderiza mensagem longa sem estourar a bolha. */
  it('renderiza mensagem longa', () => {
    const long = 'A'.repeat(500);
    const { getByText } = render(
      <ViberScreen messages={[{ id: 'm1', role: 'viber', text: long }]} />,
    );

    expect(getByText(long)).toBeTruthy();
  });

  /** Trata links como texto permitido, sem navegação própria. */
  it('exibe links como texto', () => {
    const { getByText } = render(
      <ViberScreen
        messages={[{ id: 'm1', role: 'viber', text: 'Saiba mais em https://vers.com/vers' }]}
      />,
    );

    expect(getByText('Saiba mais em https://vers.com/vers')).toBeTruthy();
  });
});
