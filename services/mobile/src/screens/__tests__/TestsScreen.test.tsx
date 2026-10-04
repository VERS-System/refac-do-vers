/**
 * Testes unitários da tela de testes experimentais (Task 08, lotes 08a–08g).
 *
 * Existe para travar o scaffold visual, a rota interna, a listagem paginada,
 * os filtros visuais, os detalhes, o planejamento, as confirmações e a
 * acessibilidade: título, linhas, filtros, detalhes, formulário e ações por
 * props, sem rede, cálculo ou persistência. Os dados chegam por props
 * (fixtures até F01/F05); transições nunca são presumidas e nenhum comando
 * MQTT passa por aqui.
 */

import { fireEvent, render } from '@testing-library/react-native';
import { TestsScreen } from '../TestsScreen';

describe('TestsScreen (08a)', () => {
  /** Apresenta título e lista vazia inicial. */
  it('apresenta título e lista vazia inicial', () => {
    const { getByTestId, getByText } = render(<TestsScreen />);

    expect(getByTestId('tests-screen')).toBeTruthy();
    expect(getByText('Testes')).toBeTruthy();
    expect(getByTestId('tests-empty')).toBeTruthy();
  });

  /** Volta ao fluxo anterior por callback puro, sem regra de navegação interna. */
  it('volta ao acionar o botão voltar', () => {
    const onBack = jest.fn();
    const { getByRole } = render(<TestsScreen onBack={onBack} />);

    fireEvent.press(getByRole('button', { name: 'Voltar' }));

    expect(onBack).toHaveBeenCalledTimes(1);
  });
});

describe('TestsScreen listagem (08b)', () => {
  const ITEMS = [
    { id: 't1', name: 'Asfalto seco', periodLabel: '14/03/2026 12:00 UTC', status: 'COMPLETED' as const },
    { id: 't2', name: 'Terra molhada', periodLabel: '15/03/2026 12:00 UTC', status: 'RUNNING' as const },
  ];

  /** Exibe linhas com nome, status traduzido e período cru, sem vazio. */
  it('exibe a listagem quando informada', () => {
    const { getAllByText, getByTestId, getByText, queryByTestId } = render(
      <TestsScreen items={ITEMS} />,
    );

    expect(getByTestId('tests-list')).toBeTruthy();
    expect(getByText('Asfalto seco')).toBeTruthy();
    expect(getAllByText('Concluído').length).toBeGreaterThanOrEqual(1);
    expect(getAllByText('Em execução').length).toBeGreaterThanOrEqual(1);
    expect(queryByTestId('tests-empty')).toBeNull();
  });

  /** Seleciona o teste por callback puro, sem regra de navegação interna. */
  it('notifica a seleção do teste sem buscar dados', () => {
    const onSelectTest = jest.fn();
    const { getByText } = render(
      <TestsScreen items={ITEMS} onSelectTest={onSelectTest} />,
    );

    fireEvent.press(getByText('Asfalto seco'));

    expect(onSelectTest).toHaveBeenCalledWith('t1');
  });

  /** Pagina por callback com travas nos limites. */
  it('pagina por callback com travas nos limites', () => {
    const onPageChange = jest.fn();
    const { getByRole, getByText } = render(
      <TestsScreen items={ITEMS} onPageChange={onPageChange} page={1} pageSize={1} totalItems={2} />,
    );

    expect(getByText('Página 1 de 2')).toBeTruthy();

    fireEvent.press(getByRole('button', { name: 'Próxima página' }));
    expect(onPageChange).toHaveBeenCalledWith(2);

    fireEvent.press(getByRole('button', { name: 'Página anterior' }));
    expect(onPageChange).not.toHaveBeenCalledWith(0);
  });
});

