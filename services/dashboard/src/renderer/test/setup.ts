/**
 * Preparação comum dos testes unitários do renderer.
 *
 * Registra os matchers do Testing Library (por exemplo `toBeInTheDocument`)
 * no Vitest e desmonta os componentes renderizados ao fim de cada teste, para
 * que um teste não interfira no próximo.
 */

import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
});
