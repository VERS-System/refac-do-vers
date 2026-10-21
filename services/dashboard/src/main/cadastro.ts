/** Transporta somente operações permitidas de cadastro pela sessão Chromium do app. */
import type { Session } from 'electron';
import type { Vehicle, Installation, Configuration, PaginationMeta } from '@vers/shared-types';
import type { ResultadoCadastro } from '../shared/cadastro';
import type { ResultadoSessao } from '../shared/sessao';
import { validarApiLocal } from './sessao';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const texto = (v: unknown): v is string => typeof v === 'string';
const uuid = (v: unknown) => texto(v) && UUID.test(v);
const inteiro = (v: unknown) => Number.isSafeInteger(v) && Number(v) >= 0;
const textoNulo = (v: unknown) => v === null || texto(v);
type Dados = Vehicle | Vehicle[] | Installation[] | Configuration[] | null;

/** Copia apenas propriedades públicas cujos tipos foram conferidos. */
function selecionar(valor: unknown, regras: Record<string, (valor: unknown) => boolean>): Record<string, unknown> {
  if (!valor || typeof valor !== 'object' || Array.isArray(valor)) throw new Error('Resposta inválida');
  const p = valor as Record<string, unknown>;
  if (!Object.entries(regras).every(([campo, validar]) => validar(p[campo]))) throw new Error('Resposta inválida');
  return Object.fromEntries(Object.keys(regras).map(campo => [campo, p[campo]]));
}

/** Minimiza campos do veículo e valida enumeração e identificadores. */
function veiculo(valor: unknown): Vehicle {
  return selecionar(valor, { id: uuid, licensePlate: texto, brand: textoNulo, model: textoNulo,
    modelYear: v => v === null || inteiro(v), relationship: v => ['OWNER', 'DRIVER', 'ADMIN'].includes(String(v)),
    isPrimary: v => typeof v === 'boolean', createdAt: texto, updatedAt: texto }) as unknown as Vehicle;
}

/** Preserva nulos e restringe o dispositivo à visão pública do contrato. */
function instalacao(valor: unknown): Installation {
  const p = selecionar(valor, { id: uuid, vehicleId: uuid, systemModel: texto,
    status: v => ['ACTIVE', 'MAINTENANCE', 'INACTIVE', 'FAULT'].includes(String(v)),
    installedAt: textoNulo, activeDevice: v => v === null || (!!v && typeof v === 'object'), createdAt: texto, updatedAt: texto });
  if (p.activeDevice !== null) p.activeDevice = selecionar(p.activeDevice, { id: uuid, name: textoNulo,
    firmwareVersion: textoNulo, status: v => ['PROVISIONING', 'ONLINE', 'OFFLINE', 'REVOKED', 'FAULT'].includes(String(v)), lastSeenAt: textoNulo });
  return p as unknown as Installation;
}

/** Mantém somente medições/configuração existentes, sem fabricar topologia ou total. */
function configuracao(valor: unknown): Configuration {
  return selecionar(valor, { id: uuid, installationId: uuid, name: texto, version: inteiro,
    activePiezoCount: inteiro, piezoAssociation: v => ['SERIES', 'PARALLEL', 'MIXED'].includes(String(v)),
    installationPoint: texto, storageType: v => ['BATTERY', 'SUPERCAPACITOR', 'CAPACITOR', 'NONE'].includes(String(v)),
    notes: textoNulo, createdAt: texto }) as unknown as Configuration;
}

/** Confere campos de escrita; autoridade da conta e placa na edição não são aceitas. */
function escrita(valor: unknown, criar: boolean): boolean {
  if (!valor || typeof valor !== 'object' || Array.isArray(valor)) return false;
  const p = valor as Record<string, unknown>;
  const permitidos = criar ? ['licensePlate', 'brand', 'model', 'modelYear'] : ['brand', 'model', 'modelYear', 'isPrimary'];
  if (!Object.keys(p).length || !Object.keys(p).every(c => permitidos.includes(c))) return false;
  if (criar && (!texto(p.licensePlate) || !/^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/.test(p.licensePlate.toUpperCase().replace(/[\s-]/g, '')))) return false;
  return ['brand', 'model'].every(c => p[c] === undefined || (!criar && p[c] === null) || (texto(p[c]) && p[c].length <= (c === 'brand' ? 80 : 120)))
    && (p.modelYear === undefined || (!criar && p.modelYear === null) || (inteiro(p.modelYear) && Number(p.modelYear) >= 1886 && Number(p.modelYear) <= 2100))
    && (p.isPrimary === undefined || typeof p.isPrimary === 'boolean');
}

