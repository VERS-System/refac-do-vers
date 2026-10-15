/**
 * Testes do gráfico de dispersão (potência × vibração da tela Energia).
 */

import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GraficoDispersao } from './GraficoDispersao';

const PONTOS = [
  { x: 1, y: 70 },
  { x: 2.5, y: 160 },
  { x: 4, y: 270 },
];

describe('GraficoDispersao', () => {
  /** O desenho é uma imagem nomeada pela descrição recebida, com a reta de tendência. */
  it('desenha os pontos com descrição acessível e tendência', () => {
    const { container } = render(
      <GraficoDispersao
        pontos={PONTOS}
        descricao="Potência por vibração RMS em 3 amostras"
        rotuloX="Vibração RMS (m/s²)"
        rotuloY="Potência (mW)"
        tendencia={{ inclinacao: 66, intercepto: 4 }}
      />,
    );

    expect(
      screen.getByRole('img', { name: 'Potência por vibração RMS em 3 amostras' }),
    ).toBeInTheDocument();
    expect(container.querySelectorAll('.recharts-scatter-symbol')).toHaveLength(3);
    expect(container.querySelector('[data-slot="tendencia"]')).toBeInTheDocument();
    expect(container).toHaveTextContent('Vibração RMS (m/s²)');
  });

  /** Sem tendência, só os pontos. */
  it('funciona sem reta de tendência', () => {
    const { container } = render(
      <GraficoDispersao
        pontos={PONTOS}
        descricao="Dispersão"
        rotuloX="x"
        rotuloY="y"
        tendencia={null}
      />,
    );

    expect(container.querySelector('[data-slot="tendencia"]')).toBeNull();
  });

  /** Com menos de dois pontos não há dispersão a mostrar. */
  it('mostra o estado vazio', () => {
    render(
      <GraficoDispersao
        pontos={[{ x: 1, y: 2 }]}
        descricao="Dispersão"
        rotuloX="x"
        rotuloY="y"
        tendencia={null}
      />,
    );

    expect(screen.getByText('Sem amostras neste período.')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
});
