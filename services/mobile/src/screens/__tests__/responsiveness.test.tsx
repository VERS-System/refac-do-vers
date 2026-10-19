/**
 * Testes de responsividade das telas do aplicativo VERS.
 *
 * Travam o comportamento em largura estreita (320px) com fontes ampliadas:
 * as telas devem renderizar sem quebrar e manter a rolagem ativa.
 *
 * Nota: o mock atua em `Dimensions.get` (objeto compartilhado) em vez do
 * hook, pois cada arquivo recebe sua cópia do módulo `react-native` e o
 * spy direto no hook não alcança os componentes.
 */

import { render } from '@testing-library/react-native';
import { Dimensions, ScrollView } from 'react-native';
import { HomeScreen } from '../HomeScreen';
import { LoginScreen } from '../LoginScreen';
import { SplashScreen } from '../SplashScreen';
import { SupportScreen } from '../SupportScreen';
import { TestsScreen } from '../TestsScreen';
import { VehiclesScreen } from '../VehiclesScreen';
import { ViberScreen } from '../ViberScreen';

const NARROW = { fontScale: 3, height: 568, scale: 2, width: 320 };

/** Simula tela estreita com fontes ampliadas. */
function mockNarrowScreen() {
  jest.spyOn(Dimensions, 'get').mockReturnValue(NARROW);
}

afterEach(() => {
  jest.restoreAllMocks();
});

describe('responsividade (Task 00 - Item 6b)', () => {
  /** A Home renderiza em tela estreita com rolagem ativa. */
  it('exibe a Home em 320px com rolagem ativa', () => {
    mockNarrowScreen();
    const { getByText, getByTestId, UNSAFE_getByType } = render(<HomeScreen />);

    expect(getByTestId('home-screen')).toBeTruthy();
    expect(getByText('Battery usage')).toBeTruthy();
    expect(UNSAFE_getByType(ScrollView).props.scrollEnabled).toBe(true);
  });

  /** O Login mantém os campos alcançáveis em tela estreita. */
  it('exibe o Login em 320px com campos e ação', () => {
    mockNarrowScreen();
    const { getByLabelText, getByRole, UNSAFE_getByType } = render(<LoginScreen />);

    expect(getByLabelText('Email')).toBeTruthy();
    expect(getByLabelText('Password')).toBeTruthy();
    expect(getByRole('button', { name: 'Login' })).toBeTruthy();
    expect(UNSAFE_getByType(ScrollView).props.scrollEnabled).toBe(true);
  });

  /** A Splash reduz a logo em tela estreita em vez de estourar. */
  it('limita a logo da Splash à largura disponível', () => {
    mockNarrowScreen();
    const { getByTestId } = render(<SplashScreen />);

    const style = getByTestId('vers-logo').props.style;
    const flat = Array.isArray(style) ? Object.assign({}, ...style) : style;

    expect(flat.width).toBeCloseTo(Math.min(140, 320 * 0.36), 5);
  });

  /** O Viber mantém a conversa e o composer em tela estreita. */
  it('exibe o Viber em 320px com rolagem ativa', () => {
    mockNarrowScreen();
    const { getByTestId, UNSAFE_getByType } = render(<ViberScreen />);

    expect(getByTestId('viber-screen')).toBeTruthy();
    expect(UNSAFE_getByType(ScrollView).props.scrollEnabled).toBe(true);
  });

  /** Os Veículos mantêm lista e ações em tela estreita. */
  it('exibe os Veículos em 320px com rolagem ativa', () => {
    mockNarrowScreen();
    const { getByTestId, UNSAFE_getByType } = render(<VehiclesScreen />);

    expect(getByTestId('vehicles-screen')).toBeTruthy();
    expect(UNSAFE_getByType(ScrollView).props.scrollEnabled).toBe(true);
  });

  /** Os Testes mantêm filtros e lista em tela estreita. */
  it('exibe os Testes em 320px com rolagem ativa', () => {
    mockNarrowScreen();
    const { getByTestId, UNSAFE_getByType } = render(<TestsScreen />);

    expect(getByTestId('tests-screen')).toBeTruthy();
    expect(UNSAFE_getByType(ScrollView).props.scrollEnabled).toBe(true);
  });

  /** O Suporte mantém o conteúdo em tela estreita. */
  it('exibe o Suporte em 320px com rolagem ativa', () => {
    mockNarrowScreen();
    const { getByTestId, UNSAFE_getByType } = render(<SupportScreen />);

    expect(getByTestId('support-screen')).toBeTruthy();
    expect(UNSAFE_getByType(ScrollView).props.scrollEnabled).toBe(true);
  });
});
