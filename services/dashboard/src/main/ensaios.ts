/** Valida operações de ensaio e minimiza contratos REST antes de cruzarem IPC. */
import type { Session } from 'electron';
import type { TestRecord, EnergySummary, TelemetrySample, TestComparison, PaginationMeta } from '@vers/shared-types';
import type { ResultadoCadastro } from '../shared/cadastro';
import type { ResultadoSessao } from '../shared/sessao';
import { validarApiLocal } from './sessao';

type Objeto = Record<string, unknown>;
type Dados = TestRecord | TestRecord[] | EnergySummary[] | TelemetrySample[] | TestComparison;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ESTADOS = ['PLANNED', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED'];
const TERRENOS = ['HIGHWAY', 'CITY', 'OFFROAD', 'MIXED', 'OTHER'];
const RESULTADOS = ['SATISFACTORY', 'UNSATISFACTORY', 'INCONCLUSIVE'];
const QUALIDADES = ['VALID', 'PARTIAL', 'SUSPECT', 'INVALID'];
const texto = (v: unknown): v is string => typeof v === 'string';
const uuid = (v: unknown) => texto(v) && UUID.test(v);
const numero = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const inteiro = (v: unknown) => Number.isSafeInteger(v) && Number(v) >= 0;
const nulo = (validar: (v: unknown) => boolean) => (v: unknown) => v === null || validar(v);
const objeto = (v: unknown): v is Objeto => !!v && typeof v === 'object' && !Array.isArray(v);

/** Aceita somente UTC canônico e datas existentes, sem normalização silenciosa. */
function instante(v: unknown): v is string {
  if (!texto(v) || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.test(v) || !Number.isFinite(Date.parse(v))) return false;
  const canonico = new Date(v).toISOString();
  return v === canonico || v === `${canonico.slice(0, 19)}Z`;
}

/** Copia somente campos públicos depois de verificar seus valores. */
function copiar(v: unknown, regras: Record<string, (v: unknown) => boolean>): Objeto {
  if (!objeto(v) || !Object.entries(regras).every(([k, validar]) => validar(v[k]))) throw new Error('Resposta inválida');
  return Object.fromEntries(Object.keys(regras).map(k => [k, v[k]]));
}

/** Valida o retrato histórico e os campos públicos do teste. */
function teste(v: unknown): TestRecord {
  const r = copiar(v, { id: uuid, installationId: nulo(uuid), configurationId: nulo(uuid), createdById: nulo(uuid),
    name: texto, status: v => ESTADOS.includes(String(v)), terrain: v => TERRENOS.includes(String(v)), snapshot: objeto,
    startedAt: nulo(instante), endedAt: nulo(instante), vehicleWeightKg: nulo(numero), averageEngineRpm: nulo(numero),
    averageSpeedKph: nulo(numero), inclineDegrees: nulo(numero), outcome: nulo(v => RESULTADOS.includes(String(v))),
    notes: nulo(texto), createdAt: instante, updatedAt: instante });
  r.snapshot = copiar(r.snapshot, { vehicleModel: nulo(texto), testLocation: texto, activePiezoCount: inteiro, configurationVersion: inteiro });
  return r as unknown as TestRecord;
}

/** Restringe a leitura ao teste solicitado e não aceita números não finitos. */
function amostra(v: unknown, id: string): TelemetrySample {
  const r = copiar(v, { id: uuid, testId: v => texto(v) && v.toLowerCase() === id.toLowerCase(), capturedAt: instante,
    ...Object.fromEntries(['voltageV', 'currentA', 'powerW', 'devicePowerW', 'accumulatedEnergyWh', 'accelerationXMs2',
      'accelerationYMs2', 'accelerationZMs2', 'vibrationRmsMs2', 'temperatureC'].map(k => [k, nulo(numero)])),
    activePiezoCount: nulo(inteiro), quality: v => QUALIDADES.includes(String(v)) });
  return r as unknown as TelemetrySample;
}

/** Devolve resumos oficiais TEST ou HOUR da instalação, preservando nulos e vínculo. */
function resumo(v: unknown, id: string, instalacao = false): EnergySummary {
  const igual = (v: unknown) => texto(v) && v.toLowerCase() === id.toLowerCase();
  const r = copiar(v, { id: uuid, installationId: instalacao ? igual : nulo(uuid), testId: instalacao ? v => v === null : igual,
    periodType: v => v === (instalacao ? 'HOUR' : 'TEST'), periodStart: instante, periodEnd: instante, recoveredEnergyWh: numero,
    vehicleEnergyUsedWh: nulo(numero), averagePowerW: nulo(numero), peakPowerW: nulo(numero),
    moneySaved: nulo(texto), currencyCode: nulo(texto), energyTariffPerKwh: nulo(texto), sampleCount: inteiro,
    quality: v => ['GOOD', 'PARTIAL', 'INVALID'].includes(String(v)), calculatedAt: instante });
  if (Date.parse(String(r.periodEnd)) <= Date.parse(String(r.periodStart))) throw new Error('Período inválido');
  if (instalacao && (Date.parse(String(r.periodStart)) % 3600000 !== 0 ||
    Date.parse(String(r.periodEnd)) - Date.parse(String(r.periodStart)) !== 3600000)) throw new Error('Bloco horário inválido');
  return r as unknown as EnergySummary;
}

/** Confere campos permitidos e obrigatórios, inclusive nos objetos aninhados do IPC. */
function campos(v: unknown, regras: Record<string, (v: unknown) => boolean>, obrigatorios: string[] = []): v is Objeto {
  return objeto(v) && obrigatorios.every(k => v[k] !== undefined) && Object.keys(v).every(k =>
    Object.hasOwn(regras, k) && (v[k] === undefined || regras[k](v[k])));
}

/** Valida paginação, filtros UTC e intervalo crescente antes de montar URL fixa. */
function consulta(v: unknown, telemetria: boolean): v is Objeto {
  const de = telemetria ? 'capturedFrom' : 'startedFrom'; const ate = telemetria ? 'capturedTo' : 'startedTo';
  return campos(v, { page: v => inteiro(v) && Number(v) > 0, pageSize: v => inteiro(v) && Number(v) > 0 && Number(v) <= 100,
    [de]: instante, [ate]: instante, ...(telemetria ? { quality: (v: unknown) => QUALIDADES.includes(String(v)) }
      : { status: (v: unknown) => ESTADOS.includes(String(v)), installationId: uuid }) })
    && !(v[de] !== undefined && v[ate] !== undefined && Date.parse(String(v[de])) >= Date.parse(String(v[ate])));
}

/** Constrói operações específicas; identidade, URLs, cookies e headers ficam no main. */
export function criarEnsaios(rede: Pick<Session, 'fetch'> & { cookies: Pick<Session['cookies'], 'flushStore'> }, endereco: string,
  autorizar: () => Promise<ResultadoSessao>) {
  const base = validarApiLocal(endereco);
  /** Faz preflight de sessão, CSRF para POST e uma única repetição de GET após 401. */
  return async (acao: unknown, dados: unknown): Promise<ResultadoCadastro<Dados>> => {
    const p = objeto(dados) ? dados : {};
    const leitura = ['listar', 'amostras', 'resumos', 'comparar', 'energia'].includes(String(acao));
    const limitado = (max: number) => (v: unknown) => texto(v) && v.length <= max;
    const obrigatorio = (max: number) => (v: unknown) => limitado(max)(v) && /\S/.test(String(v));
    const positivo = (v: unknown) => numero(v) && v > 0;
    const naoNegativo = (v: unknown) => numero(v) && v >= 0;
    const criacao = { installationId: uuid, configurationId: uuid, name: obrigatorio(120),
      terrain: (v: unknown) => TERRENOS.includes(String(v)), testLocation: obrigatorio(160), vehicleWeightKg: nulo(positivo), notes: nulo(limitado(1000)) };
    const finalizacao = { status: (v: unknown) => ['COMPLETED', 'FAILED'].includes(String(v)),
      outcome: nulo(v => RESULTADOS.includes(String(v))), averageEngineRpm: nulo(naoNegativo), averageSpeedKph: nulo(naoNegativo),
      inclineDegrees: nulo(numero), vehicleWeightKg: nulo(positivo), notes: nulo(limitado(1000)) };
    let valida = false;
    if (acao === 'listar') valida = consulta(dados, false);
    if (acao === 'criar') valida = campos(dados, criacao, ['installationId', 'configurationId', 'name', 'terrain', 'testLocation']);
    if (['iniciar', 'finalizar', 'cancelar'].includes(String(acao))) valida = campos(dados, { id: uuid, dados: v =>
      acao === 'iniciar' ? campos(v, {}) : acao === 'finalizar' ? campos(v, finalizacao, ['status'])
        : campos(v, { reason: limitado(500) }) }, ['id', 'dados']);
    if (acao === 'amostras' || acao === 'resumos') valida = campos(dados, { id: uuid,
      query: v => acao === 'amostras' ? consulta(v, true) : campos(v, {}) }, ['id', 'query']);
    if (acao === 'energia') valida = campos(dados, { id: uuid, query: v => campos(v, {
      page: v => inteiro(v) && Number(v) > 0,
      periodFrom: v => instante(v) && Date.parse(v) % 3600000 === 0,
      periodTo: v => instante(v) && Date.parse(v) % 3600000 === 0,
    }, ['page', 'periodFrom', 'periodTo']) && Date.parse(String(v.periodTo)) > Date.parse(String(v.periodFrom)) &&
      Date.parse(String(v.periodTo)) - Date.parse(String(v.periodFrom)) <= 32 * 24 * 3600000 }, ['id', 'query']);
    if (acao === 'comparar') valida = campos(dados, { testIds: v => Array.isArray(v) && v.length >= 2 && v.length <= 5
      && v.every(uuid) && new Set(v.map(i => i.toLowerCase())).size === v.length }, ['testIds']);
    if (!valida) return { ok: false, status: 400, erro: 'REQUISICAO_INVALIDA' };
    const query = acao === 'listar' ? p : acao === 'amostras' ? p.query as Objeto : acao === 'resumos' ? { periodType: 'TEST', page: 1, pageSize: 20 }
      : acao === 'energia' ? { ...p.query as Objeto, pageSize: 100, periodType: 'HOUR' } : {};
    const parametros = new URLSearchParams();
    if (['listar', 'amostras', 'resumos', 'energia'].includes(String(acao))) {
      parametros.set('page', String(query.page ?? 1)); parametros.set('pageSize', String(query.pageSize ?? 20));
      for (const [k, v] of Object.entries(query)) if (v !== undefined && !['page', 'pageSize'].includes(k)) parametros.set(k, String(v));
    }
    if (acao === 'comparar') for (const id of p.testIds as string[]) parametros.append('testIds', id);
    const sufixo = ({ iniciar: 'start', finalizar: 'finish', cancelar: 'cancel', amostras: 'telemetry', resumos: 'energy-summaries' } as Record<string, string>)[String(acao)];
    const rota = acao === 'comparar' ? 'test-comparisons' : acao === 'energia' ? `installations/${p.id}/energy-summaries`
      : sufixo ? `tests/${p.id}/${sufixo}` : 'tests';
    const url = `${base}/${rota}${parametros.size ? `?${parametros}` : ''}`;
    try {
      const acesso = await autorizar(); if (!acesso.ok) return acesso;
      const opcoes: RequestInit = { credentials: 'include', redirect: 'error', signal: AbortSignal.timeout(10000) };
      if (!leitura) {
        const csrf = await rede.fetch(`${base}/auth/csrf`, opcoes);
        if (!csrf.ok) return { ok: false, status: csrf.status, erro: 'HTTP' };
        const token = (await csrf.json()).data?.csrfToken;
        if (!texto(token) || !/^[a-f0-9]{64}$/.test(token)) return { ok: false, status: 0, erro: 'RESPOSTA_INVALIDA' };
        opcoes.method = 'POST'; opcoes.headers = { Origin: 'http://localhost:5174', 'Content-Type': 'application/json', 'x-csrf-token': token };
        opcoes.body = JSON.stringify(acao === 'criar' ? p : p.dados);
      }
      let resposta = await rede.fetch(url, opcoes);
      if (leitura && resposta.status === 401) {
        const acesso = await autorizar(); if (!acesso.ok) return acesso;
        resposta = await rede.fetch(url, { ...opcoes, signal: AbortSignal.timeout(10000) });
      }
      if (!leitura) await rede.cookies.flushStore();
      if (!resposta.ok) return { ok: false, status: resposta.status, erro: 'HTTP' };
      if (resposta.status !== (acao === 'criar' ? 201 : 200)) return { ok: false, status: 0, erro: 'RESPOSTA_INVALIDA' };
      try {
        const corpo = await resposta.json();
        if (!leitura) {
          const r = teste(corpo.data);
          if (acao !== 'criar' && r.id.toLowerCase() !== String(p.id).toLowerCase()) throw new Error('Vínculo inválido');
          return { ok: true, data: r };
        }
        if (acao === 'comparar') {
          const ids = p.testIds as string[];
          if (!Array.isArray(corpo.data?.items) || corpo.data.items.length !== ids.length) throw new Error('Comparação inválida');
          const items = ids.map(id => {
            const correspondentes = corpo.data.items.filter((i: unknown) => objeto(i) && texto(i.testId) && i.testId.toLowerCase() === id.toLowerCase());
            if (correspondentes.length !== 1) throw new Error('Vínculo inválido');
            return { testId: id, summary: correspondentes[0].summary === null ? null : resumo(correspondentes[0].summary, id) };
          });
          return { ok: true, data: { items } };
        }
        const meta = copiar(corpo.meta, { page: inteiro, pageSize: inteiro, totalItems: inteiro, totalPages: inteiro }) as unknown as PaginationMeta;
        if (meta.page !== Number(query.page ?? 1) || meta.pageSize !== Number(query.pageSize ?? 20) || meta.totalPages !== Math.ceil(meta.totalItems / meta.pageSize)
          || !Array.isArray(corpo.data) || corpo.data.length !== Math.min(meta.pageSize, Math.max(0, meta.totalItems - (meta.page - 1) * meta.pageSize))) throw new Error('Paginação inválida');
        const data = corpo.data.map((v: unknown) => acao === 'listar' ? teste(v) : acao === 'amostras' ? amostra(v, String(p.id)) : resumo(v, String(p.id), acao === 'energia'));
        if (acao === 'energia' && (meta.totalItems > (Date.parse(String(query.periodTo)) - Date.parse(String(query.periodFrom))) / 3600000 ||
          data.some((r: EnergySummary) => Date.parse(r.periodStart) < Date.parse(String(query.periodFrom)) || Date.parse(r.periodEnd) > Date.parse(String(query.periodTo)))))
          throw new Error('Bloco fora da janela');
        if (new Set(data.map((i: { id: string }) => i.id)).size !== data.length) throw new Error('Duplicação inválida');
        if (acao === 'resumos' && meta.totalItems > 1) throw new Error('Resumo TEST ambíguo');
        return { ok: true, data, meta };
      } catch { return { ok: false, status: 0, erro: 'RESPOSTA_INVALIDA' }; }
    } catch { return { ok: false, status: 0, erro: 'CONEXAO' }; }
  };
}
