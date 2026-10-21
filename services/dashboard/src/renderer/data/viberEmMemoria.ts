/**
 * Conversas com o Viber em memória, para o repositório de exemplo.
 *
 * Faz o papel do ai-service enquanto ele não existe (task D11): guarda as
 * conversas e responde às sugestões com textos montados a partir dos dados
 * calculados, sempre com a fonte e com a natureza da resposta (medição,
 * explicação, inferência ou recomendação, como no mobile). Perguntas livres
 * são recusadas com `indisponivel`: sem o backend da Viber, não há como
 * respondê-las sem inventar.
 */

import { formatarIsoComFuso } from './calculos';
import { ErroRepositorio } from './erros';
import type {
  AmostraTelemetria,
  Configuracao,
  ContextoViber,
  ConversaViber,
  EnvioViber,
  MensagemViber,
  ResumoDia,
  ResumoEnergia,
  ResumoTeste,
  Revisao,
  TesteCampo,
  TipoResposta,
} from './tipos';
import type { Periodo } from '@/stores/periodo';
import {
  formatarDataCurta,
  formatarDiaSemanaCurto,
  formatarEnergia,
  formatarMedida,
  formatarNumero,
  formatarPercentual,
  formatarPotencia,
} from '@/lib/format';

/** Fuso de Brasília em minutos, para os horários das mensagens novas. */
const FUSO_MINUTOS = -180;

/** Dia da semana por extenso a partir da abreviação ("Dom" → "domingo"). */
const DIA_POR_EXTENSO: Record<string, string> = {
  Seg: 'segunda',
  Ter: 'terça',
  Qua: 'quarta',
  Qui: 'quinta',
  Sex: 'sexta',
  Sáb: 'sábado',
  Dom: 'domingo',
};

/** Dados que o Viber de exemplo pode consultar (só leitura). */
export interface FontesViber {
  agora: () => Date;
  primeiroNome: string;
  resumo: (periodo: Periodo) => ResumoEnergia;
  diasDaSemana: () => ResumoDia[];
  teste: (codigo: string) => TesteCampo | undefined;
  testeEmAndamento: () => TesteCampo | undefined;
  resumoTeste: (testeId: string) => ResumoTeste | null;
  amostrasDoTeste: (testeId: string) => AmostraTelemetria[];
  revisoes: readonly Revisao[];
  configuracoes: readonly Configuracao[];
}

/** "domingo (04/10)" a partir de uma data ISO. */
function diaEData(data: string): string {
  return `${DIA_POR_EXTENSO[formatarDiaSemanaCurto(data)] ?? formatarDiaSemanaCurto(data)} (${formatarDataCurta(data)})`;
}

/** "1,92 Wh" ou "292 mWh". */
const energia = (mWh: number) => formatarMedida(formatarEnergia(mWh));

/** "186 mW". */
const potencia = (mW: number | null) => formatarMedida(formatarPotencia(mW));

/** "8,4% acima" ou "39% abaixo" de uma variação percentual. */
function acimaOuAbaixo(variacao: number, casas = 1): string {
  return `${formatarNumero(Math.abs(variacao), casas)}% ${variacao >= 0 ? 'acima' : 'abaixo'}`;
}

/**
 * Cria o estado das conversas, com a conversa atual e três recentes
 * montadas a partir dos dados.
 */
