/**
 * Testes do repositório de exemplo: conferem os números aprovados nas telas.
 *
 * Os valores esperados vêm da base de exemplo de
 * `.AIs/docs/contexts/Context_09_10_2026.md` e das referências do Stitch.
 * Onde a referência divergia da base, vale o valor calculado (decisão de
 * 13/10/2026); esses casos estão marcados nos testes.
 */

import { describe, expect, it } from 'vitest';
import { formatarEnergia, formatarNumero, formatarPercentual, formatarPotencia, formatarVariacao } from '@/lib/format';
import { criarRepositorioMock } from './repositorioMock';

const repositorio = criarRepositorioMock();

describe('repositório de exemplo: semana (28/09 a 04/10)', () => {
  /** Números aprovados da tela Energia. */
  it('resume a semana com os números aprovados', async () => {
    const semana = await repositorio.obterResumoEnergia('semana');

    expect(semana.inicio).toBe('2026-09-28');
    expect(semana.fim).toBe('2026-10-04');
    expect(formatarEnergia(semana.energiaRecuperadaMwh)).toEqual({ valor: '1,92', unidade: 'Wh' });
    expect(formatarPotencia(semana.potenciaMediaMw)).toEqual({ valor: '186', unidade: 'mW' });
    expect(formatarPercentual(semana.eficienciaPercentual).valor).toBe('53,5');
    expect(formatarNumero(semana.horasMovimento, 1)).toBe('10,3');
    expect(semana.pico).toEqual({ potenciaMw: 412, data: '2026-10-01', horario: '17:42' });
    expect(semana.diasComLacunas).toBe(1);
  });

  /** Energia entregue à bateria e ao celular, e perdas por estágio. */
  it('mostra energia por ponto e perdas da conversão', async () => {
    const semana = await repositorio.obterResumoEnergia('semana');

    expect(formatarEnergia(semana.porPonto?.p2).valor).toBe('1,67');
    expect(formatarEnergia(semana.porPonto?.p3).valor).toBe('1,47');
    expect(formatarEnergia(semana.porPonto?.p4).valor).toBe('1,03');
    expect(formatarNumero(semana.perdas?.regulador, 1)).toBe('12,9');
    expect(formatarNumero(semana.perdas?.bateria, 1)).toBe('12,0');
    expect(formatarNumero(semana.perdas?.celular, 1)).toBe('30,2');
  });

  /** Comparação com a semana anterior. */
  it('compara com a semana anterior', async () => {
    const semana = await repositorio.obterResumoEnergia('semana');

    expect(semana.comparacao?.referencia).toBe('semana-anterior');
    expect(formatarVariacao(semana.comparacao?.variacaoPercentual)).toBe('+8,4%');
  });

  /** Tabela "Resumo por dia": potência média e eficiência de cada dia. */
  it('lista os 7 dias com potência média e eficiência', async () => {
    const dias = await repositorio.obterDias('semana');

    expect(dias.map((d) => d.data)).toEqual([
      '2026-09-28',
      '2026-09-29',
      '2026-09-30',
      '2026-10-01',
      '2026-10-02',
      '2026-10-03',
      '2026-10-04',
    ]);
    expect(dias.map((d) => formatarPotencia(d.potenciaMediaMw).valor)).toEqual([
      '184',
      '162',
      '191',
      '205',
      '178',
      '196',
      '168',
    ]);
    expect(dias.map((d) => formatarPercentual(d.eficienciaPercentual).valor)).toEqual([
      '53,5',
      '53,4',
      '53,9',
      '54,1',
      '53,2',
      '53,3',
      '52,4',
    ]);
    expect(dias.find((d) => d.data === '2026-10-02')?.lacunasPercentual).toBe(4);
  });

  /** Gráfico do Mês: um dia por barra, de 01/10 até hoje (hoje vem da curva). */
  it('lista os dias do mês até hoje', async () => {
    const dias = await repositorio.obterDias('mes');

    expect(dias.map((d) => d.data)).toEqual(['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04', '2026-10-05']);
    expect(dias.map((d) => Math.round(d.energia.p1))).toEqual([390, 267, 353, 168, 292]);
    expect(formatarPercentual(dias[4].eficienciaPercentual).valor).toBe('53,5');
  });
});

