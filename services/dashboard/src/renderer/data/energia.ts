/** Recorta calendários de Brasília e confere cobertura sem recalcular medições do backend. */
import type { EnergySummary, PaginationMeta } from '@vers/shared-types';
import type { Periodo } from '../stores/periodo';
import { isoBrasilia } from '../lib/brasilia';
import { gerarCsv } from '../lib/csv';
import { formatarNumero } from '../lib/format';
import { ErroRepositorio } from './erros';

const HORA = 3600000;
const DIA = 24 * HORA;
export interface JanelaEnergia { periodo: Periodo; inicio: string; fim: string; horas: number }
export interface LinhaEnergia { inicio: string; fim: string; resumo: EnergySummary | null }
export interface EnergiaInstalacao {
  instalacaoId: string; janela: JanelaEnergia; linhas: LinhaEnergia[];
  energiaWh: number | null; boas: number; parciais: number; invalidas: number; ausentes: number;
}

/** Encontra o primeiro instante do dia civil, inclusive quando o horário de verão suprime meia-noite. */
function inicioDoDia(data: string): number {
  const calendario = Date.parse(`${data}T00:00:00.000Z`);
  let esquerda = calendario - 36 * HORA; let direita = calendario + 36 * HORA;
  while (esquerda < direita) {
    const meio = Math.floor((esquerda + direita) / 2);
    if (isoBrasilia(new Date(meio).toISOString()).slice(0, 10) < data) esquerda = meio + 1;
    else direita = meio;
  }
  return esquerda;
}

/** Usa limites civis para dia/mês/semana e exclui sempre a hora UTC em curso. */
export function janelaEnergia(periodo: Periodo, agora: Date): JanelaEnergia {
  if (!Number.isFinite(agora.getTime())) throw new ErroRepositorio('validacao', 'Relógio inválido.');
  const data = isoBrasilia(agora.toISOString()).slice(0, 10);
  let fim = Math.floor(agora.getTime() / HORA) * HORA;
  let inicio: number;
  if (periodo === 'hora') inicio = fim - HORA;
  else if (periodo === 'dia') inicio = inicioDoDia(data);
  else if (periodo === 'mes') inicio = inicioDoDia(`${data.slice(0, 7)}-01`);
  else if (periodo === 'semana') {
    const civil = new Date(`${data}T00:00:00.000Z`);
    civil.setUTCDate(civil.getUTCDate() - (civil.getUTCDay() + 6) % 7);
    fim = inicioDoDia(civil.toISOString().slice(0, 10));
    civil.setUTCDate(civil.getUTCDate() - 7);
    inicio = inicioDoDia(civil.toISOString().slice(0, 10));
  } else throw new ErroRepositorio('validacao', 'Período inválido.');
  return { periodo, inicio: new Date(inicio).toISOString(), fim: new Date(fim).toISOString(), horas: (fim - inicio) / HORA };
}