export function criarViberEmMemoria(fontes: FontesViber) {
  const conversas: ConversaViber[] = [];
  const mensagens = new Map<string, MensagemViber[]>();
  let sequencia = 0;

  /** Cria uma mensagem com id sequencial. */
  function mensagem(
    conversaId: string,
    autor: MensagemViber['autor'],
    texto: string,
    enviadaEm: string,
    extra: { tipo?: TipoResposta; referencia?: string; anexo?: MensagemViber['anexo'] } = {},
  ): MensagemViber {
    sequencia += 1;
    return {
      id: `mensagem-${sequencia}`,
      conversaId,
      autor,
      texto,
      tipo: extra.tipo ?? null,
      referencia: extra.referencia ?? null,
      enviadaEm,
      anexo: extra.anexo ?? null,
    };
  }

  /** Guarda uma conversa pronta. */
  function registrar(conversa: ConversaViber, lista: MensagemViber[]) {
    conversas.push(conversa);
    mensagens.set(conversa.id, lista);
  }

  // Conversa atual: domingo abaixo da média e a comparação com a rodovia de hoje.
  const semana = fontes.resumo('semana');
  const dias = fontes.diasDaSemana();
  const domingo = dias[dias.length - 1];
  const mediaDiaria = semana.energiaRecuperadaMwh / dias.length;
  const t021 = fontes.teste('#021');
  const t022 = fontes.teste('#022');
  const r021 = t021 ? fontes.resumoTeste(t021.id) : null;
  const r022 = t022 ? fontes.resumoTeste(t022.id) : null;
  const atual = 'conversa-atual';
  registrar(
    { id: atual, titulo: 'Domingo abaixo da média', atualizadaEm: '2026-10-05T18:03:00-03:00' },
    [
      mensagem(
        atual,
        'viber',
        `Olá, ${fontes.primeiroNome}. Ontem, ${diaEData(domingo.data)}, o sistema recuperou ${energia(domingo.energia.p1)}, ${acimaOuAbaixo(((domingo.energia.p1 - mediaDiaria) / mediaDiaria) * 100, 0)} da média da semana (${energia(mediaDiaria)}). Quer que eu compare com o teste de rodovia de hoje (#022)?`,
        '2026-10-05T18:02:00-03:00',
        {
          tipo: 'medicao',
          referencia: `Resumo diário calculado pelo backend · ${formatarDataCurta(domingo.data)}`,
        },
      ),
      mensagem(atual, 'usuario', 'Sim, compara com o teste #022.', '2026-10-05T18:03:00-03:00'),
      mensagem(
        atual,
        'viber',
        `No teste de rodovia #022 a potência média foi ${potencia(r022?.potenciaMediaMw ?? null)}, contra ${potencia(r021?.potenciaMediaMw ?? null)} no passeio de domingo (#021).`,
        '2026-10-05T18:03:00-03:00',
        {
          tipo: 'medicao',
          referencia: 'Resumos dos testes #021 e #022 calculados pelo backend',
          anexo: {
            tipo: 'comparacao',
            itens: [
              [t021, r021],
              [t022, r022],
            ]
              .filter((par): par is [TesteCampo, ResumoTeste] => Boolean(par[0] && par[1]))
              .map(([teste, resumo]) => ({
                codigo: teste.codigo,
                nome: teste.nome,
                energiaMwh: resumo.energiaRecuperadaMwh,
                potenciaMediaMw: resumo.potenciaMediaMw,
              })),
          },
        },
      ),
      mensagem(
        atual,
        'viber',
        'A vibração contínua da rodovia mantém os piezos excitados por mais tempo; no passeio, as paradas frequentes reduzem a energia por minuto.',
        '2026-10-05T18:03:00-03:00',
        { tipo: 'inferencia' },
      ),
    ],
  );

  // Conversas recentes, montadas dos registros da semana.
  const t017 = fontes.teste('#017');
  if (t017) {
    const id = 'conversa-falha-017';
    registrar(
      { id, titulo: 'Falha de fixação do piezo 7', atualizadaEm: '2026-10-02T09:05:00-03:00' },
      [
        mensagem(id, 'usuario', `O teste ${t017.codigo} falhou?`, '2026-10-02T09:04:00-03:00'),
        mensagem(
          id,
          'viber',
          `Sim. O teste ${t017.codigo} (${formatarDataCurta(t017.inicio!.slice(0, 10))}, ${t017.inicio!.slice(11, 16)}) foi encerrado como falho. ${t017.observacoes ?? ''}`.trim(),
          '2026-10-02T09:05:00-03:00',
          { tipo: 'medicao', referencia: `Registro do teste ${t017.codigo}` },
        ),
        mensagem(
          id,
          'viber',
          'Refixe o piezo 7 antes do próximo teste e confira a qualidade das amostras na Telemetria.',
          '2026-10-02T09:05:00-03:00',
          { tipo: 'recomendacao' },
        ),
      ],
    );
  }
  const t016 = fontes.teste('#016');
  const r016 = t016 ? fontes.resumoTeste(t016.id) : null;
  if (t016 && r016 && semana.pico) {
    const id = 'conversa-pico-semana';
    registrar(
      {
        id,
        titulo: `Pico de ${potencia(r016.picoPotenciaMw)} na quinta`,
        atualizadaEm: '2026-10-01T18:40:00-03:00',
      },
      [
        mensagem(id, 'usuario', 'Qual foi o pico desta semana?', '2026-10-01T18:39:00-03:00'),
        mensagem(
          id,
          'viber',
          `O pico foi de ${potencia(semana.pico.potenciaMw)} na ${diaEData(semana.pico.data)}${semana.pico.horario ? `, às ${semana.pico.horario}` : ''}, durante o teste ${t016.codigo}.`,
          '2026-10-01T18:40:00-03:00',
          { tipo: 'medicao', referencia: `Resumo do teste ${t016.codigo} calculado pelo backend` },
        ),
      ],
    );
  }
  const v2 = fontes.configuracoes.find((c) => c.versao === 2);
  if (v2) {
    const id = 'conversa-recalibracao';
    registrar(
      { id, titulo: 'Recalibração do LTC3588', atualizadaEm: '2026-09-20T16:10:00-03:00' },
      [
        mensagem(
          id,
          'viber',
          `A ${v2.nome} mudou a associação dos piezos para paralelo depois da recalibração do LTC3588.`,
          '2026-09-20T16:10:00-03:00',
          { tipo: 'explicacao', referencia: 'Versões da configuração da instalação VERS-PZ01' },
        ),
      ],
    );
  }

  /** Contextos autorizados: hoje, a semana e o teste em andamento (se houver). */
  function contextos(): ContextoViber[] {
    const lista: ContextoViber[] = [
      { id: 'hoje', rotulo: 'Hoje', rotuloResumo: 'de hoje' },
      { id: 'semana', rotulo: 'Semana', rotuloResumo: 'da semana' },
    ];
    const emAndamento = fontes.testeEmAndamento();
    if (emAndamento) {
      lista.push({
        id: emAndamento.id,
        rotulo: `Teste ${emAndamento.codigo}`,
        rotuloResumo: `do teste ${emAndamento.codigo}`,
      });
    }
    return lista;
  }

  /** Respostas da sugestão "Resumo" no contexto escolhido. */
  function responderResumo(
    conversaId: string,
    contextoId: string,
    quando: string,
  ): MensagemViber[] {
    if (contextoId === 'semana') {
      const melhor = dias.reduce((a, b) => (b.energia.p1 > a.energia.p1 ? b : a));
      const comparacao = semana.comparacao
        ? `, ${acimaOuAbaixo(semana.comparacao.variacaoPercentual)} da semana anterior`
        : '';
      return [
        mensagem(
          conversaId,
          'viber',
          `Na semana de ${formatarDataCurta(semana.inicio)} a ${formatarDataCurta(semana.fim)} o sistema recuperou ${energia(semana.energiaRecuperadaMwh)} em ${formatarNumero(semana.horasMovimento, 1)} h de movimento (${potencia(semana.potenciaMediaMw)} de potência média)${comparacao}. O melhor dia foi ${diaEData(melhor.data)}, com ${energia(melhor.energia.p1)}.`,
          quando,
          {
            tipo: 'medicao',
            referencia: `Resumo semanal calculado pelo backend · ${formatarDataCurta(semana.inicio)} a ${formatarDataCurta(semana.fim)}`,
          },
        ),
      ];
    }
    if (contextoId === 'hoje') {
      const hoje = fontes.resumo('dia');
      const comparacao = hoje.comparacao
        ? `, ${acimaOuAbaixo(hoje.comparacao.variacaoPercentual)} da média diária da semana`
        : '';
      return [
        mensagem(
          conversaId,
          'viber',
          `Hoje (${formatarDataCurta(hoje.inicio)}) o sistema recuperou ${energia(hoje.energiaRecuperadaMwh)} em ${formatarNumero(hoje.horasMovimento, 1)} h de movimento (${potencia(hoje.potenciaMediaMw)} de potência média)${comparacao}.`,
          quando,
          {
            tipo: 'medicao',
            referencia: `Resumo diário calculado pelo backend · ${formatarDataCurta(hoje.inicio)}`,
          },
        ),
      ];
    }
    const teste = fontes.testeEmAndamento();
    if (!teste || teste.id !== contextoId)
      throw new ErroRepositorio('validacao', 'Contexto não autorizado para esta conversa.');
    const amostras = fontes.amostrasDoTeste(teste.id);
    const ultima = amostras[amostras.length - 1];
    const minutos = teste.inicio
      ? Math.round((fontes.agora().getTime() - Date.parse(teste.inicio)) / 60000)
      : 0;
    return [
      mensagem(
        conversaId,
        'viber',
        `O teste ${teste.codigo} (${teste.nome}) está em andamento há ${minutos} min: ${energia(ultima?.energiaAcumuladaMwh ?? 0)} recuperados em ${formatarNumero(amostras.length)} amostras, última leitura de ${potencia(ultima?.potenciaMw ?? null)}.`,
        quando,
        { tipo: 'medicao', referencia: `Telemetria do teste ${teste.codigo}` },
      ),
    ];
  }

  /** Respostas da sugestão "Por que a eficiência caiu?": medição e inferência separadas. */
  function responderEficiencia(conversaId: string, quando: string): MensagemViber[] {
    const comEficiencia = dias.filter((d) => d.eficienciaPercentual !== null);
    const pior = comEficiencia.reduce((a, b) =>
      b.eficienciaPercentual! < a.eficienciaPercentual! ? b : a,
    );
    const melhor = comEficiencia.reduce((a, b) =>
      b.eficienciaPercentual! > a.eficienciaPercentual! ? b : a,
    );
    const perdaCelular = semana.perdas
      ? ` A maior perda é na entrega ao celular (−${formatarPercentual(semana.perdas.celular).valor}%).`
      : '';
    return [
      mensagem(
        conversaId,
        'viber',
        `Na semana, a eficiência ponta a ponta foi de ${formatarMedida(formatarPercentual(semana.eficienciaPercentual))}. O pior dia foi ${diaEData(pior.data)}, com ${formatarMedida(formatarPercentual(pior.eficienciaPercentual))}, e o melhor, ${diaEData(melhor.data)}, com ${formatarMedida(formatarPercentual(melhor.eficienciaPercentual))}.${perdaCelular}`,
        quando,
        {
          tipo: 'medicao',
          referencia: `Resumo semanal calculado pelo backend · ${formatarDataCurta(semana.inicio)} a ${formatarDataCurta(semana.fim)}`,
        },
      ),
      mensagem(
        conversaId,
        'viber',
        `${DIA_POR_EXTENSO[formatarDiaSemanaCurto(pior.data)] ?? 'O pior dia'} teve só ${formatarNumero(pior.horasMovimento, 1)} h em movimento e muitas paradas: com menos vibração contínua, a tensão no nó cai e o conversor rende menos.`.replace(
          /^./,
          (letra) => letra.toUpperCase(),
        ),
        quando,
        { tipo: 'inferencia' },
      ),
    ];
  }

  /** Resposta da sugestão "Quando revisar os piezos?": recomendação com base nas revisões e na configuração. */
  function responderRevisao(conversaId: string, quando: string): MensagemViber[] {
    const agendada = fontes.revisoes.find((r) => r.status === 'agendada' || r.status === 'aberta');
    const ativa = [...fontes.configuracoes].sort((a, b) => b.versao - a.versao)[0];
    const inativos = ativa?.piezosInativos ?? [];
    const capacidade = ativa?.piezosTotal ? Math.round((ativa.piezosAtivos / ativa.piezosTotal) * 100) : null;
    const partes = [
      agendada
        ? `Há uma revisão ${agendada.status === 'agendada' ? 'agendada' : 'aberta'} desde ${formatarDataCurta(agendada.criadaEm.slice(0, 10))}: ${agendada.motivo}`
        : 'Não há revisão aberta.',
      inativos.length && ativa
        ? `Os piezos ${inativos.join(' e ')} estão desligados desde a ${ativa.nome} (${formatarDataCurta(ativa.criadaEm.slice(0, 10))}), o que deixa ${capacidade}% da capacidade em operação.`
        : 'Todos os piezos estão captando.',
      agendada
        ? 'Recomendo manter a revisão e religar os piezos depois dela.'
        : 'Recomendo uma inspeção preventiva no próximo mês.',
    ];
    return [
      mensagem(conversaId, 'viber', partes.join(' '), quando, {
        tipo: 'recomendacao',
        referencia: 'Revisões e configuração da instalação VERS-PZ01',
      }),
    ];
  }

  /** Mensagens da conversa (cópia). */
  function listarMensagens(conversaId: string): MensagemViber[] {
    const lista = mensagens.get(conversaId);
    if (!lista) throw new ErroRepositorio('nao-encontrado', 'Conversa não encontrada.');
    return lista;
  }

  /** Conversas da mais recente para a mais antiga. */
  function listarConversas(): ConversaViber[] {
    return [...conversas].sort((a, b) => Date.parse(b.atualizadaEm) - Date.parse(a.atualizadaEm));
  }

  /** Cria uma conversa vazia, datada de agora. */
  function criarConversa(): ConversaViber {
    const conversa = {
      id: `conversa-nova-${conversas.length + 1}`,
      titulo: 'Nova conversa',
      atualizadaEm: formatarIsoComFuso(fontes.agora(), FUSO_MINUTOS),
    };
    registrar(conversa, []);
    return conversa;
  }

  /**
   * Envia uma mensagem e devolve a do usuário seguida das respostas.
   *
   * Só as sugestões têm resposta no exemplo; pergunta livre é recusada antes
   * de gravar qualquer coisa, para a tela manter o rascunho.
   */
  function enviar(envio: EnvioViber): MensagemViber[] {
    const lista = listarMensagens(envio.conversaId);
    if (!envio.sugestao) {
      throw new ErroRepositorio(
        'indisponivel',
        'Perguntas livres ficam disponíveis com o backend da Viber.',
      );
    }
    if (!contextos().some((c) => c.id === envio.contextoId)) {
      throw new ErroRepositorio('validacao', 'Contexto não autorizado para esta conversa.');
    }
    const quando = formatarIsoComFuso(fontes.agora(), FUSO_MINUTOS);
    const respostas =
      envio.sugestao === 'resumo'
        ? responderResumo(envio.conversaId, envio.contextoId, quando)
        : envio.sugestao === 'eficiencia'
          ? responderEficiencia(envio.conversaId, quando)
          : responderRevisao(envio.conversaId, quando);
    const novas = [mensagem(envio.conversaId, 'usuario', envio.texto, quando), ...respostas];
    lista.push(...novas);
    const conversa = conversas.find((c) => c.id === envio.conversaId)!;
    conversa.atualizadaEm = quando;
    if (conversa.titulo === 'Nova conversa') conversa.titulo = envio.texto;
    return novas;
  }

  return { contextos, listarConversas, listarMensagens, criarConversa, enviar };
}
