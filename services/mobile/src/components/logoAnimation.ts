/**
 * Define o plano de animação de entrada das barras do logotipo VERS.
 *
 * Cada barra sai pela lateral da tela, reaparece pelo outro lado e volta ao
 * centro com um spring de baixa fricção (efeito bounce), de forma escalonada.
 * A ordem varia conforme o sentido da transição: ao entrar no Cadastro a
 * direita se move primeiro e, ao entrar no Login, a esquerda se move primeiro.
 */

export type LogoBar = 'left' | 'center' | 'right';

/** Identifica o sentido da navegação que dispara a animação da logo. */
export type LogoAnimationKind = 'login' | 'register';

/** Parâmetros da animação de uma barra específica. */
export type LogoBarAnimation = {
  bar: LogoBar;
  /** Atraso antes do início do movimento, em milissegundos. */
  delayMs: number;
  /** Sentido da saída: 1 sai pela direita, -1 sai pela esquerda. */
  direction: 1 | -1;
  /** Duração da saída da tela, em milissegundos, antes de voltar pelo outro lado. */
  exitDurationMs: number;
  /** Fricção do spring — quanto menor, mais "quica" o movimento. */
  friction: number;
  /** Tensão do spring — controla a velocidade da aproximação. */
  tension: number;
};

/** Plano completo com a ordem de entrada das três barras. */
export type LogoAnimationPlan = {
  bars: LogoBarAnimation[];
};

/** Atraso fixo entre o início do movimento de cada barra. */
export const LOGO_BAR_DELAY_MS = 50;

/** Duração da saída da tela antes de a barra reaparecer pelo outro lado. */
export const LOGO_EXIT_DURATION_MS = 500;

/** Fricção padrão do spring para produzir o efeito bounce. */
export const LOGO_SPRING_FRICTION = 75;

/** Tensão padrão do spring para a aproximação do encaixe. */
export const LOGO_SPRING_TENSION = 260;

/**
 * Gera o plano escalonado da animação para a direção informada.
 * Ao entrar no Cadastro as barras saem pela direita; ao entrar no Login, pela
 * esquerda. A ordem de saída segue o sentido da transição.
 */
export function getLogoAnimationPlan(kind: LogoAnimationKind): LogoAnimationPlan {
  const direction: 1 | -1 = kind === 'register' ? 1 : -1;
  const order: LogoBar[] =
    kind === 'register' ? ['right', 'center', 'left'] : ['left', 'center', 'right'];

  const bars = order.map((bar, index) => ({
    bar,
    delayMs: index * LOGO_BAR_DELAY_MS,
    direction,
    exitDurationMs: LOGO_EXIT_DURATION_MS,
    friction: LOGO_SPRING_FRICTION,
    tension: LOGO_SPRING_TENSION,
  }));

  return { bars };
}

/**
 * Calcula a distância horizontal que leva uma barra para fora dos limites da
 * tela, considerando que a logo fica centralizada no eixo horizontal.
 */
export function getLogoTravelDistance(screenWidth: number): number {
  return screenWidth;
}

/**
 * Calcula o deslocamento vertical inicial da logo na splash screen para que ela
 * parta do centro da tela e, ao animar para zero, termine na posição do topo
 * (mesma usada nas telas de Login e Cadastro).
 */
export function getSplashCenterOffset(
  screenHeight: number,
  logoHeight: number,
  topTarget: number,
): number {
  return (screenHeight - logoHeight) / 2 - topTarget;
}