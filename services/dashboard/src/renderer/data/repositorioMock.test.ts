/**
 * Testes do repositório de exemplo: conferem os números aprovados nas telas.
 *
 * Os valores esperados vêm da base de exemplo de
 * `.AIs/docs/contexts/Context_09_10_2026.md` e das referências do Stitch.
 * Onde a referência divergia da base, vale o valor calculado (decisão de
 * 13/10/2026); esses casos estão marcados nos testes.
 */

import { describe, expect, it } from 'vitest';
import {
  formatarEnergia,
  formatarNumero,
  formatarPercentual,
  formatarPotencia,
  formatarVariacao,
} from '@/lib/format';
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

    expect(dias.map((d) => d.data)).toEqual([
      '2026-10-01',
      '2026-10-02',
      '2026-10-03',
      '2026-10-04',
      '2026-10-05',
    ]);
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

describe('repositório de exemplo: tela Energia', () => {
  /** Tabela "Resumo por dia" no período Dia: só a linha de hoje. */
  it('lista o dia de hoje', async () => {
    const dias = await repositorio.obterDias('dia');

    expect(dias.map((d) => d.data)).toEqual(['2026-10-05']);
    expect(formatarEnergia(dias[0].energia.p1)).toEqual({ valor: '292', unidade: 'mWh' });
    expect(formatarPercentual(dias[0].eficienciaPercentual).valor).toBe('53,5');
    expect(dias[0].pico).toEqual({ potenciaMw: 386, horario: '17:42' });
  });

  /** Amostras de vibração × potência de cada período, dentro do intervalo dele. */
  it('filtra as amostras de vibração pelo período', async () => {
    const [hora, dia, semana, mes] = await Promise.all([
      repositorio.obterAmostrasVibracao('hora'),
      repositorio.obterAmostrasVibracao('dia'),
      repositorio.obterAmostrasVibracao('semana'),
      repositorio.obterAmostrasVibracao('mes'),
    ]);

    expect(semana).toHaveLength(28);
    expect(semana.every((a) => a.data >= '2026-09-28' && a.data <= '2026-10-04')).toBe(true);
    expect(dia).toHaveLength(8);
    expect(dia.every((a) => a.data === '2026-10-05')).toBe(true);
    expect(hora.length).toBeGreaterThan(0);
    expect(hora.every((a) => a.data === '2026-10-05' && a.horario >= '17:05')).toBe(true);
    expect(mes).toHaveLength(4 * 4 + 8);
    expect(mes.every((a) => a.data >= '2026-10-01')).toBe(true);
  });

  /** A tensão de hoje termina na leitura atual da bateria (3,92 V a 68%). */
  it('entrega a tensão da bateria ao longo de hoje', async () => {
    const [serie, bateria] = await Promise.all([
      repositorio.obterTensaoBateria(),
      repositorio.obterBateria(),
    ]);

    expect(serie.data).toBe('2026-10-05');
    expect(serie.intervaloMinutos).toBe(5);
    expect(serie.pontos.at(-1)?.horario).toBe('18:05');
    expect(formatarNumero(serie.pontos.at(-1)?.tensaoV, 2)).toBe(
      formatarNumero(bateria.tensaoV, 2),
    );
    expect(serie.pontos.at(-1)?.cargaPercentual).toBeCloseTo(bateria.cargaPercentual, 6);
  });
});

