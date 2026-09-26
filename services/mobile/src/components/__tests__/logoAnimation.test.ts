/**
 * Testes unitários do plano de animação das barras do logotipo VERS.
 */

import {
  getLogoAnimationPlan,
  getLogoTravelDistance,
  getSplashCenterOffset,
  LOGO_BAR_DELAY_MS,
  LOGO_EXIT_DURATION_MS,
  LOGO_SPRING_FRICTION,
} from '../logoAnimation';

describe('getLogoAnimationPlan', () => {
  /** Ao entrar no Cadastro, a direita desloca primeiro, depois meio e esquerda. */
  it('ao entrar no cadastro, ordena direita, meio e esquerda', () => {
    const plan = getLogoAnimationPlan('register');

    expect(plan.bars.map((bar) => bar.bar)).toEqual(['right', 'center', 'left']);
  });

  /** Ao entrar no Login, a esquerda desloca primeiro, depois meio e direita. */
  it('ao entrar no login, ordena esquerda, meio e direita', () => {
    const plan = getLogoAnimationPlan('login');

    expect(plan.bars.map((bar) => bar.bar)).toEqual(['left', 'center', 'right']);
  });

  /** Garante o atraso escalonado que simula o encaixe entre as barras. */
  it('aplica atraso crescente entre as barras', () => {
    const plan = getLogoAnimationPlan('register');

    expect(plan.bars[0].delayMs).toBe(0);
    expect(plan.bars[1].delayMs).toBe(LOGO_BAR_DELAY_MS);
    expect(plan.bars[2].delayMs).toBe(LOGO_BAR_DELAY_MS * 2);
  });

  /** Ao entrar no cadastro, cada barra sai da tela pela direita. */
  it('faz as barras saírem pela direita ao entrar no cadastro', () => {
    const plan = getLogoAnimationPlan('register');

    plan.bars.forEach((bar) => expect(bar.direction).toBe(1));
  });

  /** Ao entrar no login, cada barra sai da tela pela esquerda. */
  it('faz as barras saírem pela esquerda ao entrar no login', () => {
    const plan = getLogoAnimationPlan('login');

    plan.bars.forEach((bar) => expect(bar.direction).toBe(-1));
  });

  /** Usa spring com fricção e tensão definidos pelo plano de animação. */
  it('usa spring com fricção e tensão definidos pelo plano', () => {
    const plan = getLogoAnimationPlan('register');

    plan.bars.forEach((bar) => {
      expect(bar.friction).toBe(LOGO_SPRING_FRICTION);
      expect(bar.tension).toBeGreaterThan(0);
    });
  });

  /** Todos os movimentos de saída usam a mesma duração. */
  it('mantém a mesma duração de saída em todas as barras', () => {
    const plan = getLogoAnimationPlan('register');

    plan.bars.forEach((bar) => expect(bar.exitDurationMs).toBe(LOGO_EXIT_DURATION_MS));
  });

  /** Confirma duração total idêntica nos dois sentidos de transição. */
  it('mantém a mesma duração total nos dois sentidos', () => {
    const login = getLogoAnimationPlan('login');
    const register = getLogoAnimationPlan('register');

    expect(login.bars[2].delayMs).toBe(register.bars[2].delayMs);
  });
});

describe('getLogoTravelDistance', () => {
  /** A barra precisa sair da tela, então o deslocamento cobre a largura total. */
  it('leva a barra para fora dos limites da tela', () => {
    const travel = getLogoTravelDistance(390);

    expect(travel).toBeGreaterThanOrEqual(390);
  });
});

describe('getSplashCenterOffset', () => {
  /** A logo parte do centro e sobe até o topo, então o deslocamento é positivo. */
  it('calcula o deslocamento inicial do centro para o topo', () => {
    const offset = getSplashCenterOffset(800, 60, 40);

    expect(offset).toBe((800 - 60) / 2 - 40);
    expect(offset).toBeGreaterThan(0);
  });
});