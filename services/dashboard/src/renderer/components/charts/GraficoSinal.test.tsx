/**
 * Testes do gráfico "Sinal em tempo real" da Telemetria (potência, tensão e
 * vibração das últimas amostras).
 */

import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { AmostraTelemetria } from '@/data/tipos';
import { descreverSinal, GraficoSinal } from './GraficoSinal';

/** Amostra válida no horário dado, com potência p. */
function amostra(
  horario: string,
  p: number,
  extra: Partial<AmostraTelemetria> = {},
): AmostraTelemetria {
  return {
    id: horario,
    testeId: 't',
    capturadaEm: `2026-10-05T${horario}.400-03:00`,
    tensaoV: 1.6 + 0.0152 * p,
    correnteMa: p / (1.6 + 0.0152 * p),
    potenciaMw: p,
    energiaAcumuladaMwh: 1,
    vibracaoRmsMs2: p / 66,
    temperaturaC: 31,
    piezosAtivos: 6,
    piezosTotal: 8,
    qualidade: 'valida',
    ...extra,
  };
}

/** Da mais recente para a mais antiga, como vem do repositório. */
const AMOSTRAS = [
  amostra('18:05:00', 212, { vibracaoRmsMs2: 3.2 }),
  amostra('18:04:50', 150),
  amostra('18:04:40', 300),
];
const TODAS = { potencia: true, tensao: true, vibracao: true };

describe('descreverSinal', () => {
  /** Intervalo, faixa de potência e a última leitura. */
  it('resume o sinal', () => {
    expect(descreverSinal(AMOSTRAS)).toBe(
      'Sinal de 18:04:40 a 18:05:00: potência de 150 a 300 mW; última leitura 212 mW · 4,82 V · 3,2 m/s².',
    );
  });
});

describe('GraficoSinal', () => {
  /** Imagem nomeada pelo resumo, com uma série por grandeza ligada. */
  it('desenha as três séries', () => {
    const { container } = render(<GraficoSinal amostras={AMOSTRAS} series={TODAS} />);

    expect(screen.getByRole('img', { name: descreverSinal(AMOSTRAS) })).toBeInTheDocument();
    expect(container.querySelectorAll('.recharts-area')).toHaveLength(1);
    expect(container.querySelectorAll('.recharts-line')).toHaveLength(2);
    expect(container).toHaveTextContent('Agora');
  });

  /** Séries desligadas não são desenhadas. */
  it('esconde as séries desligadas', () => {
    const { container } = render(
      <GraficoSinal
        amostras={AMOSTRAS}
        series={{ potencia: true, tensao: false, vibracao: false }}
      />,
    );

    expect(container.querySelectorAll('.recharts-area')).toHaveLength(1);
    expect(container.querySelectorAll('.recharts-line')).toHaveLength(0);
  });

  /** Com menos de duas amostras, o estado vazio. */
  it('mostra o estado vazio', () => {
    render(<GraficoSinal amostras={[AMOSTRAS[0]]} series={TODAS} />);

    expect(screen.getByText('Sem amostras nos últimos 10 minutos.')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
});
