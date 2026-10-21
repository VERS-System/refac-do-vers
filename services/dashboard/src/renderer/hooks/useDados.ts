/**
 * Hooks de dados do app desktop (TanStack Query sobre o repositório).
 *
 * São a única porta das telas para os dados: cuidam de cache, carregamento e
 * erro, e leem o repositório do `RepositorioProvider`. As chaves de consulta
 * ficam em `chavesConsulta` para que invalidações futuras (ex.: dados ao vivo
 * via MQTT) usem os mesmos nomes.
 */

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { janelaEnergia } from '@/data/energia';
import { descreverVeiculo, resumirDispositivo } from '@/data/calculos';
import { useRepositorio, type PeriodoComDias } from '@/data/repositorio';
import type {
  AtualizacaoPerfil,
  AtualizacaoVeiculo,
  Credenciais,
  NovaConta,
  CancelamentoTeste,
  ConsultaTelemetria,
  ConsultaTestes,
  EnvioViber,
  FinalizacaoTeste,
  NovoTeste,
  NovoVeiculo,
} from '@/data/tipos';
import { usePeriodoStore, type Periodo } from '@/stores/periodo';
import { useSelecaoInstalacao } from '@/stores/instalacao';
import { useRecursosTempoReal } from '@/data/ProvedorTempoReal';

export const chavesConsulta = {
  resumoEnergia: (periodo: Periodo) => ['energia', 'resumo', periodo] as const,
  dias: (periodo: PeriodoComDias) => ['energia', 'dias', periodo] as const,
  curvaDoDia: ['energia', 'curva-do-dia'] as const,
  amostrasVibracao: (periodo: Periodo) => ['vibracao', 'amostras', periodo] as const,
  tensaoBateria: ['sistema', 'bateria', 'tensao-hoje'] as const,
  testes: (consulta: ConsultaTestes | null) => ['testes', 'busca', consulta] as const,
  resumoTeste: (testeId: string | null) => ['testes', 'resumo', testeId] as const,
  comparacaoTestes: (testeIds: string[] | null) => ['testes', 'comparacao', testeIds] as const,
  amostrasTelemetria: (consulta: ConsultaTelemetria | null) =>
    ['telemetria', 'amostras', consulta] as const,
  cadeiaAoVivo: ['ao-vivo', 'cadeia'] as const,
  bateria: ['sistema', 'bateria'] as const,
  vibracao: ['sistema', 'vibracao'] as const,
  veiculoAtivo: ['cadastro', 'veiculo-ativo'] as const,
  veiculos: ['cadastro', 'veiculos'] as const,
  instalacao: (veiculoId: string | null) => ['cadastro', 'instalacao', veiculoId] as const,
  configuracoes: (instalacaoId: string | null) =>
    ['cadastro', 'configuracoes', instalacaoId] as const,
  revisoes: ['cadastro', 'revisoes'] as const,
  logs: (dispositivoId: string | null) => ['dispositivo', 'logs', dispositivoId] as const,
  dispositivo: ['cadastro', 'dispositivo'] as const,
  usuarioAtual: ['cadastro', 'usuario-atual'] as const,
};

/** Consulta blocos completos por instalação e período; sem placeholder entre recursos. */
export function useEnergiaInstalacao(instalacaoId: string | null) {
  useRecursosTempoReal(instalacaoId ? [{ type: 'installation', id: instalacaoId }] : []);
  const repositorio = useRepositorio();
  const periodo = usePeriodoStore(estado => estado.periodo);
  const [agora, setAgora] = useState(() => repositorio.agora());
  useEffect(() => {
    const timer = setInterval(() => setAgora(repositorio.agora()), 60000);
    return () => clearInterval(timer);
  }, [repositorio]);
  const janela = janelaEnergia(periodo, agora);
  return useQuery({
    queryKey: ['energia', 'instalacao', instalacaoId, periodo, janela.inicio, janela.fim],
    queryFn: () => repositorio.obterEnergiaInstalacao!(instalacaoId!, janela),
    enabled: instalacaoId !== null && !!repositorio.obterEnergiaInstalacao,
    refetchInterval: 60000,
  });
}

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
 * Dias de um período (Dia, Semana ou Mês), para gráficos de barras e tabelas.
 *
 * Aceita `null` para quando a tela não precisa de dias (a Hora não tem
 * resumo por dia; na Visão geral, o Dia é uma curva): como hooks não podem
 * ser chamados condicionalmente, a tela chama sempre e a consulta só roda
 * (`enabled`) quando há um período.
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
  return useQuery({
    queryKey: chavesConsulta.curvaDoDia,
    queryFn: () => repositorio.obterCurvaDoDia(),
  });
}

