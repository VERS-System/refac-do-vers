/** Adapta ensaios reais sem recalcular energia oficial ou recorrer a exemplos. */
import type { TestRecord, EnergySummary, TelemetrySample, TestSearchQuery, TelemetrySearchQuery } from '@vers/shared-types';
import type { PonteEnsaios } from '../../shared/ensaios';
import type { ResultadoCadastro } from '../../shared/cadastro';
import type { RepositorioVers } from './repositorio';
import type { TesteCampo, ResumoTeste, AmostraTelemetria } from './tipos';
import { ErroRepositorio } from './erros';

const ESTADOS = { planejado: 'PLANNED', 'em-andamento': 'RUNNING', concluido: 'COMPLETED', falhou: 'FAILED', cancelado: 'CANCELLED' } as const;
const TERRENOS = { rodovia: 'HIGHWAY', cidade: 'CITY', 'fora-estrada': 'OFFROAD', misto: 'MIXED', outro: 'OTHER' } as const;
const RESULTADOS = { satisfatorio: 'SATISFACTORY', insatisfatorio: 'UNSATISFACTORY', inconclusivo: 'INCONCLUSIVE' } as const;
const QUALIDADES = { valida: 'VALID', parcial: 'PARTIAL', suspeita: 'SUSPECT', invalida: 'INVALID' } as const;
const DATA_BRASILIA = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3, hourCycle: 'h23' });

/** Formata ISO em Brasília preservando o instante, inclusive em datas históricas com outro offset. */
export function isoBrasilia(valor: string): string {
  const data = new Date(valor);
  const p = Object.fromEntries(DATA_BRASILIA.formatToParts(data).map(p => [p.type, p.value]));
  const local = `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}.${p.fractionalSecond}`;
  const minutos = Math.round((Date.parse(`${local}Z`) - data.getTime()) / 60000);
  const absoluto = Math.abs(minutos);
  return `${local}${minutos < 0 ? '-' : '+'}${String(Math.floor(absoluto / 60)).padStart(2, '0')}:${String(absoluto % 60).padStart(2, '0')}`;
}

/** Omite campos opcionais ausentes, preservando null e zero do contrato. */
function definidos<T extends Record<string, unknown>>(dados: T): T {
  return Object.fromEntries(Object.entries(dados).filter(([, v]) => v !== undefined)) as T;
}

/** Converte apenas datas válidas de filtros para o UTC exigido pela API. */
function utc(v: string | undefined): string | undefined {
  if (v === undefined) return undefined;
  if (!Number.isFinite(Date.parse(v))) throw new ErroRepositorio('validacao', 'Informe um intervalo válido.');
  return new Date(v).toISOString();
}

/** Traduz enums e o retrato histórico, usando o UUID público como identificação. */
function converterTeste(t: TestRecord): TesteCampo {
  return { id: t.id, codigo: t.id, nome: t.name,
    estado: (Object.keys(ESTADOS) as (keyof typeof ESTADOS)[]).find(k => ESTADOS[k] === t.status)!,
    terreno: (Object.keys(TERRENOS) as (keyof typeof TERRENOS)[]).find(k => TERRENOS[k] === t.terrain)!,
    local: t.snapshot.testLocation, inicio: t.startedAt === null ? null : isoBrasilia(t.startedAt),
    fim: t.endedAt === null ? null : isoBrasilia(t.endedAt), criadoEm: isoBrasilia(t.createdAt),
    resultado: t.outcome === null ? null : (Object.keys(RESULTADOS) as (keyof typeof RESULTADOS)[]).find(k => RESULTADOS[k] === t.outcome)!,
    modeloVeiculo: t.snapshot.vehicleModel, piezosAtivos: t.snapshot.activePiezoCount, versaoConfiguracao: t.snapshot.configurationVersion,
    pesoVeiculoKg: t.vehicleWeightKg, velocidadeMediaKmh: t.averageSpeedKph, rotacaoMediaRpm: t.averageEngineRpm,
    inclinacaoGraus: t.inclineDegrees, observacoes: t.notes };
}

/** Converte unidades sem substituir valor desconhecido por zero. */
function mili(valor: number | null): number | null {
  if (valor === null) return null;
  const convertido = valor * 1000;
  if (!Number.isFinite(convertido)) throw new ErroRepositorio('indisponivel', 'Medição fora do intervalo de apresentação.');
  return convertido;
}