/** Valida operação e monta exclusivamente rotas fixas do cadastro autorizado. */
export function criarCadastro(rede: Pick<Session, 'fetch'> & { cookies: Pick<Session['cookies'], 'flushStore'> }, endereco: string,
  autorizar: () => Promise<ResultadoSessao>) {
  const base = validarApiLocal(endereco);
  /** Executa uma operação na fila compartilhada do main; mutações nunca têm replay. */
  return async (acao: unknown, dados: unknown): Promise<ResultadoCadastro<Dados>> => {
    const p = dados && typeof dados === 'object' && !Array.isArray(dados) ? dados as Record<string, unknown> : {};
    const paginada = typeof acao === 'string' && ['veiculos', 'instalacoes', 'configuracoes'].includes(acao);
    const chaves = acao === 'veiculos' ? ['pagina'] : paginada ? ['id', 'pagina']
      : acao === 'criarVeiculo' ? null : acao === 'atualizarVeiculo' ? ['id', 'dados'] : ['id', 'substitutoId'];
    if (typeof acao !== 'string' || !['veiculos', 'instalacoes', 'configuracoes', 'criarVeiculo', 'atualizarVeiculo', 'removerVeiculo'].includes(acao)
      || (chaves && !Object.keys(p).every(c => chaves.includes(c)))
      || (paginada && (!inteiro(p.pagina) || Number(p.pagina) < 1 || Number(p.pagina) > 100))
      || (acao !== 'veiculos' && acao !== 'criarVeiculo' && !uuid(p.id))
      || (acao === 'criarVeiculo' && !escrita(dados, true)) || (acao === 'atualizarVeiculo' && !escrita(p.dados, false))
      || (acao === 'removerVeiculo' && p.substitutoId !== undefined && !uuid(p.substitutoId))) {
      return { ok: false, status: 400, erro: 'REQUISICAO_INVALIDA' };
    }
    try {
      const acesso = await autorizar(); if (!acesso.ok) return acesso;
      const rota = acao === 'veiculos' ? 'vehicles' : acao === 'instalacoes' ? 'installations'
        : acao === 'configuracoes' ? `installations/${p.id}/configurations`
          : acao === 'criarVeiculo' ? 'vehicles' : `vehicles/${p.id}`;
      const query = paginada ? new URLSearchParams({ page: String(p.pagina), pageSize: '100', ...(acao === 'instalacoes' ? { vehicleId: String(p.id) } : {}) })
        : new URLSearchParams(p.substitutoId ? { replacementVehicleId: String(p.substitutoId) } : {});
      const url = `${base}/${rota}${query.size ? `?${query}` : ''}`;
      const opcoes: RequestInit = { credentials: 'include', redirect: 'error', signal: AbortSignal.timeout(10000) };
      if (!paginada) {
        const csrf = await rede.fetch(`${base}/auth/csrf`, opcoes);
        if (!csrf.ok) return { ok: false, status: csrf.status, erro: 'HTTP' };
        const token = (await csrf.json()).data?.csrfToken;
        if (!texto(token) || !/^[a-f0-9]{64}$/.test(token)) return { ok: false, status: 0, erro: 'RESPOSTA_INVALIDA' };
        opcoes.method = acao === 'criarVeiculo' ? 'POST' : acao === 'atualizarVeiculo' ? 'PATCH' : 'DELETE';
        opcoes.headers = { Origin: 'http://localhost:5174', 'Content-Type': 'application/json', 'x-csrf-token': token };
        if (acao !== 'removerVeiculo') opcoes.body = JSON.stringify(acao === 'criarVeiculo' ? dados : p.dados);
      }
      let resposta = await rede.fetch(url, opcoes);
      if (paginada && resposta.status === 401) {
        const renovacao = await autorizar(); if (!renovacao.ok) return renovacao;
        resposta = await rede.fetch(url, opcoes);
      }
      if (!paginada) await rede.cookies.flushStore();
      if (!resposta.ok) return { ok: false, status: resposta.status, erro: 'HTTP' };
      if (acao === 'removerVeiculo') return resposta.status === 204 ? { ok: true, data: null } : { ok: false, status: 0, erro: 'RESPOSTA_INVALIDA' };
      if (resposta.status !== (acao === 'criarVeiculo' ? 201 : 200)) return { ok: false, status: 0, erro: 'RESPOSTA_INVALIDA' };
      try {
        const corpo = await resposta.json();
        if (!paginada) return { ok: true, data: veiculo(corpo.data) };
        const meta = selecionar(corpo.meta, { page: inteiro, pageSize: inteiro, totalItems: inteiro, totalPages: inteiro }) as unknown as PaginationMeta;
        if (meta.page !== p.pagina || meta.pageSize !== 100 || meta.totalPages !== Math.ceil(meta.totalItems / 100)
          || !Array.isArray(corpo.data) || corpo.data.length > 100) throw new Error('Paginação inválida');
        const converter = acao === 'veiculos' ? veiculo : acao === 'instalacoes' ? instalacao : configuracao;
        const itens = corpo.data.map(converter);
        if (acao === 'instalacoes' && itens.some((i: Installation) => i.vehicleId !== p.id)) throw new Error('Vínculo inválido');
        if (acao === 'configuracoes' && itens.some((i: Configuration) => i.installationId !== p.id)) throw new Error('Vínculo inválido');
        return { ok: true, data: itens, meta };
      } catch { return { ok: false, status: 0, erro: 'RESPOSTA_INVALIDA' }; }
    } catch { return { ok: false, status: 0, erro: 'CONEXAO' }; }
  };
}
