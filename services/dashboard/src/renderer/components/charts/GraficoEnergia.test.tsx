/**
 * Testes do gráfico de energia da Visão geral (curva do dia/hora ou barras
 * por dia da semana/mês).
 *
 * O desenho é do Recharts; os testes conferem o resumo acessível (que é o
 * que um leitor de tela anuncia), os rótulos e o estado vazio.
 */

import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { PontoCurva, ResumoDia } from '@/data/tipos';
import { descreverBarras, descreverCurva, GraficoEnergia } from './GraficoEnergia';

const CURVA: PontoCurva[] = [
  { horario: '17:40', recuperadaMw: 300, consumoNoMw: 50 },
  { horario: '17:41', recuperadaMw: 360, consumoNoMw: 50 },
  { horario: '17:42', recuperadaMw: 386, consumoNoMw: 50 },
  { horario: '17:43', recuperadaMw: 250, consumoNoMw: 50 },
];
const PICO = { potenciaMw: 386, horario: '17:42' };

/** Cria um dia resumido só com o que o gráfico usa. */
function dia(data: string, p1: number): ResumoDia {
  return {
    data,
    horasMovimento: 1,
    pico: { potenciaMw: 300 },
    energia: { p1, p2: 0, p3: 0, p4: 0 },
    lacunasPercentual: 0,
    potenciaMediaMw: p1,
    eficienciaPercentual: null,
  };
}
const DIAS = [dia('2026-09-28', 258), dia('2026-09-29', 178), dia('2026-10-01', 390)];

describe('descreverCurva', () => {
  /** Intervalo da curva e pico, em pt-BR. */
  it('resume intervalo e pico', () => {
    expect(descreverCurva(CURVA, PICO)).toBe(
      'Potência recuperada de 17:40 a 17:43, pico de 386 mW às 17:42.',
    );
  });

  /** Sem pico conhecido, só o intervalo. */
  it('omite o pico ausente', () => {
    expect(descreverCurva(CURVA, null)).toBe('Potência recuperada de 17:40 a 17:43.');
  });
});

describe('descreverBarras', () => {
  /** Intervalo de datas e o dia de maior energia. */
  it('resume intervalo e maior valor', () => {
    expect(descreverBarras(DIAS)).toBe(
      'Energia recuperada por dia de 28/09 a 01/10, maior valor 390 mWh em 01/10.',
    );
  });
});

describe('GraficoEnergia', () => {
  /** A curva é uma imagem nomeada pelo resumo e marca o pico. */
  it('desenha a curva com resumo acessível e rótulo do pico', () => {
    const { container } = render(
      <GraficoEnergia tipo="curva" pontos={CURVA} escala="janela" pico={PICO} />,
    );

    expect(screen.getByRole('img', { name: descreverCurva(CURVA, PICO) })).toBeInTheDocument();
    expect(container.querySelector('.recharts-surface')).toBeInTheDocument();
    expect(container).toHaveTextContent('Pico 386 mW · 17:42');
  });

  /** As barras da semana usam o dia da semana no eixo. */
  it('desenha as barras com resumo acessível', () => {
    const { container } = render(
      <GraficoEnergia tipo="barras" dias={DIAS} rotulo="dia-da-semana" />,
    );

    expect(screen.getByRole('img', { name: descreverBarras(DIAS) })).toBeInTheDocument();
    expect(container).toHaveTextContent('Seg');
    expect(container).toHaveTextContent('Qui');
  });

  /** As barras do mês usam a data no eixo. */
  it('usa a data no eixo do mês', () => {
    const { container } = render(<GraficoEnergia tipo="barras" dias={DIAS} rotulo="data" />);

    expect(container).toHaveTextContent('28/09');
  });

  /** Na Energia, as barras mostram também o entregue à bateria, a média e os valores. */
  it('desenha a série da bateria, a média e os valores', () => {
    const { container } = render(
      <GraficoEnergia
        tipo="barras"
        dias={DIAS}
        rotulo="dia-da-semana"
        serieBateria
        media
        valores
      />,
    );

    expect(container.querySelectorAll('.recharts-bar')).toHaveLength(2);
    expect(container).toHaveTextContent('Média 275 mWh');
    expect(container).toHaveTextContent('390');
  });

  /** Sem dados, mostra o estado vazio em vez do gráfico. */
  it('mostra o estado vazio', () => {
    render(<GraficoEnergia tipo="curva" pontos={[]} escala="dia" pico={null} />);

    expect(screen.getByText('Sem medições neste período.')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
});