/** Preserva a qualidade oficial para distinguir resumo inválido de resumo ausente. */
function converterResumo(r: EnergySummary): ResumoTeste {
  return { testeId: r.testId!, energiaRecuperadaMwh: mili(r.recoveredEnergyWh)!, potenciaMediaMw: mili(r.averagePowerW),
    picoPotenciaMw: mili(r.peakPowerW), amostras: r.sampleCount,
    qualidade: ({ GOOD: 'boa', PARTIAL: 'parcial', INVALID: 'invalida' } as const)[r.quality] };
}

/** Preserva contador do dispositivo e desconhece o total físico de piezos, ausente na API. */
function converterAmostra(a: TelemetrySample): AmostraTelemetria {
  return { id: a.id, testeId: a.testId!, capturadaEm: isoBrasilia(a.capturedAt), tensaoV: a.voltageV,
    correnteMa: mili(a.currentA), potenciaMw: mili(a.powerW), energiaAcumuladaMwh: mili(a.accumulatedEnergyWh),
    vibracaoRmsMs2: a.vibrationRmsMs2, temperaturaC: a.temperatureC, piezosAtivos: a.activePiezoCount, piezosTotal: null,
    qualidade: (Object.keys(QUALIDADES) as (keyof typeof QUALIDADES)[]).find(k => QUALIDADES[k] === a.quality)! };
}

type Metodos = Pick<RepositorioVers, 'buscarTestes' | 'criarTeste' | 'iniciarTeste' | 'finalizarTeste' | 'cancelarTeste'
  | 'obterResumoTeste' | 'compararTestes' | 'obterAmostrasTelemetria'>;