describe('repositório de exemplo: tela Testes', () => {
  /** Histórico completo, do mais recente (planejado agora há pouco) ao mais antigo, em páginas. */
  it('busca os testes em páginas', async () => {
    const pagina = await repositorio.buscarTestes({});

    expect(pagina).toMatchObject({ total: 17, pagina: 1, tamanhoPagina: 20 });
    expect(pagina.itens.map((t) => t.codigo).slice(0, 4)).toEqual(['#024', '#023', '#022', '#021']);
    expect(pagina.itens.at(-1)?.codigo).toBe('#008');

    const segunda = await repositorio.buscarTestes({ pagina: 2, tamanhoPagina: 10 });
    expect(segunda.itens.map((t) => t.codigo)).toEqual([
      '#014',
      '#013',
      '#012',
      '#011',
      '#010',
      '#009',
      '#008',
    ]);
  });

  /** Filtros do contrato: status e início (o da Telemetria: só os de hoje). */
  it('filtra por status e por início', async () => {
    const contagem = async (status: Parameters<typeof repositorio.buscarTestes>[0]['status']) =>
      (await repositorio.buscarTestes({ status, tamanhoPagina: 1 })).total;
    const deHoje = await repositorio.buscarTestes({ inicioDe: '2026-10-05T00:00:00-03:00' });

    expect(await contagem('concluido')).toBe(13);
    expect(await contagem('em-andamento')).toBe(1);
    expect(await contagem('falhou')).toBe(1);
    expect(await contagem('planejado')).toBe(1);
    expect(await contagem('cancelado')).toBe(1);
    expect(deHoje.itens.map((t) => t.codigo)).toEqual(['#023', '#022']);
  });

  /** Resumo só de teste encerrado; o de hoje vem da telemetria. */
  it('entrega o resumo dos testes encerrados', async () => {
    const t016 = await repositorio.obterResumoTeste('teste-016');
    const t022 = await repositorio.obterResumoTeste('teste-022');
    const ultimaDaManha = (
      await repositorio.obterAmostrasTelemetria({ testeId: 'teste-022', tamanhoPagina: 1 })
    ).itens[0];

    expect(t016?.energiaRecuperadaMwh).toBeCloseTo(390 * 0.55, 6);
    expect(t016?.picoPotenciaMw).toBe(412);
    expect(t022?.energiaRecuperadaMwh).toBeCloseTo(ultimaDaManha.energiaAcumuladaMwh!, 6);
    expect(t022?.amostras).toBe(270);
    expect(await repositorio.obterResumoTeste('teste-023')).toBeNull();
    expect(await repositorio.obterResumoTeste('teste-024')).toBeNull();
  });

  /** Comparação de 2 a 5 testes, como o contrato. */
  it('compara de 2 a 5 testes', async () => {
    const comparacao = await repositorio.compararTestes(['teste-016', 'teste-015']);

    expect(comparacao.map((item) => item.testeId)).toEqual(['teste-016', 'teste-015']);
    expect(comparacao[1].resumo?.energiaRecuperadaMwh).toBeCloseTo(390 * 0.45, 6);
    await expect(repositorio.compararTestes(['teste-016'])).rejects.toMatchObject({
      codigo: 'validacao',
    });
    await expect(
      repositorio.compararTestes([
        'teste-008',
        'teste-009',
        'teste-010',
        'teste-011',
        'teste-012',
        'teste-013',
      ]),
    ).rejects.toMatchObject({ codigo: 'validacao' });
  });

  /** Não inicia com outro teste em andamento (conflito). */
  it('recusa iniciar com outro teste em andamento', async () => {
    const proprio = criarRepositorioMock();

    await expect(proprio.iniciarTeste('teste-024')).rejects.toMatchObject({ codigo: 'conflito' });
  });

  /** Finalizar o em andamento e então iniciar o planejado. */
  it('finaliza e inicia testes', async () => {
    const proprio = criarRepositorioMock();

    const finalizado = await proprio.finalizarTeste('teste-023', {
      status: 'concluido',
      resultado: 'satisfatorio',
      velocidadeMediaKmh: 30,
    });
    expect(finalizado).toMatchObject({
      estado: 'concluido',
      resultado: 'satisfatorio',
      velocidadeMediaKmh: 30,
    });
    expect(finalizado.fim).toBe('2026-10-05T18:05:00-03:00');

    const iniciado = await proprio.iniciarTeste('teste-024');
    expect(iniciado).toMatchObject({ estado: 'em-andamento', inicio: '2026-10-05T18:05:00-03:00' });
    expect(
      (await proprio.buscarTestes({ status: 'em-andamento' })).itens.map((t) => t.codigo),
    ).toEqual(['#024']);
  });

  /** Cancelar só planejado ou em andamento; finalizar só em andamento. */
  it('recusa transições inválidas', async () => {
    const proprio = criarRepositorioMock();

    await expect(proprio.cancelarTeste('teste-022', {})).rejects.toMatchObject({
      codigo: 'transicao-invalida',
    });
    await expect(
      proprio.finalizarTeste('teste-024', { status: 'concluido' }),
    ).rejects.toMatchObject({
      codigo: 'transicao-invalida',
    });
    await expect(proprio.iniciarTeste('nao-existe')).rejects.toMatchObject({
      codigo: 'nao-encontrado',
    });

    const cancelado = await proprio.cancelarTeste('teste-024', { motivo: 'Chuva' });
    expect(cancelado).toMatchObject({ estado: 'cancelado', observacoes: 'Chuva' });
  });

  /** Planejar cria o próximo código, com o veículo e a configuração atuais. */
  it('planeja um teste novo', async () => {
    const proprio = criarRepositorioMock();

    await expect(
      proprio.criarTeste({ nome: ' ', terreno: 'rodovia', local: 'SP-280' }),
    ).rejects.toMatchObject({
      codigo: 'validacao',
    });
    const novo = await proprio.criarTeste({
      nome: 'Rodovia · Castelo Branco',
      terreno: 'rodovia',
      local: 'SP-280',
    });

    expect(novo).toMatchObject({
      codigo: '#025',
      estado: 'planejado',
      inicio: null,
      criadoEm: '2026-10-05T18:05:00-03:00',
      modeloVeiculo: 'Honda Civic',
      piezosAtivos: 6,
      versaoConfiguracao: 3,
    });
    expect((await proprio.buscarTestes({})).itens[0].codigo).toBe('#025');
  });

  /** Cada repositório tem o seu estado: mudanças não vazam para outro. */
  it('isola o estado por repositório', async () => {
    const proprio = criarRepositorioMock();
    await proprio.cancelarTeste('teste-024', {});

    expect((await repositorio.buscarTestes({ status: 'planejado' })).total).toBe(1);
  });
});