describe('TestsScreen filtros (08c)', () => {
  /** Exibe o filtro atual sem filtrar localmente. */
  it('exibe o filtro atual informado', () => {
    const { getByTestId, getByText } = render(
      <TestsScreen installationFilter="inst-123" statusFilter="RUNNING" />,
    );

    expect(getByTestId('tests-filters')).toBeTruthy();
    expect(getByText('Em execução')).toBeTruthy();
    expect(getByText('inst-123')).toBeTruthy();
  });

  /** Notifica a troca de filtro sem aplicar regra local. */
  it('notifica a troca de filtro por callback', () => {
    const onFilterChange = jest.fn();
    const { getByRole } = render(<TestsScreen onFilterChange={onFilterChange} />);

    fireEvent.press(getByRole('button', { name: 'Filtrar: Em execução' }));

    expect(onFilterChange).toHaveBeenCalledWith({
      installationFilter: null,
      statusFilter: 'RUNNING',
    });
  });

  /** Mantém o filtro sem callbacks (rota interna sem estado do pai). */
  it('mantém o filtro sem callbacks', () => {
    const { getByRole, getByText } = render(<TestsScreen />);

    fireEvent.press(getByRole('button', { name: 'Filtrar: Em execução' }));

    expect(getByText('Filtro: Em execução')).toBeTruthy();
    expect(
      getByRole('button', { name: 'Filtrar: Em execução' }).props.accessibilityState,
    ).toEqual(expect.objectContaining({ selected: true }));
  });

  /** Destaca o chip do filtro ativo. */
  it('destaca o chip do filtro ativo', () => {
    const { getByRole } = render(<TestsScreen statusFilter="RUNNING" />);
    const { StyleSheet } = require('react-native');

    const selected = StyleSheet.flatten(
      getByRole('button', { name: 'Filtrar: Em execução' }).props.style,
    );
    const idle = StyleSheet.flatten(
      getByRole('button', { name: 'Filtrar: Todos' }).props.style,
    );

    expect(selected.backgroundColor).toBeTruthy();
    expect(selected.backgroundColor).not.toBe(idle.backgroundColor);
  });
});

describe('TestsScreen detalhes (08d)', () => {
  const SELECTED = {
    name: 'Asfalto seco',
    notes: 'Pista plana sem vento',
    outcome: 'SATISFACTORY' as const,
    snapshot: {
      activePiezoCount: 12,
      configurationVersion: 3,
      testLocation: 'Pista A',
      vehicleModel: 'Modelo Exemplo',
    },
    startedAt: '2026-03-14T12:00:00.000Z',
    status: 'COMPLETED' as const,
    terrain: 'HIGHWAY' as const,
    testLocation: 'Pista A',
  };

  /** Exibe o detalhe com contexto, snapshot, período e resultado crus. */
  it('exibe o detalhe quando informado', () => {
    const { getAllByText, getByTestId, getByText } = render(<TestsScreen selectedTest={SELECTED} />);

    expect(getByTestId('tests-detail')).toBeTruthy();
    expect(getByText('Asfalto seco')).toBeTruthy();
    expect(getAllByText('Rodovia').length).toBeGreaterThanOrEqual(1);
    expect(getAllByText('Pista A').length).toBeGreaterThanOrEqual(1);
    expect(getByText('12 piezos')).toBeTruthy();
    expect(getByText('Satisfatório')).toBeTruthy();
  });

  /** Omite o detalhe sem seleção sem parecer falha. */
  it('omite o detalhe sem seleção', () => {
    const { getByTestId, queryByTestId } = render(<TestsScreen />);

    expect(getByTestId('tests-filters')).toBeTruthy();
    expect(queryByTestId('tests-detail')).toBeNull();
  });
});

describe('TestsScreen planejamento (08e)', () => {
  /** Exibe o formulário com o rascunho informado. */
  it('exibe o formulário com o rascunho', () => {
    const { getByDisplayValue, getByTestId } = render(
      <TestsScreen planDraft={{ name: 'Asfalto seco', terrain: 'HIGHWAY', testLocation: 'Pista A' }} />,
    );

    expect(getByTestId('tests-plan-form')).toBeTruthy();
    expect(getByDisplayValue('Asfalto seco')).toBeTruthy();
    expect(getByDisplayValue('Pista A')).toBeTruthy();
  });

  /** Repassa a edição e o envio sem validar domínio. */
  it('repassa a edição e o envio por callbacks', () => {
    const onPlanChange = jest.fn();
    const onSubmitPlan = jest.fn();
    const { getByLabelText, getByRole } = render(
      <TestsScreen onPlanChange={onPlanChange} onSubmitPlan={onSubmitPlan} planDraft={{ name: '' }} />,
    );

    fireEvent.changeText(getByLabelText('Nome'), 'Terra molhada');
    expect(onPlanChange).toHaveBeenCalledWith(expect.objectContaining({ name: 'Terra molhada' }));

    fireEvent.press(getByRole('button', { name: 'Planejar teste' }));
    expect(onSubmitPlan).toHaveBeenCalledTimes(1);
  });

  /** Mantém o digitado sem callbacks (rota interna sem estado do pai). */
  it('mantém o digitado sem callbacks', () => {
    const { getByDisplayValue, getByLabelText } = render(<TestsScreen />);

    fireEvent.changeText(getByLabelText('Nome'), 'Terra molhada');

    expect(getByDisplayValue('Terra molhada')).toBeTruthy();
  });

  /** Marca o terreno sem callbacks e destaca a opção. */
  it('marca o terreno sem callbacks', () => {
    const { getByRole } = render(<TestsScreen />);
    const { StyleSheet } = require('react-native');

    fireEvent.press(getByRole('button', { name: 'Terreno: Cidade' }));

    expect(
      getByRole('button', { name: 'Terreno: Cidade' }).props.accessibilityState,
    ).toEqual(expect.objectContaining({ selected: true }));

    const selected = StyleSheet.flatten(
      getByRole('button', { name: 'Terreno: Cidade' }).props.style,
    );
    const idle = StyleSheet.flatten(
      getByRole('button', { name: 'Terreno: Rodovia' }).props.style,
    );
    expect(selected.backgroundColor).not.toBe(idle.backgroundColor);
  });

  /** Cria o teste sem callbacks e exibe na lista. */
  it('cria o teste sem callbacks e exibe na lista', () => {
    const { getByLabelText, getByRole, getByTestId, getByText, queryByTestId } = render(
      <TestsScreen />,
    );

    expect(queryByTestId('tests-list')).toBeNull();

    fireEvent.changeText(getByLabelText('Nome'), 'Novo teste');
    fireEvent.press(getByRole('button', { name: 'Planejar teste' }));

    expect(getByTestId('tests-list')).toBeTruthy();
    expect(getByText('Novo teste')).toBeTruthy();
    expect(queryByTestId('tests-empty')).toBeNull();
  });
});