/** Leitura ao vivo dos 4 pontos da cadeia de conversão. */
export function useCadeiaAoVivo() {
  const repositorio = useRepositorio();
  return useQuery({
    queryKey: chavesConsulta.cadeiaAoVivo,
    queryFn: () => repositorio.obterCadeiaAoVivo(),
  });
}

export function useBateria() {
  const repositorio = useRepositorio();
  return useQuery({ queryKey: chavesConsulta.bateria, queryFn: () => repositorio.obterBateria() });
}

export function useVibracao() {
  const repositorio = useRepositorio();
  return useQuery({
    queryKey: chavesConsulta.vibracao,
    queryFn: () => repositorio.obterVibracao(),
  });
}

/** Veículo ativo, com a descrição curta usada no subtítulo das telas. */
export function useVeiculoAtivo() {
  const repositorio = useRepositorio();
  return useQuery({
    queryKey: chavesConsulta.veiculoAtivo,
    queryFn: () => repositorio.obterVeiculoAtivo(),
    select: (veiculo) => veiculo ? ({ ...veiculo, descricao: descreverVeiculo(veiculo) }) : null,
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
  const principal = useVeiculoAtivo();
  const instalacao = useInstalacao(principal.data?.id ?? null);
  const consulta = useQuery({
    queryKey: chavesConsulta.dispositivo,
    queryFn: () => repositorio.obterDispositivo(),
    enabled: !repositorio.cadastroReal,
    select: (dispositivo) => dispositivo ? resumirDispositivo(dispositivo, repositorio.agora()) : null,
  });
  if (!repositorio.cadastroReal) return consulta;
  // O dispositivo deriva da mesma instalação autorizada; não há cache paralelo divergente.
  const pendente = principal.isPending || (!!principal.data && instalacao.isPending);
  return { ...instalacao, isPending: pendente, isError: principal.isError || (!!principal.data && instalacao.isError),
    data: pendente ? undefined : instalacao.data?.dispositivo ? resumirDispositivo(instalacao.data.dispositivo, repositorio.agora()) : null };
}

export function useUsuarioAtual() {
  const repositorio = useRepositorio();
  return useQuery({
    queryKey: chavesConsulta.usuarioAtual,
    queryFn: () => repositorio.obterUsuarioAtual(),
  });
}

/** Amostras de vibração × potência do período global (dispersão da Energia). */
export function useAmostrasVibracao() {
  const repositorio = useRepositorio();
  const periodo = usePeriodoStore((estado) => estado.periodo);
  return useQuery({
    queryKey: chavesConsulta.amostrasVibracao(periodo),
    queryFn: () => repositorio.obterAmostrasVibracao(periodo),
  });
}

/** Tensão e carga da bateria ao longo de hoje (não depende do período). */
export function useTensaoBateria() {
  const repositorio = useRepositorio();
  return useQuery({
    queryKey: chavesConsulta.tensaoBateria,
    queryFn: () => repositorio.obterTensaoBateria(),
  });
}

/**
 * Busca de testes de campo (lista da tela Testes e seletor da Telemetria).
 *
 * Aceita `null` para não consultar. Mantém a página anterior na tela
 * enquanto a nova chega, para a tabela não piscar ao paginar.
 */
export function useTestes(consulta: ConsultaTestes | null) {
  const repositorio = useRepositorio();
  return useQuery({
    queryKey: chavesConsulta.testes(consulta),
    queryFn: () => repositorio.buscarTestes(consulta!),
    enabled: consulta !== null,
    placeholderData: keepPreviousData,
  });
}

/** Resumo de energia de um teste encerrado (`null` para não consultar). */
export function useResumoTeste(testeId: string | null) {
  useRecursosTempoReal(testeId ? [{ type: 'test', id: testeId }] : []);
  const repositorio = useRepositorio();
  return useQuery({
    queryKey: chavesConsulta.resumoTeste(testeId),
    queryFn: () => repositorio.obterResumoTeste(testeId!),
    enabled: testeId !== null,
  });
}

/** Comparação dos testes escolhidos (`null` enquanto o usuário não pede). */
export function useComparacaoTestes(testeIds: string[] | null) {
  useRecursosTempoReal((testeIds ?? []).map(id => ({ type: 'test', id })));
  const repositorio = useRepositorio();
  return useQuery({
    queryKey: chavesConsulta.comparacaoTestes(testeIds),
    queryFn: () => repositorio.compararTestes(testeIds!),
    enabled: testeIds !== null,
  });
}

/**
 * Ações sobre testes: planejar, iniciar, finalizar e cancelar.
 *
 * Cada uma chama o repositório e, só depois da resposta, refaz as consultas
 * de testes (e de telemetria, que depende do teste em andamento): a tela
 * nunca antecipa a transição, como pede a task D08. Erros (conflito,
 * transição inválida) ficam na própria mutação, para o diálogo mostrar.
 */
export function useAcoesTeste() {
  const repositorio = useRepositorio();
  const cliente = useQueryClient();
  const atualizar = () =>
    Promise.all([
      cliente.invalidateQueries({ queryKey: ['testes'] }),
      cliente.invalidateQueries({ queryKey: ['telemetria'] }),
      cliente.invalidateQueries({ queryKey: ['energia'] }),
    ]);

  const criar = useMutation({
    mutationFn: (novo: NovoTeste) => repositorio.criarTeste(novo),
    onSuccess: atualizar,
  });
  const iniciar = useMutation({
    mutationFn: (testeId: string) => repositorio.iniciarTeste(testeId),
    onSuccess: atualizar,
  });
  const finalizar = useMutation({
    mutationFn: ({ testeId, ...finalizacao }: FinalizacaoTeste & { testeId: string }) =>
      repositorio.finalizarTeste(testeId, finalizacao),
    onSuccess: atualizar,
  });
  const cancelar = useMutation({
    mutationFn: ({ testeId, ...cancelamento }: CancelamentoTeste & { testeId: string }) =>
      repositorio.cancelarTeste(testeId, cancelamento),
    onSuccess: atualizar,
  });
  return { criar, iniciar, finalizar, cancelar };
}

export interface OpcoesAmostrasTelemetria {
  /** Intervalo da atualização ao vivo, em ms; `false` (padrão) não repete. */
  intervaloMs?: number | false;
}

/**
 * Página de amostras de telemetria da consulta.
 *
 * Aceita `null` enquanto não há teste escolhido (a consulta não roda). Com
 * `intervaloMs`, repete a consulta periodicamente (o "Ao vivo"). Ao trocar de
 * página ou de filtro, mantém os dados anteriores na tela até os novos
 * chegarem, para a tabela não piscar.
 */
export function useAmostrasTelemetria(
  consulta: ConsultaTelemetria | null,
  opcoes: OpcoesAmostrasTelemetria = {},
) {
  useRecursosTempoReal(consulta && opcoes.intervaloMs !== false ? [{ type: 'test', id: consulta.testeId }] : []);
  const repositorio = useRepositorio();
  return useQuery({
    queryKey: chavesConsulta.amostrasTelemetria(consulta),
    meta: { tempoReal: opcoes.intervaloMs !== false },
    queryFn: () => repositorio.obterAmostrasTelemetria(consulta!),
    enabled: consulta !== null,
    refetchInterval: opcoes.intervaloMs ?? false,
    // Só a página pode mudar sem apagar a leitura anterior; outro recurso/filtro exige sua própria resposta.
    placeholderData: (anterior, consultaAnterior) => {
      const antes = consultaAnterior?.queryKey[2] as ConsultaTelemetria | null | undefined;
      return consulta && antes && consulta.testeId === antes.testeId && consulta.qualidade === antes.qualidade &&
        consulta.de === antes.de && consulta.ate === antes.ate ? anterior : undefined;
    },
  });
}

/** Veículos do usuário, com o principal marcado. */
export function useVeiculos() {
  const repositorio = useRepositorio();
  return useQuery({
    queryKey: chavesConsulta.veiculos,
    queryFn: () => repositorio.obterVeiculos(),
  });
}

/** Instalação do VERS no veículo (`null` para não consultar; resposta `null` se não houver). */
export function useInstalacao(veiculoId: string | null) {
  const repositorio = useRepositorio();
  const escolhido = useSelecaoInstalacao(estado => estado.escolhas[veiculoId ?? '']);
  const consulta = useQuery({
    queryKey: chavesConsulta.instalacao(veiculoId),
    queryFn: async () => {
      if (repositorio.listarInstalacoes) return repositorio.listarInstalacoes(veiculoId!);
      const unica = await repositorio.obterInstalacao(veiculoId!);
      return unica ? [unica] : [];
    },
    enabled: veiculoId !== null,
  });
  const opcoes = consulta.data ?? [];
  const selecionada = opcoes.length === 1 ? opcoes[0] : opcoes.find(i => i.id === escolhido) ?? null;
  return { ...consulta, data: consulta.data === undefined ? undefined : selecionada,
    opcoes, precisaEscolher: opcoes.length > 1 && !selecionada };
}

/** Versões da configuração da instalação, da mais recente para a mais antiga; sem inferir ativa. */
export function useConfiguracoes(instalacaoId: string | null) {
  const repositorio = useRepositorio();
  return useQuery({
    queryKey: chavesConsulta.configuracoes(instalacaoId),
    queryFn: () => repositorio.obterConfiguracoes(instalacaoId!),
    enabled: instalacaoId !== null,
  });
}

/** Solicitações de revisão do sistema, da mais recente para a mais antiga. */
export function useRevisoes() {
  const repositorio = useRepositorio();
  return useQuery({
    queryKey: chavesConsulta.revisoes,
    queryFn: () => repositorio.obterRevisoes(),
  });
}

/** Log do dispositivo (`null` para não consultar, por exemplo com o diálogo fechado). */
export function useLogsDispositivo(dispositivoId: string | null) {
  const repositorio = useRepositorio();
  return useQuery({
    queryKey: chavesConsulta.logs(dispositivoId),
    queryFn: () => repositorio.obterLogsDispositivo(dispositivoId!),
    enabled: dispositivoId !== null,
  });
}

/**
 * Ações de cadastro de veículos: adicionar, editar (inclusive tornar
 * principal) e remover. Depois da resposta, refaz as consultas de cadastro, o que
 * atualiza também o veículo dos subtítulos das telas.
 */
export function useAcoesVeiculo() {
  const repositorio = useRepositorio();
  const cliente = useQueryClient();
  const atualizarCadastro = () => cliente.invalidateQueries({ queryKey: ['cadastro'] });

  const criar = useMutation({
    mutationFn: (novo: NovoVeiculo) => repositorio.criarVeiculo(novo),
    onSuccess: atualizarCadastro,
  });
  const atualizar = useMutation({
    mutationFn: ({ veiculoId, ...atualizacao }: AtualizacaoVeiculo & { veiculoId: string }) =>
      repositorio.atualizarVeiculo(veiculoId, atualizacao),
    onSuccess: atualizarCadastro,
  });
  const remover = useMutation({
    mutationFn: ({ veiculoId, substitutoId }: { veiculoId: string; substitutoId?: string }) =>
      repositorio.removerVeiculo(veiculoId, substitutoId),
    onSuccess: atualizarCadastro,
  });
  return { criar, atualizar, remover };
}

/** Contextos autorizados para a conversa com o Viber. */
export function useContextosViber() {
  const repositorio = useRepositorio();
  return useQuery({
    queryKey: ['viber', 'contextos'],
    queryFn: () => repositorio.obterContextosViber(),
  });
}

/** Conversas com o Viber, da mais recente para a mais antiga. */
export function useConversasViber() {
  const repositorio = useRepositorio();
  return useQuery({
    queryKey: ['viber', 'conversas'],
    queryFn: () => repositorio.obterConversasViber(),
  });
}

/** Mensagens de uma conversa (`null` para não consultar). */
export function useMensagensViber(conversaId: string | null) {
  const repositorio = useRepositorio();
  return useQuery({
    queryKey: ['viber', 'mensagens', conversaId],
    queryFn: () => repositorio.obterMensagensViber(conversaId!),
    enabled: conversaId !== null,
  });
}

/**
 * Ações da conversa: enviar uma mensagem e criar uma conversa nova. Depois
 * da resposta, refaz as consultas do Viber (mensagens e lista de conversas).
 */
export function useAcoesViber() {
  const repositorio = useRepositorio();
  const cliente = useQueryClient();
  const atualizar = () => cliente.invalidateQueries({ queryKey: ['viber'] });
  const enviar = useMutation({
    mutationFn: (envio: EnvioViber) => repositorio.enviarMensagemViber(envio),
    onSuccess: atualizar,
  });
  const nova = useMutation({
    mutationFn: () => repositorio.criarConversaViber(),
    onSuccess: atualizar,
  });
  return { enviar, nova };
}

/**
 * Ações da conta: editar o perfil (nome e foto) e encerrar todas as
 * sessões. Salvar o perfil refaz as consultas de cadastro, o que atualiza a
 * sidebar.
 */
export function useAcoesPerfil() {
  const repositorio = useRepositorio();
  const cliente = useQueryClient();
  const atualizar = useMutation({
    mutationFn: (atualizacao: AtualizacaoPerfil) => repositorio.atualizarPerfil(atualizacao),
    onSuccess: () => cliente.invalidateQueries({ queryKey: ['cadastro'] }),
  });
  const encerrarSessoes = useMutation({ mutationFn: () => repositorio.encerrarSessoes() });
  return { atualizar, encerrarSessoes };
}

/**
 * Ações públicas de autenticação: entrar e criar conta. Ficam fora do cache
 * de consultas (não há dado de tela para invalidar); a tela decide o que
 * fazer com a resposta ou a recusa.
 */
export function useAcoesAutenticacao() {
  const repositorio = useRepositorio();
  const entrar = useMutation({
    mutationFn: (credenciais: Credenciais) => repositorio.entrar(credenciais),
  });
  const registrar = useMutation({ mutationFn: (conta: NovaConta) => repositorio.registrar(conta) });
  return { entrar, registrar };
}