describe('repositório de exemplo: tela Veículo e instalação', () => {
  /** Dois veículos: o Civic principal e a Strada sem instalação. */
  it('lista os veículos com o principal', async () => {
    const veiculos = await repositorio.obterVeiculos();

    expect(veiculos.map((v) => [v.placa, v.principal, v.relacao])).toEqual([
      ['ABC1D23', true, 'proprietario'],
      ['DEF4G56', false, 'motorista'],
    ]);
    expect((await repositorio.obterVeiculoAtivo()).placa).toBe('ABC1D23');
  });

  /** Trocar o principal desmarca o anterior; editar não mexe na placa. */
  it('troca o principal e edita', async () => {
    const proprio = criarRepositorioMock();
    const [civic, strada] = await proprio.obterVeiculos();

    const novoPrincipal = await proprio.atualizarVeiculo(strada.id, { principal: true });
    expect(novoPrincipal.principal).toBe(true);
    expect((await proprio.obterVeiculoAtivo()).placa).toBe('DEF4G56');
    expect((await proprio.obterVeiculos()).find((v) => v.id === civic.id)?.principal).toBe(false);

    const editado = await proprio.atualizarVeiculo(civic.id, {
      modelo: 'Civic Touring',
      ano: 2025,
    });
    expect(editado).toMatchObject({ placa: 'ABC1D23', modelo: 'Civic Touring', ano: 2025 });
    await expect(proprio.atualizarVeiculo(civic.id, { ano: 1800 })).rejects.toMatchObject({
      codigo: 'validacao',
    });
  });

  /** Placa válida e única; o novo entra como não principal. */
  it('cadastra veículo', async () => {
    const proprio = criarRepositorioMock();

    await expect(proprio.criarVeiculo({ placa: 'abc-1d23' })).rejects.toMatchObject({
      codigo: 'conflito',
    });
    await expect(proprio.criarVeiculo({ placa: 'AB12' })).rejects.toMatchObject({
      codigo: 'validacao',
    });
    const novo = await proprio.criarVeiculo({
      placa: 'ghi2j34',
      fabricante: 'Volkswagen',
      modelo: 'Polo',
      ano: 2023,
    });

    expect(novo).toMatchObject({
      placa: 'GHI2J34',
      principal: false,
      relacao: 'proprietario',
      fabricante: 'Volkswagen',
    });
    expect(await proprio.obterVeiculos()).toHaveLength(3);
  });

  /** Instalação do Civic com o ESP32; a Strada não tem. */
  it('entrega a instalação do veículo', async () => {
    const [civic, strada] = await repositorio.obterVeiculos();
    const instalacao = await repositorio.obterInstalacao(civic.id);

    expect(instalacao).toMatchObject({
      modelo: 'VERS-PZ01',
      status: 'ativa',
      instaladaEm: '2026-09-12',
    });
    expect(instalacao?.dispositivo?.id).toBe('VERS-01');
    expect(await repositorio.obterInstalacao(strada.id)).toBeNull();
  });

  /** Versões da configuração, da ativa (v3) à primeira. */
  it('lista as versões da configuração', async () => {
    const [civic] = await repositorio.obterVeiculos();
    const instalacao = await repositorio.obterInstalacao(civic.id);
    const configuracoes = await repositorio.obterConfiguracoes(instalacao!.id);

    expect(configuracoes.map((c) => c.versao)).toEqual([3, 2, 1]);
    expect(configuracoes[0]).toMatchObject({
      piezosAtivos: 6,
      piezosTotal: 8,
      piezosInativos: [6, 8],
      associacao: 'paralelo',
      armazenamento: 'bateria',
    });
    expect(configuracoes[2].associacao).toBe('serie');
  });

  /** Os testes antes da v3 (02/10) registram a v2 com 8 piezos. */
  it('mantém a configuração de cada teste', async () => {
    const pagina = await repositorio.buscarTestes({ tamanhoPagina: 100 });
    const porCodigo = (codigo: string) => pagina.itens.find((t) => t.codigo === codigo)!;

    expect(porCodigo('#016')).toMatchObject({ versaoConfiguracao: 2, piezosAtivos: 8 });
    expect(porCodigo('#017')).toMatchObject({ versaoConfiguracao: 2, piezosAtivos: 8 });
    expect(porCodigo('#018')).toMatchObject({ versaoConfiguracao: 3, piezosAtivos: 6 });
  });

  /** Revisões da mais recente para a mais antiga, todas depois da instalação. */
  it('lista as revisões', async () => {
    const revisoes = await repositorio.obterRevisoes();

    expect(revisoes.map((r) => r.status)).toEqual(['agendada', 'resolvida', 'resolvida']);
    expect(revisoes[0].motivo).toMatch(/piezo 6/);
    expect(revisoes.every((r) => r.criadaEm >= '2026-09-12')).toBe(true);
  });

  /** Log do ESP32 até agora, do mais recente ao mais antigo. */
  it('entrega o log do dispositivo', async () => {
    const log = await repositorio.obterLogsDispositivo('VERS-01');

    expect(log.length).toBeGreaterThan(5);
    expect(Date.parse(log[0].instante)).toBeLessThanOrEqual(
      Date.parse('2026-10-05T18:05:00-03:00'),
    );
    expect(log.some((linha) => linha.mensagem.includes('#023'))).toBe(true);
    expect(await repositorio.obterLogsDispositivo('outro')).toEqual([]);
  });
});

