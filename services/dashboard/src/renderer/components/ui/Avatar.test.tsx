/**
 * Testes do avatar do usuário e da regra de iniciais.
 */

import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Avatar, iniciais } from './Avatar';

describe('iniciais', () => {
  /** Primeira letra do primeiro e do último nome, em maiúsculas. */
  it('usa o primeiro e o último nome', () => {
    expect(iniciais('Ana Silva')).toBe('AS');
    expect(iniciais('maria da silva souza')).toBe('MS');
  });

  /** Nome único gera uma letra; espaços extras são ignorados. */
  it('lida com nome único e espaços extras', () => {
    expect(iniciais('  Ana  ')).toBe('A');
  });

  /** Nome vazio gera texto vazio. */
  it('devolve vazio para nome vazio', () => {
    expect(iniciais('   ')).toBe('');
  });
});

describe('Avatar', () => {
  /** Sem foto, mostra as iniciais e é nomeado pelo nome completo. */
  it('mostra as iniciais nomeadas pelo nome', () => {
    render(<Avatar name="Ana Silva" />);

    const avatar = screen.getByRole('img', { name: 'Ana Silva' });
    expect(avatar).toHaveTextContent('AS');
  });

  /** Com foto, usa a imagem com o nome como texto alternativo. */
  it('usa a foto quando informada', () => {
    render(<Avatar name="Ana Silva" src="foto.png" />);

    expect(screen.getByRole('img', { name: 'Ana Silva' })).toHaveAttribute('src', 'foto.png');
  });
});
