/** Confere janelas civis em Brasília e soma somente resumos horários oficiais não sobrepostos. */
import { describe, expect, it, vi } from 'vitest';
import { energySummaryFixture } from '@vers/shared-types';
import type { EnergySummary } from '@vers/shared-types';
import { janelaEnergia, carregarEnergia, csvEnergia } from './energia';

const id = energySummaryFixture.installationId!;
const agora = new Date('2026-10-20T15:37:00.000Z');

/** Monta um bloco oficial sintético, sem calcular energia a partir de telemetria. */
function bloco(inicio: string, extra: Partial<EnergySummary> = {}): EnergySummary {
  return { ...energySummaryFixture, id: inicio, installationId: id, testId: null, periodType: 'HOUR',
    periodStart: inicio, periodEnd: new Date(Date.parse(inicio) + 3600000).toISOString(), ...extra };
}

/** Retorna a página esperada pela API, incluindo total estável. */
function pagina(data: EnergySummary[], total = data.length, page = 1) {
  return { ok: true as const, data, meta: { page, pageSize: 100, totalItems: total, totalPages: Math.ceil(total / 100) } };
}

describe('janelas de energia', () => {
  it.each([
    ['hora', '2026-10-20T14:00:00.000Z', '2026-10-20T15:00:00.000Z', 1],
    ['dia', '2026-10-20T03:00:00.000Z', '2026-10-20T15:00:00.000Z', 12],
    ['semana', '2026-10-12T03:00:00.000Z', '2026-10-19T03:00:00.000Z', 168],
    ['mes', '2026-10-01T03:00:00.000Z', '2026-10-20T15:00:00.000Z', 468],
  ] as const)('resolve %s sem incluir a hora em curso', (periodo, inicio, fim, horas) => {
    expect(janelaEnergia(periodo, agora)).toMatchObject({ inicio, fim, horas });
  });

  it('domingo ainda aponta para a semana anterior completa e segunda avança a janela', () => {
    expect(janelaEnergia('semana', new Date('2026-10-19T02:59:59.999Z')).inicio).toBe('2026-10-05T03:00:00.000Z');
    expect(janelaEnergia('semana', new Date('2026-10-19T03:00:00.000Z')).inicio).toBe('2026-10-12T03:00:00.000Z');
  });

  it('usa o dia e mês de Brasília na virada UTC e mantém mês bissexto', () => {
    expect(janelaEnergia('dia', new Date('2026-01-01T01:30:00Z'))).toMatchObject({ inicio: '2025-12-31T03:00:00.000Z', horas: 22 });
    expect(janelaEnergia('mes', new Date('2024-03-01T02:59:00Z'))).toMatchObject({ inicio: '2024-02-01T03:00:00.000Z', horas: 695 });
  });

  it('aceita dia sem hora completa e respeita a transição histórica de horário de verão', () => {
    expect(janelaEnergia('dia', new Date('2026-10-20T03:30:00Z')).horas).toBe(0);
    expect(janelaEnergia('dia', new Date('2018-11-04T12:20:00Z'))).toMatchObject({ inicio: '2018-11-04T03:00:00.000Z', horas: 9 });
    expect(() => janelaEnergia('dia', new Date('inválida'))).toThrow();
  });
});

describe('resumos de instalação', () => {
  it('distingue zero, parcial, inválido e ausente, sem média de médias', async () => {
    const janela = janelaEnergia('dia', agora);
    const data = [bloco('2026-10-20T03:00:00.000Z', { recoveredEnergyWh: 0, quality: 'GOOD', sampleCount: 3 }),
      bloco('2026-10-20T04:00:00.000Z', { recoveredEnergyWh: 0.2, quality: 'PARTIAL' }),
      bloco('2026-10-20T05:00:00.000Z', { recoveredEnergyWh: 100, quality: 'INVALID' })];
    const r = await carregarEnergia(id, janela, vi.fn().mockResolvedValue(pagina(data)));
    expect(r.energiaWh).toBeCloseTo(0.2);
    expect(r).toMatchObject({ boas: 1, parciais: 1, invalidas: 1, ausentes: 9 });
    expect(r.linhas).toHaveLength(12);
    expect(r.linhas[3].resumo).toBeNull();
    expect(r).not.toHaveProperty('potenciaMediaW');
    const csv = csvEnergia(r);
    expect(csv).toContain('America/Sao_Paulo');
    expect(csv).toContain('Ausente'); expect(csv).toContain('Inválida');
    expect(csv.trimEnd().split('\r\n')).toHaveLength(13);
  });

  it('não inventa energia zero quando não há bloco utilizável', async () => {
    const janela = janelaEnergia('hora', agora);
    const r = await carregarEnergia(id, janela, vi.fn().mockResolvedValue(pagina([])));
    expect(r.energiaWh).toBeNull(); expect(r.ausentes).toBe(1);
    const ler = vi.fn();
    expect((await carregarEnergia(id, janelaEnergia('dia', new Date('2026-10-20T03:10:00Z')), ler)).linhas).toEqual([]);
    expect(ler).not.toHaveBeenCalled();
  });

  it('percorre todas as páginas do mês e recusa total alterado ou página truncada', async () => {
    const janela = janelaEnergia('mes', agora);
    const data = Array.from({ length: 101 }, (_, i) => bloco(new Date(Date.parse(janela.inicio) + i * 3600000).toISOString()));
    const ler = vi.fn().mockResolvedValueOnce(pagina(data.slice(0, 100), 101)).mockResolvedValueOnce(pagina(data.slice(100), 101, 2));
    expect((await carregarEnergia(id, janela, ler)).boas).toBe(101);
    expect(ler.mock.calls.map(([p]) => p)).toEqual([1, 2]);
    for (const final of [pagina([], 101, 2), pagina(data.slice(100), 102, 2)]) {
      const incompleta = vi.fn().mockResolvedValueOnce(pagina(data.slice(0, 100), 101)).mockResolvedValueOnce(final);
      await expect(carregarEnergia(id, janela, incompleta)).rejects.toThrow();
    }
  });

  it.each(['duplicado', 'sobreposto', 'outro-id', 'teste', 'periodo', 'fora', 'nan', 'sem-amostras'])('recusa bloco inconsistente: %s', async falha => {
    const janela = janelaEnergia('dia', agora);
    const a = bloco(janela.inicio);
    const b = bloco('2026-10-20T04:00:00.000Z');
    if (falha === 'duplicado') b.id = a.id;
    if (falha === 'sobreposto') b.periodStart = a.periodStart;
    if (falha === 'outro-id') b.installationId = 'outra-instalação';
    if (falha === 'teste') b.testId = energySummaryFixture.testId;
    if (falha === 'periodo') b.periodType = 'DAY';
    if (falha === 'fora') b.periodEnd = '2026-10-20T16:00:00.000Z';
    if (falha === 'nan') b.recoveredEnergyWh = Number.NaN;
    if (falha === 'sem-amostras') b.sampleCount = 0;
    await expect(carregarEnergia(id, janela, vi.fn().mockResolvedValue(pagina([a, b])))).rejects.toThrow();
  });
});