describe('repositório de exemplo: Configurações', () => {
  /** Perfil com os campos do contrato (e-mail verificado, sem telefone). */
  it('entrega o perfil', async () => {
    const usuario = await repositorio.obterUsuarioAtual();

    expect(usuario).toMatchObject({
      nome: 'Ana Silva',
      email: 'ana.silva@vers.com',
      emailVerificado: true,
      funcao: 'Administradora',
    });
  });

  /** Só nome e foto mudam; nome vazio é recusado. */
  it('atualiza o perfil', async () => {
    const proprio = criarRepositorioMock();

    await expect(proprio.atualizarPerfil({ nome: '  ' })).rejects.toMatchObject({
      codigo: 'validacao',
    });
    const atualizado = await proprio.atualizarPerfil({ nome: 'Ana S. Silva', foto: 'blob:foto' });

    expect(atualizado).toMatchObject({
      nome: 'Ana S. Silva',
      foto: 'blob:foto',
      email: 'ana.silva@vers.com',
    });
    expect((await proprio.obterUsuarioAtual()).nome).toBe('Ana S. Silva');
  });

  /** Encerrar todas as sessões responde sem erro. */
  it('encerra as sessões', async () => {
    await expect(repositorio.encerrarSessoes()).resolves.toBeUndefined();
  });
});

