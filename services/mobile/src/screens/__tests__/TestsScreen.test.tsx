/**
 * Testes unitários da tela de testes experimentais (Task 08, lotes 08a–08c).
 *
 * Existe para travar o scaffold visual, a rota interna, a listagem paginada
 * e os filtros visuais: título, vazio inicial, linhas com nome, status e
 * período crus, paginação e filtros por callback, sem rede, cálculo ou
 * persistência. Os dados chegam por props (fixtures até F01/F05); transições
 * nunca são presumidas e nenhum comando MQTT passa por aqui.
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
});
