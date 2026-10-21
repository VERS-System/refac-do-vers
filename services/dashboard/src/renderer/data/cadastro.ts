/** Adapta cadastro autorizado, preservando nulos e carregando todas as páginas. */
import type { Vehicle, Installation, Configuration, PublicDevice } from '@vers/shared-types';
import type { PonteCadastro, ResultadoCadastro } from '../../shared/cadastro';
import { ErroRepositorio } from './erros';
import type { Veiculo, Instalacao, Configuracao, Dispositivo, NovoVeiculo, AtualizacaoVeiculo } from './tipos';
import { useSelecaoInstalacao } from '../stores/instalacao';

/** Traduz exclusivamente campos existentes do veículo público. */
function converterVeiculo(v: Vehicle): Veiculo {
  return { id: v.id, placa: v.licensePlate, fabricante: v.brand, modelo: v.model, ano: v.modelYear,
    relacao: ({ OWNER: 'proprietario', DRIVER: 'motorista', ADMIN: 'administrador' } as const)[v.relationship],
    principal: v.isPrimary, criadoEm: v.createdAt };
}

/** Usa rótulos de ausência para textos e preserva último contato desconhecido como null. */
function converterDispositivo(d: PublicDevice): Dispositivo {
  return { id: d.id, nome: d.name ?? 'Dispositivo sem nome', plataforma: 'Não informada',
    firmware: d.firmwareVersion ?? 'Não informado', protocolo: 'Não informado',
    online: d.status === 'ONLINE', status: d.status, ultimoContato: d.lastSeenAt };
}

/** Converte instalação sem completar dispositivo ou data ausentes. */
function converterInstalacao(i: Installation): Instalacao {
  return { id: i.id, veiculoId: i.vehicleId, modelo: i.systemModel,
    status: ({ ACTIVE: 'ativa', MAINTENANCE: 'manutencao', INACTIVE: 'inativa', FAULT: 'falha' } as const)[i.status],
    instaladaEm: i.installedAt?.slice(0, 10) ?? null, dispositivo: i.activeDevice ? converterDispositivo(i.activeDevice) : null };
}

/** O total e posições inativas não existem no contrato; null impede topologia fictícia. */
function converterConfiguracao(c: Configuration): Configuracao {
  return { id: c.id, instalacaoId: c.installationId, nome: c.name, versao: c.version,
    piezosAtivos: c.activePiezoCount, piezosTotal: null, piezosInativos: null,
    associacao: ({ SERIES: 'serie', PARALLEL: 'paralelo', MIXED: 'misto' } as const)[c.piezoAssociation],
    pontoInstalacao: c.installationPoint,
    armazenamento: ({ BATTERY: 'bateria', SUPERCAPACITOR: 'supercapacitor', CAPACITOR: 'capacitor', NONE: 'nenhum' } as const)[c.storageType],
    observacoes: c.notes, criadaEm: c.createdAt };
}

