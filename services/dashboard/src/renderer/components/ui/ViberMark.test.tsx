/**
 * Testes da marca da Viber IA ("Vi" em quatro polígonos).
 */

import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ViberMark } from './ViberMark';

describe('ViberMark', () => {
  /** Por padrão é uma imagem nomeada "Viber". */
  it('é uma imagem nomeada Viber', () => {
    render(<ViberMark />);

    expect(screen.getByRole('img', { name: 'Viber' })).toBeInTheDocument();
  });

  /** Desenha os quatro polígonos usando a cor do texto, para herdar o tom do contexto. */
  it('desenha quatro polígonos com currentColor', () => {
    const { container } = render(<ViberMark />);

    const poligonos = container.querySelectorAll('polygon');
    expect(poligonos).toHaveLength(4);
    poligonos.forEach((p) => expect(p).toHaveAttribute('fill', 'currentColor'));
  });

  /** Ao lado de um texto que já nomeia a Viber, fica escondida dos leitores de tela. */
  it('fica oculta quando decorativa', () => {
    const { container } = render(<ViberMark decorative />);

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  /** A largura segue a proporção 108 x 84 a partir da altura. */
  it('calcula a largura pela proporção', () => {
    const { container } = render(<ViberMark size={21} />);

    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('height', '21');
    expect(svg).toHaveAttribute('width', '27');
  });
});
