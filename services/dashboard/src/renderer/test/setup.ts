/**
 * Preparação comum dos testes unitários do renderer.
 *
 * Registra os matchers do Testing Library (por exemplo `toBeInTheDocument`)
 * no Vitest e desmonta os componentes renderizados ao fim de cada teste, para
 * que um teste não interfira no próximo.
 *
 * Também supre o que o jsdom não tem e os gráficos do Recharts precisam: um
 * `ResizeObserver` e um tamanho para o contêiner responsivo (o jsdom não faz
 * layout e mediria 0 × 0, o que impede o desenho e gera avisos).
 */

import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import { PREFERENCIAS_PADRAO, usePreferencias } from '@/stores/preferencias';

/** Tamanho fixo dado aos contêineres do Recharts nos testes. */
const TAMANHO_GRAFICO = { width: 800, height: 240 };

/** `ResizeObserver` que não observa nada: o tamanho vem do stub abaixo. */
class ResizeObserverDeTeste {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver ??= ResizeObserverDeTeste as unknown as typeof ResizeObserver;

/**
 * Dá tamanho só aos contêineres responsivos do Recharts, mantendo a medida
 * original (zero) para os demais elementos.
 */
const medirOriginal = HTMLElement.prototype.getBoundingClientRect;
HTMLElement.prototype.getBoundingClientRect = function medir(this: HTMLElement) {
  if (this.classList.contains('recharts-responsive-container')) {
    return {
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      ...TAMANHO_GRAFICO,
      toJSON() {},
    } as DOMRect;
  }
  return medirOriginal.call(this);
};

afterEach(() => {
  cleanup();
  // Preferências salvas num teste não podem vazar para o próximo.
  localStorage.clear();
  usePreferencias.setState(structuredClone(PREFERENCIAS_PADRAO));
});