describe('repositório de exemplo: hoje (segunda, 05/10)', () => {
  /** Números aprovados da Visão geral. */
  it('resume o dia com os números aprovados', async () => {
    const hoje = await repositorio.obterResumoEnergia('dia');

    expect(hoje.inicio).toBe('2026-10-05');
    expect(formatarEnergia(hoje.energiaRecuperadaMwh)).toEqual({ valor: '292', unidade: 'mWh' });
    expect(formatarNumero(hoje.horasMovimento, 1)).toBe('1,5');
    expect(formatarPotencia(hoje.potenciaMediaMw).valor).toBe('195');
    expect(formatarPercentual(hoje.eficienciaPercentual).valor).toBe('53,5');
    expect(hoje.pico).toEqual({ potenciaMw: 386, data: '2026-10-05', horario: '17:42' });
  });

  /**
   * Comparação com a média diária da semana. O Stitch mostra "+6,6%", mas
   * 292 ÷ (1.920 ÷ 7) dá +6,46%: vale o valor calculado.
   */
  it('compara com a média semanal (valor calculado: +6,5%)', async () => {
    const hoje = await repositorio.obterResumoEnergia('dia');

    expect(hoje.comparacao?.referencia).toBe('media-semanal');
    expect(formatarVariacao(hoje.comparacao?.variacaoPercentual)).toBe('+6,5%');
  });

  /** A curva do dia integra exatamente a energia do resumo. */
  it('tem a curva do dia coerente com o resumo', async () => {
    const curva = await repositorio.obterCurvaDoDia();

    expect(curva.data).toBe('2026-10-05');
    expect(curva.intervaloAquisicaoS).toBe(10);
    expect(curva.pontos.at(-1)?.horario).toBe('18:05');
    expect(curva.pontos.filter((p) => p.recuperadaMw > 0)).toHaveLength(90);
  });

  /** A última hora usa só a curva (P1): sem energia por ponto. */
  it('resume a última hora a partir da curva', async () => {
    const hora = await repositorio.obterResumoEnergia('hora');

    expect(hora.inicio).toBe('2026-10-05');
    expect(hora.porPonto).toBeUndefined();
    expect(hora.energiaRecuperadaMwh).toBeGreaterThan(0);
    expect(hora.energiaRecuperadaMwh).toBeLessThan(292);
    expect(hora.pico?.horario).toBe('17:42');
  });

  /** O mês vai de 01/10 até hoje. */
  it('resume o mês de 01/10 até hoje', async () => {
    const mes = await repositorio.obterResumoEnergia('mes');

    expect(mes.inicio).toBe('2026-10-01');
    expect(mes.fim).toBe('2026-10-05');
    expect(mes.diasComDados).toBe(5);
    expect(mes.energiaRecuperadaMwh).toBeCloseTo(390 + 267 + 353 + 168 + 292);
  });
});

describe('repositório de exemplo: leituras ao vivo e cadastro', () => {
  /** Cadeia de conversão da Visão geral: 212 → 185 → 164 → 115 mW. */
  it('mostra a cadeia de conversão aprovada', async () => {
    const cadeia = await repositorio.obterCadeiaAoVivo();

    expect(cadeia.pontos.map((p) => p.potenciaMw)).toEqual([212, 185, 164, 115]);
    expect(cadeia.pontos.map((p) => formatarPercentual(p.eficienciaEstagioPercentual).valor)).toEqual([
      '–',
      '87,3',
      '88,6',
      '70,1',
    ]);
    for (const ponto of cadeia.pontos) {
      expect(Math.abs(ponto.tensaoV * ponto.correnteMa - ponto.potenciaMw)).toBeLessThan(1);
    }
  });

  /** A potência ao vivo é o último ponto da curva do dia. */
  it('tem a potência ao vivo igual ao último ponto da curva', async () => {
    const [cadeia, curva] = await Promise.all([repositorio.obterCadeiaAoVivo(), repositorio.obterCurvaDoDia()]);

    expect(curva.pontos.at(-1)?.recuperadaMw).toBe(cadeia.pontos[0].potenciaMw);
  });

  /** Bateria da Visão geral e da Energia (2200 mAh, como na Energia). */
  it('mostra a bateria carregando a 68%', async () => {
    const bateria = await repositorio.obterBateria();

    expect(bateria).toMatchObject({ estado: 'carregando', cargaPercentual: 68, capacidadeMah: 2200, tensaoV: 3.92 });
  });

  /** Vibração e piezos da Visão geral. */
  it('mostra a vibração aprovada', async () => {
    const vibracao = await repositorio.obterVibracao();

    expect(vibracao).toMatchObject({
      rmsMs2: 3.2,
      faixa: 'normal',
      piezosAtivos: 6,
      piezosTotal: 8,
      frequenciaDominanteHz: 42.8,
      temperaturaBlocoC: 31.4,
    });
  });

  /** Veículo, dispositivo e usuário do shell. */
  it('mostra veículo, dispositivo e usuário', async () => {
    const [veiculo, dispositivo, usuario] = await Promise.all([
      repositorio.obterVeiculoAtivo(),
      repositorio.obterDispositivo(),
      repositorio.obterUsuarioAtual(),
    ]);

    expect(veiculo).toMatchObject({ fabricante: 'Honda', modelo: 'Civic', ano: 2026, placa: 'ABC1D23' });
    expect(dispositivo).toMatchObject({ id: 'VERS-01', plataforma: 'ESP32', online: true, protocolo: 'MQTT' });
    expect(usuario).toMatchObject({ nome: 'Ana Silva', funcao: 'Administradora' });
  });

  /** O relógio do exemplo é fixo, para o "visto há 3 s" ser estável. */
  it('usa um relógio fixo em 05/10/2026 18:05', () => {
    expect(repositorio.agora().toISOString()).toBe('2026-10-05T21:05:00.000Z');
  });

  /** O relógio pode ser trocado (ex.: testes de "visto há"). */
  it('aceita outro relógio', () => {
    const outro = criarRepositorioMock({ agora: () => new Date('2026-10-05T21:10:00Z') });

    expect(outro.agora().toISOString()).toBe('2026-10-05T21:10:00.000Z');
  });
});
