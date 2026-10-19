/**
 * Testes do foco visível nos campos (Fase 5, lote 8).
 *
 * O DESIGN.md pede o anel de foco dourado (3 px, 45%), definido no CSS global
 * para `:focus-visible`. Os campos em pílula não podem apagá-lo com
 * `outline-none` (hoje só mudam a cor da borda, pouco visível); um seletor
 * dentro de uma pílula mostra o anel na pílula inteira.
 * Plano: `.AIs/docs/plans/desktop-frontend-fase-5.md`.
 */

import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Selecao } from '@/components/telemetria/TabelaAmostras';
import { Input } from './Input';
import { Select } from './Select';
import { Textarea } from './Textarea';

describe('foco visível nos campos', () => {
  /** Input, Select e Textarea deixam o anel de foco global aparecer. */
  it('mantém o anel de foco nos campos em pílula', () => {
    render(
      <>
        <Input label="E-mail" />
        <Select label="Terreno" opcoes={[{ valor: 'cidade', rotulo: 'Cidade' }]} />
        <Textarea label="Observações" />
      </>,
    );

    for (const rotulo of ['E-mail', 'Terreno', 'Observações']) {
      expect(screen.getByLabelText(rotulo)).not.toHaveClass('outline-none');
    }
  });

  /** O seletor dentro da pílula acende o anel na pílula. */
  it('mostra o anel na pílula do seletor', () => {
    render(
      <Selecao rotulo="Qualidade" valor="todas" onTrocar={() => {}}>
        <option value="todas">Todas</option>
      </Selecao>,
    );

    expect(screen.getByLabelText('Qualidade').parentElement).toHaveClass('anel-foco-dentro');
  });
});