/** Busca páginas completas e estáveis, recusa sobreposição e mantém cada hora ausente explícita. */
export async function carregarEnergia(instalacaoId: string, janela: JanelaEnergia,
  ler: (pagina: number) => Promise<{ data: EnergySummary[]; meta?: PaginationMeta }>): Promise<EnergiaInstalacao> {
  const inicio = Date.parse(janela.inicio); const fim = Date.parse(janela.fim);
  if (!Number.isFinite(inicio) || !Number.isFinite(fim) || inicio % HORA !== 0 || fim % HORA !== 0 || fim < inicio ||
    fim - inicio > 32 * DIA || janela.horas !== (fim - inicio) / HORA) throw new ErroRepositorio('validacao', 'Janela horária inválida.');
  const blocos = new Map<string, EnergySummary>(); const ids = new Set<string>(); let total = -1;
  if (janela.horas > 0) for (let pagina = 1; pagina <= 8; pagina++) {
    const r = await ler(pagina); const m = r.meta;
    if (!m || !Number.isSafeInteger(m.totalItems) || m.totalItems < 0 || m.totalItems > janela.horas ||
      m.page !== pagina || m.pageSize !== 100 || m.totalPages !== Math.ceil(m.totalItems / 100) ||
      (total !== -1 && total !== m.totalItems) || r.data.length !== Math.min(100, Math.max(0, m.totalItems - (pagina - 1) * 100)))
      throw new ErroRepositorio('indisponivel', 'Resumos alterados ou incompletos. Atualize a consulta.');
    total = m.totalItems;
    for (const b of r.data) {
      const de = Date.parse(b.periodStart); const ate = Date.parse(b.periodEnd);
      const chave = Number.isFinite(de) ? new Date(de).toISOString() : '';
      if (b.installationId !== instalacaoId || b.testId !== null || b.periodType !== 'HOUR' ||
        !Number.isFinite(de) || de % HORA !== 0 || ate - de !== HORA || de < inicio || ate > fim ||
        !Number.isFinite(b.recoveredEnergyWh) || b.recoveredEnergyWh < 0 ||
        !['GOOD', 'PARTIAL', 'INVALID'].includes(b.quality) || !Number.isSafeInteger(b.sampleCount) || b.sampleCount < 0 ||
        (b.quality !== 'INVALID' && b.sampleCount === 0) || ids.has(b.id) || blocos.has(chave))
        throw new ErroRepositorio('indisponivel', 'Resumo horário inconsistente. Atualize a consulta.');
      ids.add(b.id); blocos.set(chave, b);
    }
    if (pagina >= m.totalPages) break;
  }
  const linhas = Array.from({ length: janela.horas }, (_, i) => {
    const de = new Date(inicio + i * HORA).toISOString();
    return { inicio: de, fim: new Date(inicio + (i + 1) * HORA).toISOString(), resumo: blocos.get(de) ?? null };
  });
  const utilizaveis = [...blocos.values()].filter(b => b.quality !== 'INVALID');
  const energiaWh = utilizaveis.length ? utilizaveis.reduce((soma, b) => soma + b.recoveredEnergyWh, 0) : null;
  if (energiaWh !== null && !Number.isFinite(energiaWh)) throw new ErroRepositorio('indisponivel', 'Energia fora do intervalo de apresentação.');
  return { instalacaoId, janela, linhas, energiaWh, boas: utilizaveis.filter(b => b.quality === 'GOOD').length,
    parciais: utilizaveis.filter(b => b.quality === 'PARTIAL').length,
    invalidas: [...blocos.values()].filter(b => b.quality === 'INVALID').length, ausentes: janela.horas - blocos.size };
}

/** Identifica qualidade sem confundir bloco inválido ou ausente com energia medida zero. */
export function qualidadeBloco(linha: LinhaEnergia): string {
  return linha.resumo === null ? 'Ausente' : ({ GOOD: 'Boa', PARTIAL: 'Parcial', INVALID: 'Inválida' } as const)[linha.resumo.quality];
}

/** Exporta todas as horas da janela, com fuso, unidades explícitas e métricas inválidas vazias. */
export function csvEnergia(r: EnergiaInstalacao): string {
  return gerarCsv(['Instalação', 'Início (America/Sao_Paulo)', 'Fim exclusivo (America/Sao_Paulo)', 'Qualidade',
    'Energia recuperada (Wh)', 'Potência média (W)', 'Pico de potência (W)', 'Amostras do bloco', 'Calculado em (UTC)'],
  r.linhas.map(l => {
    const b = l.resumo; const valido = b && b.quality !== 'INVALID';
    return [r.instalacaoId, isoBrasilia(l.inicio), isoBrasilia(l.fim), qualidadeBloco(l),
      valido ? formatarNumero(b.recoveredEnergyWh, 6) : '', valido && b.averagePowerW !== null ? formatarNumero(b.averagePowerW, 6) : '',
      valido && b.peakPowerW !== null ? formatarNumero(b.peakPowerW, 6) : '', b ? String(b.sampleCount) : '', b?.calculatedAt ?? ''];
  }));
}