/** Expõe somente os métodos já integrados e encerra a identidade quando a API recusa a sessão. */
export function criarEnsaios(ponte: PonteEnsaios | undefined, expirar: () => void): Metodos & { ensaiosReais: true } {
  /** Traduz falhas seguras; nunca repete uma mutação ou recorre aos mocks. */
  async function chamar<T>(acao: () => Promise<ResultadoCadastro<T>>): Promise<Extract<ResultadoCadastro<T>, { ok: true }>> {
    let r: ResultadoCadastro<T>;
    try { if (!ponte) throw new Error(); r = await acao(); }
    catch { throw new ErroRepositorio('indisponivel', 'Não foi possível comunicar com a API local.'); }
    if (r.ok) return r;
    if (r.status === 401) { expirar(); throw new ErroRepositorio('sessao-expirada', 'Sua sessão expirou. Entre de novo.'); }
    if (r.status === 409) throw new ErroRepositorio('conflito', 'O estado do teste mudou ou há um teste em andamento. Atualize a consulta.');
    if ([400, 422].includes(r.status)) throw new ErroRepositorio('validacao', 'Confira os campos e a transição solicitada.');
    if (r.status === 404) throw new ErroRepositorio('nao-encontrado', 'Teste indisponível para esta conta.');
    if (r.status === 403) throw new ErroRepositorio('acesso-negado', 'A operação não foi autorizada.');
    if (r.status === 429) throw new ErroRepositorio('limite-tentativas', 'Muitas solicitações. Aguarde e tente de novo.');
    throw new ErroRepositorio('indisponivel', 'Não foi possível consultar os ensaios reais.');
  }

  return {
    ensaiosReais: true,
    /** Busca páginas do histórico mantendo os filtros e os limites reais. */
    async buscarTestes(c) {
      const query: TestSearchQuery = definidos({ page: c.pagina ?? 1, pageSize: c.tamanhoPagina ?? 20,
        status: c.status === undefined ? undefined : ESTADOS[c.status], startedFrom: utc(c.inicioDe), startedTo: utc(c.inicioAte) });
      const r = await chamar(() => ponte!.listar(query));
      if (!r.meta) throw new ErroRepositorio('indisponivel', 'Histórico sem paginação.');
      return { itens: r.data.map(converterTeste), pagina: r.meta.page, tamanhoPagina: r.meta.pageSize, total: r.meta.totalItems };
    },
    /** Exige escolha explícita de instalação/configuração antes de planejar. */
    async criarTeste(n) {
      if (!n.instalacaoId || !n.configuracaoId) throw new ErroRepositorio('validacao', 'Escolha a instalação e a configuração do teste.');
      return converterTeste((await chamar(() => ponte!.criar(definidos({ installationId: n.instalacaoId!, configurationId: n.configuracaoId!,
        name: n.nome.trim(), terrain: TERRENOS[n.terreno], testLocation: n.local.trim(), vehicleWeightKg: n.pesoVeiculoKg, notes: n.observacoes })))).data);
    },
    /** Solicita início sem fornecer estado ou relógio do cliente. */
    async iniciarTeste(id) { return converterTeste((await chamar(() => ponte!.iniciar(id))).data); },
    /** Envia somente informações humanas de encerramento. */
    async finalizarTeste(id, f) {
      return converterTeste((await chamar(() => ponte!.finalizar(id, definidos({ status: f.status === 'concluido' ? 'COMPLETED' as const : 'FAILED' as const,
        outcome: f.resultado === undefined ? undefined : f.resultado === null ? null : RESULTADOS[f.resultado], averageSpeedKph: f.velocidadeMediaKmh,
        averageEngineRpm: f.rotacaoMediaRpm, inclineDegrees: f.inclinacaoGraus, notes: f.observacoes })))).data);
    },
    /** Cancela preservando amostras já persistidas no servidor. */
    async cancelarTeste(id, c) { return converterTeste((await chamar(() => ponte!.cancelar(id, definidos({ reason: c.motivo })))).data); },
    /** Ausência de resumo oficial permanece null, sem integrar contador acumulado. */
    async obterResumoTeste(id) {
      const r = await chamar(() => ponte!.resumos(id));
      if (r.data.length > 1) throw new ErroRepositorio('indisponivel', 'Resumo TEST ambíguo.');
      return r.data[0] ? converterResumo(r.data[0]) : null;
    },
    /** Compara de dois a cinco testes distintos com os resumos do backend. */
    async compararTestes(ids) {
      if (ids.length < 2 || ids.length > 5 || new Set(ids.map(i => i.toLowerCase())).size !== ids.length) throw new ErroRepositorio('validacao', 'Escolha de 2 a 5 testes distintos.');
      const r = await chamar(() => ponte!.comparar(ids));
      return r.data.items.map(i => ({ testeId: i.testId, resumo: i.summary === null || i.summary.quality === 'INVALID' ? null : converterResumo(i.summary) }));
    },
    /** Inverte a paginação global ascendente com um probe e no máximo duas páginas de dados. */
    async obterAmostrasTelemetria(c) {
      const pagina = c.pagina ?? 1; const tamanhoPagina = c.tamanhoPagina ?? 20;
      if (!Number.isSafeInteger(pagina) || pagina < 1 || !Number.isSafeInteger(tamanhoPagina) || tamanhoPagina < 1 || tamanhoPagina > 100)
        throw new ErroRepositorio('validacao', 'Paginação inválida.');
      const filtros: TelemetrySearchQuery = definidos({ capturedFrom: utc(c.de), capturedTo: utc(c.ate), quality: c.qualidade === undefined ? undefined : QUALIDADES[c.qualidade] });
      const inicial = await chamar(() => ponte!.amostras(c.testeId, { ...filtros, page: 1, pageSize: 1 }));
      if (!inicial.meta) throw new ErroRepositorio('indisponivel', 'Amostras sem paginação.');
      const total = inicial.meta.totalItems;
      const fim = Math.max(0, total - (pagina - 1) * tamanhoPagina); const inicio = Math.max(0, fim - tamanhoPagina);
      const dados: TelemetrySample[] = [];
      const primeira = Math.floor(inicio / tamanhoPagina) + 1;
      for (let p = primeira; p <= Math.ceil(fim / tamanhoPagina); p++) {
        const r = await chamar(() => ponte!.amostras(c.testeId, { ...filtros, page: p, pageSize: tamanhoPagina }));
        if (!r.meta || r.meta.totalItems !== total || r.meta.page !== p || r.meta.pageSize !== tamanhoPagina ||
          r.data.length !== Math.min(tamanhoPagina, total - (p - 1) * tamanhoPagina))
          throw new ErroRepositorio('indisponivel', 'A lista de amostras mudou. Atualize a consulta.');
        dados.push(...r.data);
      }
      const deslocamento = inicio - (primeira - 1) * tamanhoPagina;
      const selecionadas = dados.slice(deslocamento, deslocamento + fim - inicio).reverse();
      if (new Set(selecionadas.map(a => a.id)).size !== selecionadas.length) throw new ErroRepositorio('indisponivel', 'Amostras repetidas. Atualize a consulta.');
      return { itens: selecionadas.map(converterAmostra), total, pagina, tamanhoPagina };
    },
  };
}
