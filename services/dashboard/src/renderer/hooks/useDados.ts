/**
 * Hooks de dados do app desktop (TanStack Query sobre o repositório).
 *
 * São a única porta das telas para os dados: cuidam de cache, carregamento e
 * erro, e leem o repositório do `RepositorioProvider`. As chaves de consulta
 * ficam em `chavesConsulta` para que invalidações futuras (ex.: dados ao vivo
 * via MQTT) usem os mesmos nomes.
 */

import { useQuery } from '@tanstack/react-query';
import { descreverVeiculo, resumirDispositivo } from '@/data/calculos';
import { useRepositorio, type PeriodoComDias } from '@/data/repositorio';
import { usePeriodoStore, type Periodo } from '@/stores/periodo';

export const chavesConsulta = {
  resumoEnergia: (periodo: Periodo) => ['energia', 'resumo', periodo] as const,
  dias: (periodo: PeriodoComDias) => ['energia', 'dias', periodo] as const,
  curvaDoDia: ['energia', 'curva-do-dia'] as const,
  cadeiaAoVivo: ['ao-vivo', 'cadeia'] as const,
  bateria: ['sistema', 'bateria'] as const,
  vibracao: ['sistema', 'vibracao'] as const,
  veiculoAtivo: ['cadastro', 'veiculo-ativo'] as const,
  dispositivo: ['cadastro', 'dispositivo'] as const,
  usuarioAtual: ['cadastro', 'usuario-atual'] as const,
};

/**
 * Resumo de energia de um período.
 *
 * Sem argumento segue o período global da barra superior; com argumento usa
 * o período fixo (ex.: o KPI "Energia recuperada hoje" é sempre do dia).
 */
export function useResumoEnergia(periodoFixo?: Periodo) {
  const repositorio = useRepositorio();
  const periodoGlobal = usePeriodoStore((estado) => estado.periodo);
  const periodo = periodoFixo ?? periodoGlobal;
  return useQuery({
    queryKey: chavesConsulta.resumoEnergia(periodo),
    queryFn: () => repositorio.obterResumoEnergia(periodo),
  });
}

/**
 * Dias de um período (Semana ou Mês), para gráficos de barras e tabelas.
 *
 * Aceita `null` porque Hora e Dia não se dividem em dias: como hooks não
 * podem ser chamados condicionalmente, a tela chama sempre e a consulta só
 * roda (`enabled`) quando há um período com dias.
 */
export function useDiasDoPeriodo(periodo: PeriodoComDias | null) {
  const repositorio = useRepositorio();
  return useQuery({
    queryKey: chavesConsulta.dias(periodo ?? 'semana'),
    queryFn: () => repositorio.obterDias(periodo ?? 'semana'),
    enabled: periodo !== null,
  });
}

/** Curva de potência de hoje (gráfico "Energia recuperada x consumo"). */
export function useCurvaDoDia() {
  const repositorio = useRepositorio();
  return useQuery({ queryKey: chavesConsulta.curvaDoDia, queryFn: () => repositorio.obterCurvaDoDia() });
}

/** Leitura ao vivo dos 4 pontos da cadeia de conversão. */
export function useCadeiaAoVivo() {
  const repositorio = useRepositorio();
  return useQuery({ queryKey: chavesConsulta.cadeiaAoVivo, queryFn: () => repositorio.obterCadeiaAoVivo() });
}

export function useBateria() {
  const repositorio = useRepositorio();
  return useQuery({ queryKey: chavesConsulta.bateria, queryFn: () => repositorio.obterBateria() });
}

export function useVibracao() {
  const repositorio = useRepositorio();
  return useQuery({ queryKey: chavesConsulta.vibracao, queryFn: () => repositorio.obterVibracao() });
}

/** Veículo ativo, com a descrição curta usada no subtítulo das telas. */
export function useVeiculoAtivo() {
  const repositorio = useRepositorio();
  return useQuery({
    queryKey: chavesConsulta.veiculoAtivo,
    queryFn: () => repositorio.obterVeiculoAtivo(),
    select: (veiculo) => ({ ...veiculo, descricao: descreverVeiculo(veiculo) }),
  });
}

/**
 * Dispositivo pronto para o card da sidebar.
 *
 * O "visto há" é calculado com o relógio do repositório no momento da
 * leitura, para que o exemplo use o relógio fixo e a API o relógio real.
 */
export function useDispositivo() {
  const repositorio = useRepositorio();
  return useQuery({
    queryKey: chavesConsulta.dispositivo,
    queryFn: () => repositorio.obterDispositivo(),
    select: (dispositivo) => resumirDispositivo(dispositivo, repositorio.agora()),
  });
}

export function useUsuarioAtual() {
  const repositorio = useRepositorio();
  return useQuery({ queryKey: chavesConsulta.usuarioAtual, queryFn: () => repositorio.obterUsuarioAtual() });
}