/** Executa ações fixas sem fallback; expiração encerra a identidade da aplicação. */
export function criarCadastro(ponte: PonteCadastro | undefined, expirar: () => void) {
  /** Traduz falhas IPC/HTTP sem devolver mensagens internas ou repetir mutações. */
  async function chamar<T>(acao: () => Promise<ResultadoCadastro<T>>): Promise<Extract<ResultadoCadastro<T>, { ok: true }>> {
    let r: ResultadoCadastro<T>;
    try { if (!ponte) throw new Error(); r = await acao(); }
    catch { throw new ErroRepositorio('indisponivel', 'Não foi possível comunicar com a API local.'); }
    if (r.ok) return r;
    if (r.status === 401) { expirar(); throw new ErroRepositorio('sessao-expirada', 'Sua sessão expirou. Entre de novo.'); }
    if (r.status === 404) throw new ErroRepositorio('nao-encontrado', 'Recurso indisponível para esta conta.');
    if (r.status === 409) throw new ErroRepositorio('conflito', 'A operação entrou em conflito com o cadastro atual. Confira os dados.');
    if (r.status === 403) throw new ErroRepositorio('acesso-negado', 'A operação não foi autorizada.');
    if (r.status === 429) throw new ErroRepositorio('limite-tentativas', 'Muitas solicitações. Aguarde e tente de novo.');
    if ([400, 422].includes(r.status)) throw new ErroRepositorio('validacao', 'Confira os campos informados.');
    throw new ErroRepositorio('indisponivel', 'Não foi possível consultar a API local.');
  }

  /** Completa paginação com limite de 10 mil itens e recusa snapshots inconsistentes. */
  async function todas<T extends { id: string }>(ler: (pagina: number) => Promise<ResultadoCadastro<T[]>>): Promise<T[]> {
    const itens: T[] = []; let total = -1;
    for (let pagina = 1; pagina <= 100; pagina++) {
      const r = await chamar(() => ler(pagina)); const meta = r.meta;
      if (!meta || meta.page !== pagina || meta.pageSize !== 100 || meta.totalPages > 100
        || meta.totalPages !== Math.ceil(meta.totalItems / 100) || (total !== -1 && meta.totalItems !== total)
        || r.data.length !== Math.min(100, Math.max(0, meta.totalItems - (pagina - 1) * 100))) {
        throw new ErroRepositorio('indisponivel', 'A lista mudou ou excedeu o limite de 10 mil itens. Atualize a consulta.');
      }
      total = meta.totalItems; itens.push(...r.data);
      if (pagina >= meta.totalPages) {
        if (new Set(itens.map(i => i.id)).size !== itens.length || itens.length !== total) throw new ErroRepositorio('indisponivel', 'A lista recebida está incompleta. Atualize a consulta.');
        return itens;
      }
    }
    throw new ErroRepositorio('indisponivel', 'Limite de paginação atingido.');
  }

  /** Lista veículos próprios antes de resolver principal ou mutações relacionadas. */
  const obterVeiculos = async () => (await todas(pagina => ponte!.veiculos(pagina))).map(converterVeiculo);
  /** Retorna ausência de principal sem selecionar primeiro registro implicitamente. */
  const obterVeiculoAtivo = async () => {
    const principais = (await obterVeiculos()).filter(v => v.principal);
    if (principais.length > 1) throw new ErroRepositorio('conflito', 'Há mais de um veículo principal. Atualize o cadastro.');
    return principais[0] ?? null;
  };
  /** Lista instalações completas, sem escolher automaticamente entre múltiplas. */
  const listarInstalacoes = async (id: string) => (await todas(pagina => ponte!.instalacoes(id, pagina))).map(converterInstalacao);
  /** Resolve a única instalação ou a escolha explícita ainda presente na lista autorizada. */
  const obterInstalacao = async (id: string, escolhas = useSelecaoInstalacao.getState().escolhas) => {
    const escolha = escolhas[id];
    const lista = await listarInstalacoes(id);
    return lista.length === 1 ? lista[0] : lista.find(i => i.id === escolha) ?? null;
  };
  return {
    cadastroReal: true,
    obterVeiculos, obterVeiculoAtivo, listarInstalacoes, obterInstalacao,
    /** Cadastra omitindo descrições nulas, pois null é permitido somente na edição. */
    criarVeiculo: async (n: NovoVeiculo) => converterVeiculo((await chamar(() => ponte!.criarVeiculo({ licensePlate: n.placa,
      ...(n.fabricante ? { brand: n.fabricante } : {}), ...(n.modelo ? { model: n.modelo } : {}), ...(n.ano != null ? { modelYear: n.ano } : {}) }))).data),
    /** Preserva null para limpar campos e omissão para manter valores anteriores. */
    atualizarVeiculo: async (id: string, a: AtualizacaoVeiculo) => converterVeiculo((await chamar(() => ponte!.atualizarVeiculo(id, {
      ...(a.fabricante !== undefined ? { brand: a.fabricante } : {}), ...(a.modelo !== undefined ? { model: a.modelo } : {}),
      ...(a.ano !== undefined ? { modelYear: a.ano } : {}), ...(a.principal !== undefined ? { isPrimary: a.principal } : {}),
    }))).data),
    /** Confirma desvinculação no servidor, incluindo eventual substituto do principal. */
    removerVeiculo: async (id: string, substituto?: string) => { await chamar(() => ponte!.removerVeiculo(id, substituto)); },
    /** Lista todas as versões, sem inferir atividade da versão mais recente. */
    obterConfiguracoes: async (id: string) => (await todas(pagina => ponte!.configuracoes(id, pagina))).map(converterConfiguracao),
    /** Resolve dispositivo apenas da instalação escolhida do principal atual. */
    obterDispositivo: async () => {
      const escolhas = useSelecaoInstalacao.getState().escolhas;
      const v = await obterVeiculoAtivo(); if (!v) return null;
      return (await obterInstalacao(v.id, escolhas))?.dispositivo ?? null;
    },
  };
}
