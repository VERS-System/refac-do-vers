/**
 * Valores de referência usados para dar escala às medições nas telas.
 *
 * Não são medidos pelo VERS: são premissas fixas e explícitas, para que
 * comparações como "≈ 7% de uma recarga" sejam rastreáveis.
 */

/**
 * Capacidade de referência de um celular, em mWh (4.000 mAh × 3,85 V).
 *
 * Base do "≈ 7% de uma recarga" da tela Energia (1,03 Wh ÷ 15,4 Wh).
 */
export const CAPACIDADE_CELULAR_MWH = 15400;
