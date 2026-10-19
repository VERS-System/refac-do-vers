/**
 * Testes do histórico de testes de campo de exemplo (tela Testes).
 *
 * Conferem que os testes da semana saem dos trajetos da base: a energia e as
 * horas de cada dia se repartem entre os seus trajetos sem sobrar nem faltar.
 */

import { describe, expect, it } from 'vitest';
import { SEMANA_EXEMPLO } from './medicoes';
import {
  montarTestesDaSemana,
  TESTE_CANCELADO,
  TESTE_PLANEJADO,
  TESTES_HOJE,
  TRAJETOS_SEMANA,
} from './testes';

const { testes, resumos } = montarTestesDaSemana(SEMANA_EXEMPLO);
const porCodigo = (codigo: string) => testes.find((t) => t.codigo === codigo)!;
const minutos = (inicio: string, fim: string) => (Date.parse(fim) - Date.parse(inicio)) / 60000;

describe('montarTestesDaSemana', () => {
  /** Um teste por trajeto: #008 a #021, sem o cancelado (#014). */
  it('cria um teste por trajeto da semana', () => {
    expect(testes.map((t) => t.codigo)).toEqual(TRAJETOS_SEMANA.map((t) => t.codigo));
    expect(testes[0].codigo).toBe('#008');
    expect(testes.at(-1)?.codigo).toBe('#021');
    expect(testes).toHaveLength(13);
  });

  /** A energia e as horas de cada dia se repartem entre os seus trajetos. */
  it('reparte a energia e as horas de cada dia', () => {
    for (const dia of SEMANA_EXEMPLO) {
      const doDia = testes.filter((t) => t.inicio?.startsWith(dia.data));
      const energia = doDia.reduce((soma, t) => soma + resumos.get(t.id)!.energiaRecuperadaMwh, 0);
      const horas = doDia.reduce((soma, t) => soma + minutos(t.inicio!, t.fim!) / 60, 0);
      expect(energia).toBeCloseTo(dia.energia.p1, 6);
      expect(horas).toBeCloseTo(dia.horasMovimento, 3);
    }
  });

  /** Potência média = energia ÷ horas; o pico do dia fica no trajeto marcado. */
  it('deriva potência média e pico', () => {
    const t016 = porCodigo('#016');
    const resumo = resumos.get(t016.id)!;

    expect(resumo.potenciaMediaMw).toBeCloseTo(
      resumo.energiaRecuperadaMwh / (minutos(t016.inicio!, t016.fim!) / 60),
      6,
    );
    expect(resumo.picoPotenciaMw).toBe(412);
    expect(resumo.amostras).toBe(Math.round(minutos(t016.inicio!, t016.fim!) * 6));
  });

  /** A falha de fixação é no dia das lacunas (02/10) e deixa o resumo parcial. */
  it('registra a falha de 02/10', () => {
    const t017 = porCodigo('#017');

    expect(t017.estado).toBe('falhou');
    expect(t017.inicio?.startsWith('2026-10-02')).toBe(true);
    expect(t017.observacoes).toMatch(/fixação/);
    expect(resumos.get(t017.id)?.qualidade).toBe('parcial');
  });

  /** Resultados variados e os dados informados ao finalizar. */
  it('tem resultados e dados de finalização', () => {
    expect(porCodigo('#010').resultado).toBe('inconclusivo');
    expect(porCodigo('#021').resultado).toBe('insatisfatorio');
    expect(porCodigo('#008').resultado).toBe('satisfatorio');
    for (const teste of testes) {
      expect(teste.velocidadeMediaKmh).toBeGreaterThan(0);
      expect(teste.rotacaoMediaRpm).toBeGreaterThan(0);
      expect(teste.inclinacaoGraus).not.toBeNull();
      expect(teste.inicio).toMatch(/-03:00$/);
    }
  });
});

describe('testes avulsos', () => {
  /** Cancelado antes de iniciar e planejado para depois de agora: sem início. */
  it('têm o cancelado e o planejado sem início', () => {
    expect(TESTE_CANCELADO).toMatchObject({
      codigo: '#014',
      estado: 'cancelado',
      inicio: null,
      fim: null,
    });
    expect(TESTE_PLANEJADO).toMatchObject({ codigo: '#024', estado: 'planejado', inicio: null });
    expect(Date.parse(TESTE_PLANEJADO.criadoEm)).toBeLessThanOrEqual(
      Date.parse('2026-10-05T18:05:00-03:00'),
    );
  });

  /** Os testes de hoje continuam os da Telemetria. */
  it('mantém os testes de hoje', () => {
    expect(TESTES_HOJE.map((t) => [t.codigo, t.estado, t.terreno])).toEqual([
      ['#022', 'concluido', 'rodovia'],
      ['#023', 'em-andamento', 'cidade'],
    ]);
  });
});