describe('TestsScreen confirmações (08f)', () => {
  const PLANNED = { name: 'Asfalto seco', status: 'PLANNED' as const };
  const RUNNING = { name: 'Terra molhada', status: 'RUNNING' as const };

  /** Confirma antes de solicitar o início, sem presumir transição. */
  it('confirma antes de solicitar o início', () => {
    const onStart = jest.fn();
    const { getByRole, queryByRole } = render(
      <TestsScreen onStart={onStart} selectedTest={PLANNED} />,
    );

    fireEvent.press(getByRole('button', { name: 'Iniciar teste' }));
    expect(onStart).not.toHaveBeenCalled();
    expect(queryByRole('button', { name: 'Confirmar início' })).toBeTruthy();

    fireEvent.press(getByRole('button', { name: 'Confirmar início' }));
    expect(onStart).toHaveBeenCalledTimes(1);
  });

  /** Exibe a execução com dados recentes e conexão crus. */
  it('exibe dados recentes e conexão na execução', () => {
    const { getByTestId, getByText } = render(
      <TestsScreen
        connectionLabel="MQTT conectado"
        recentDataLabel="12,4 V · 0,8 A"
        selectedTest={RUNNING}
      />,
    );

    expect(getByTestId('tests-actions')).toBeTruthy();
    expect(getByText('12,4 V · 0,8 A')).toBeTruthy();
    expect(getByText('MQTT conectado')).toBeTruthy();
  });

  /** Representa o conflito sem presumir transição. */
  it('representa o conflito com mensagem pública', () => {
    const { getByTestId, getByText, queryByTestId } = render(
      <TestsScreen
        actionState="conflict"
        conflictMessage="Outro usuário alterou o teste."
        selectedTest={PLANNED}
      />,
    );

    expect(getByTestId('tests-conflict')).toBeTruthy();
    expect(getByText('Outro usuário alterou o teste.')).toBeTruthy();
    expect(queryByTestId('tests-actions')).toBeNull();
  });
});

describe('TestsScreen acessibilidade (08g)', () => {
  /** Expõe nome+papel em todos os botões: voltar, filtros, lista, paginação, form, ações e abas. */
  it('expõe nome acessível em botões e atalhos', () => {
    const { getAllByRole } = render(
      <TestsScreen
        items={[
          { id: 't1', name: 'Asfalto seco', status: 'PLANNED' },
        ]}
        onBack={jest.fn()}
        onFilterChange={jest.fn()}
        onPageChange={jest.fn()}
        onPlanChange={jest.fn()}
        onSelectTest={jest.fn()}
        onStart={jest.fn()}
        onSubmitPlan={jest.fn()}
        selectedTest={{ name: 'Asfalto seco', status: 'PLANNED' }}
      />,
    );

    const buttons = getAllByRole('button');
    expect(buttons.length).toBeGreaterThanOrEqual(12);

    for (const button of buttons) {
      expect(button.props.accessibilityLabel).toBeTruthy();
      expect(button.props.accessibilityRole).toBe('button');
    }
  });

  /** Informa o filtro atual ao leitor de tela. */
  it('informa o filtro selecionado ao leitor de tela', () => {
    const { getByRole } = render(<TestsScreen />);

    expect(
      getByRole('button', { name: 'Filtrar: Todos' }).props.accessibilityState,
    ).toEqual(expect.objectContaining({ selected: true }));
    expect(
      getByRole('button', { name: 'Filtrar: Em execução' }).props.accessibilityState,
    ).toEqual(expect.objectContaining({ selected: false }));
  });
});