describe('repositório de exemplo: Viber', () => {
  /** Contextos autorizados para a conversa. */
  it('lista os contextos', async () => {
    const contextos = await repositorio.obterContextosViber();

    expect(contextos.map((c) => [c.id, c.rotulo])).toEqual([
      ['hoje', 'Hoje'],
      ['semana', 'Semana'],
      ['teste-023', 'Teste #023'],
    ]);
  });

  /** Conversa atual e três recentes, da mais nova para a mais antiga. */
  it('lista as conversas', async () => {
    const conversas = await repositorio.obterConversasViber();

    expect(conversas).toHaveLength(4);
    expect(conversas[0].atualizadaEm).toBe('2026-10-05T18:03:00-03:00');
    expect(conversas.map((c) => c.titulo)).toContain('Falha de fixação do piezo 7');
    for (let i = 1; i < conversas.length; i++) {
      expect(conversas[i].atualizadaEm < conversas[i - 1].atualizadaEm).toBe(true);
    }
  });

  /** Conversa inicial montada dos dados: domingo abaixo da média e a comparação com a rodovia. */
  it('monta a conversa inicial dos dados', async () => {
    const [atual] = await repositorio.obterConversasViber();
    const mensagens = await repositorio.obterMensagensViber(atual.id);

    expect(mensagens.map((m) => [m.autor, m.tipo])).toEqual([
      ['viber', 'medicao'],
      ['usuario', null],
      ['viber', 'medicao'],
      ['viber', 'inferencia'],
    ]);
    expect(mensagens[0].texto).toContain('168 mWh');
    expect(mensagens[0].texto).toContain('39% abaixo');
    expect(mensagens[2].anexo?.itens.map((i) => i.codigo)).toEqual(['#021', '#022']);
    expect(mensagens[2].referencia).toMatch(/#021 e #022/);
  });

  /** Sugestões respondem com os dados do contexto, e a conversa guarda a troca. */
  it('responde às sugestões', async () => {
    const proprio = criarRepositorioMock();
    const [atual] = await proprio.obterConversasViber();

    const semana = await proprio.enviarMensagemViber({
      conversaId: atual.id,
      texto: 'Resumo da semana',
      contextoId: 'semana',
      sugestao: 'resumo',
    });
    expect(semana.map((m) => m.autor)).toEqual(['usuario', 'viber']);
    expect(semana[1].texto).toContain('1,92 Wh');
    expect(semana[1].texto).toContain('8,4%');
    expect(await proprio.obterMensagensViber(atual.id)).toHaveLength(6);

    const hoje = await proprio.enviarMensagemViber({
      conversaId: atual.id,
      texto: 'Resumo de hoje',
      contextoId: 'hoje',
      sugestao: 'resumo',
    });
    expect(hoje[1].texto).toContain('292 mWh');

    const eficiencia = await proprio.enviarMensagemViber({
      conversaId: atual.id,
      texto: 'Por que a eficiência caiu?',
      contextoId: 'semana',
      sugestao: 'eficiencia',
    });
    expect(eficiencia.slice(1).map((m) => m.tipo)).toEqual(['medicao', 'inferencia']);
    expect(eficiencia[1].texto).toContain('52,4%');

    const revisao = await proprio.enviarMensagemViber({
      conversaId: atual.id,
      texto: 'Quando revisar os piezos?',
      contextoId: 'semana',
      sugestao: 'revisao',
    });
    expect(revisao[1].tipo).toBe('recomendacao');
    expect(revisao[1].texto).toContain('piezo 6');
  });

  /** Pergunta livre: indisponível sem o backend da Viber. */
  it('recusa perguntas livres', async () => {
    const [atual] = await repositorio.obterConversasViber();

    await expect(
      repositorio.enviarMensagemViber({
        conversaId: atual.id,
        texto: 'Qual foi o pico?',
        contextoId: 'semana',
      }),
    ).rejects.toMatchObject({ codigo: 'indisponivel' });
  });

  /** Nova conversa vazia, no topo da lista. */
  it('cria uma conversa nova', async () => {
    const proprio = criarRepositorioMock();
    const nova = await proprio.criarConversaViber();

    expect(nova.titulo).toBe('Nova conversa');
    expect((await proprio.obterConversasViber())[0].id).toBe(nova.id);
    expect(await proprio.obterMensagensViber(nova.id)).toEqual([]);
  });
});

describe('repositório de exemplo: tela Telemetria', () => {
  /** Primeira página do teste em andamento: as 20 mais recentes, da mais nova para a mais antiga. */
  it('pagina as amostras do teste, das mais recentes', async () => {
    const tarde = { id: 'teste-023' };
    const pagina = await repositorio.obterAmostrasTelemetria({ testeId: tarde.id });

    expect(pagina).toMatchObject({ total: 265, pagina: 1, tamanhoPagina: 20 });
    expect(pagina.itens).toHaveLength(20);
    expect(pagina.itens[0].capturadaEm.slice(11, 19)).toBe('18:05:00');
    expect(pagina.itens[1].capturadaEm.slice(11, 19)).toBe('18:04:50');
    expect(pagina.itens.every((a) => a.testeId === tarde.id)).toBe(true);
  });

  /** Páginas seguintes e a última, parcial. */
  it('entrega as páginas seguintes', async () => {
    const tarde = { id: 'teste-023' };
    const segunda = await repositorio.obterAmostrasTelemetria({ testeId: tarde.id, pagina: 2 });
    const ultima = await repositorio.obterAmostrasTelemetria({ testeId: tarde.id, pagina: 14 });

    expect(segunda.itens[0].capturadaEm.slice(11, 19)).toBe('18:01:40');
    expect(ultima.itens).toHaveLength(5);
    expect(ultima.itens.at(-1)?.capturadaEm.slice(11, 19)).toBe('17:21:00');
  });

  /** Como o backend: tamanho de página entre 1 e 100. */
  it('limita o tamanho da página a 100', async () => {
    const tarde = { id: 'teste-023' };
    const pagina = await repositorio.obterAmostrasTelemetria({
      testeId: tarde.id,
      tamanhoPagina: 500,
    });

    expect(pagina.tamanhoPagina).toBe(100);
    expect(pagina.itens).toHaveLength(100);
  });

  /** Filtros de qualidade e de intervalo de captura. */
  it('filtra por qualidade e por intervalo', async () => {
    const tarde = { id: 'teste-023' };
    const suspeitas = await repositorio.obterAmostrasTelemetria({
      testeId: tarde.id,
      qualidade: 'suspeita',
      tamanhoPagina: 100,
    });
    const ultimosDezMinutos = await repositorio.obterAmostrasTelemetria({
      testeId: tarde.id,
      de: '2026-10-05T17:55:00-03:00',
      tamanhoPagina: 100,
    });

    expect(suspeitas.total).toBeGreaterThan(0);
    expect(suspeitas.itens.every((a) => a.qualidade === 'suspeita')).toBe(true);
    expect(ultimosDezMinutos.total).toBe(61);
  });

  /** Teste desconhecido: nenhuma amostra (sem revelar se o teste existe). */
  it('devolve vazio para teste desconhecido', async () => {
    const pagina = await repositorio.obterAmostrasTelemetria({ testeId: 'nao-existe' });

    expect(pagina).toMatchObject({ total: 0, itens: [] });
  });
});

describe('repositório de exemplo: leituras ao vivo e cadastro', () => {
  /** Cadeia de conversão da Visão geral: 212 → 185 → 164 → 115 mW. */
  it('mostra a cadeia de conversão aprovada', async () => {
    const cadeia = await repositorio.obterCadeiaAoVivo();

    expect(cadeia.pontos.map((p) => p.potenciaMw)).toEqual([212, 185, 164, 115]);
    expect(
      cadeia.pontos.map((p) => formatarPercentual(p.eficienciaEstagioPercentual).valor),
    ).toEqual(['–', '87,3', '88,6', '70,1']);
    for (const ponto of cadeia.pontos) {
      expect(Math.abs(ponto.tensaoV * ponto.correnteMa - ponto.potenciaMw)).toBeLessThan(1);
    }
  });

  /** A potência ao vivo é o último ponto da curva do dia. */
  it('tem a potência ao vivo igual ao último ponto da curva', async () => {
    const [cadeia, curva] = await Promise.all([
      repositorio.obterCadeiaAoVivo(),
      repositorio.obterCurvaDoDia(),
    ]);

    expect(curva.pontos.at(-1)?.recuperadaMw).toBe(cadeia.pontos[0].potenciaMw);
  });

  /** Bateria da Visão geral e da Energia (2200 mAh, como na Energia). */
  it('mostra a bateria carregando a 68%', async () => {
    const bateria = await repositorio.obterBateria();

    expect(bateria).toMatchObject({
      estado: 'carregando',
      cargaPercentual: 68,
      capacidadeMah: 2200,
      tensaoV: 3.92,
    });
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

    expect(veiculo).toMatchObject({
      fabricante: 'Honda',
      modelo: 'Civic',
      ano: 2026,
      placa: 'ABC1D23',
    });
    expect(dispositivo).toMatchObject({
      id: 'VERS-01',
      plataforma: 'ESP32',
      online: true,
      protocolo: 'MQTT',
    });
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

describe('criarRepositorioMock — autenticação', () => {
  /** Entrar valida como o LoginDto e devolve o perfil. */
  it('entra com credenciais válidas', async () => {
    const repositorio = criarRepositorioMock({ latenciaMs: 0 });

    await expect(repositorio.entrar({ email: 'ana', senha: 'x' })).rejects.toMatchObject({
      codigo: 'validacao',
    });
    await expect(
      repositorio.entrar({ email: 'ana.silva@vers.com', senha: '' }),
    ).rejects.toMatchObject({ codigo: 'validacao' });
    await expect(
      repositorio.entrar({ email: ' ana.silva@vers.com ', senha: 'Segredo!1' }),
    ).resolves.toMatchObject({ email: 'ana.silva@vers.com' });
  });

  /** Registrar valida como o RegisterDto e não revela se o e-mail já existe. */
  it('registra a conta pendente', async () => {
    const repositorio = criarRepositorioMock({ latenciaMs: 0 });

    await expect(
      repositorio.registrar({ email: 'novo@vers.com', senha: 'semregra' }),
    ).rejects.toMatchObject({ codigo: 'validacao' });
    await expect(
      repositorio.registrar({ email: 'novo@vers.com', senha: 'Segredo!1', nome: 'Novo' }),
    ).resolves.toBeUndefined();
    await expect(
      repositorio.registrar({ email: 'ana.silva@vers.com', senha: 'Segredo!1' }),
    ).resolves.toBeUndefined();
  });
});

describe('repositório de exemplo: tela Veículos', () => {
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

  /** O ID vem do sistema (UUID) e o chassi é opcional, validado e único. */
  it('cadastra com ID gerado e chassi', async () => {
    const proprio = criarRepositorioMock();
    for (const veiculo of await proprio.obterVeiculos()) expect(veiculo.id).toMatch(UUID);

    const novo = await proprio.criarVeiculo({ placa: 'GHI2J34', chassi: '9bwzzz377vt004251' });
    expect(novo.id).toMatch(UUID);
    expect(novo.chassi).toBe('9BWZZZ377VT004251');
    expect((await proprio.criarVeiculo({ placa: 'JKL3M45' })).chassi).toBeNull();

    await expect(
      proprio.criarVeiculo({ placa: 'MNO4P56', chassi: '9BWZZZ377VT004251' }),
    ).rejects.toMatchObject({ codigo: 'conflito' });
    await expect(proprio.criarVeiculo({ placa: 'MNO4P56', chassi: 'curto' })).rejects.toMatchObject(
      { codigo: 'validacao' },
    );
  });

  /** O chassi pode ser informado uma vez; depois não muda. */
  it('preenche o chassi uma vez', async () => {
    const proprio = criarRepositorioMock();
    const [, strada] = await proprio.obterVeiculos();

    const editado = await proprio.atualizarVeiculo(strada.id, { chassi: '9bd17164g55123456' });
    expect(editado.chassi).toBe('9BD17164G55123456');
    await expect(
      proprio.atualizarVeiculo(strada.id, { chassi: '9BWZZZ377VT004251' }),
    ).rejects.toMatchObject({ codigo: 'validacao' });
  });

  /** Remover segue o backend: substituto quando o principal sai e sobram dois ou mais. */
  it('remove com substituição do principal', async () => {
    const proprio = criarRepositorioMock();
    const [civic, strada] = await proprio.obterVeiculos();
    const polo = await proprio.criarVeiculo({ placa: 'GHI2J34' });
    await proprio.atualizarVeiculo(polo.id, { principal: true });

    await expect(proprio.removerVeiculo(polo.id)).rejects.toMatchObject({ codigo: 'validacao' });
    await expect(proprio.removerVeiculo(polo.id, polo.id)).rejects.toMatchObject({
      codigo: 'validacao',
    });
    await proprio.removerVeiculo(polo.id, strada.id);

    const restantes = await proprio.obterVeiculos();
    expect(restantes.map((v) => [v.placa, v.principal])).toEqual([
      ['ABC1D23', false],
      ['DEF4G56', true],
    ]);
    await expect(proprio.removerVeiculo(polo.id)).rejects.toMatchObject({
      codigo: 'nao-encontrado',
    });
    expect(civic.id).not.toBe(strada.id);
  });

  /** Sobrando um só, ele vira principal; carro com instalação não sai no exemplo. */
  it('promove o último e protege a instalação', async () => {
    const proprio = criarRepositorioMock();
    const [civic, strada] = await proprio.obterVeiculos();

    await expect(proprio.removerVeiculo(civic.id)).rejects.toMatchObject({
      codigo: 'indisponivel',
    });
    await proprio.atualizarVeiculo(strada.id, { principal: true });
    const polo = await proprio.criarVeiculo({ placa: 'GHI2J34' });
    await proprio.atualizarVeiculo(polo.id, { principal: true });
    await proprio.removerVeiculo(strada.id);
    await proprio.removerVeiculo(polo.id);

    expect((await proprio.obterVeiculos()).map((v) => [v.placa, v.principal])).toEqual([
      ['ABC1D23', true],
    ]);
  });
});
