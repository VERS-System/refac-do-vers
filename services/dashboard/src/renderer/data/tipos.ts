/**
 * Tipos do domínio de dados do app desktop do VERS.
 *
 * Descrevem o formato que o repositório entrega às telas, seja a
 * implementação de exemplo (fixtures) ou, no futuro, a API real. Energias
 * estão sempre em mWh, potências em mW, tensões em V, correntes em mA e
 * percentuais na escala 0 a 100. Datas usam o formato ISO `AAAA-MM-DD` e
 * horários `HH:MM`.
 */

import type { Periodo } from '@/stores/periodo';

/** Data no formato `AAAA-MM-DD`. */
export type DataISO = string;

/** Horário no formato `HH:MM`. */
export type Horario = string;

/**
 * Energia medida em cada um dos 4 pontos da cadeia de conversão, em mWh:
 * P1 nó piezoelétrico, P2 saída do LTC3588, P3 bateria (TP4056) e P4 celular.
 */
export interface EnergiaPorPonto {
  p1: number;
  p2: number;
  p3: number;
  p4: number;
}

/** Pico de potência de um período. */
export interface PicoPotencia {
  potenciaMw: number;
  data: DataISO;
  horario?: Horario;
}

/** Medição bruta consolidada de um dia (como o backend guardaria). */
export interface DiaMedido {
  data: DataISO;
  horasMovimento: number;
  pico: { potenciaMw: number; horario?: Horario };
  energia: EnergiaPorPonto;
  /** Percentual de amostras perdidas no dia (0 = dados completos). */
  lacunasPercentual: number;
}

/** Dia com os valores derivados exibidos na tabela "Resumo por dia". */
export interface ResumoDia extends DiaMedido {
  potenciaMediaMw: number | null;
  eficienciaPercentual: number | null;
}

/** Perda percentual em cada estágio da conversão (valores positivos). */
export interface PerdasConversao {
  /** De P1 para P2 (retificação e step-down no LTC3588). */
  regulador: number;
  /** De P2 para P3 (carga da bateria no TP4056). */
  bateria: number;
  /** De P3 para P4 (entrega ao celular). */
  celular: number;
}

/** Comparação do período com uma referência. */
export interface ComparacaoEnergia {
  referencia: 'semana-anterior' | 'media-semanal';
  variacaoPercentual: number;
}

/** Resumo de energia de um período (Hora, Dia, Semana ou Mês). */
export interface ResumoEnergia {
  periodo: Periodo;
  inicio: DataISO;
  fim: DataISO;
  diasComDados: number;
  diasComLacunas: number;
  horasMovimento: number;
  /** Energia recuperada no nó piezoelétrico (P1). */
  energiaRecuperadaMwh: number;
  /** Energia por ponto; ausente quando o período não tem esse detalhe (Hora). */
  porPonto?: EnergiaPorPonto;
  /** Energia recuperada dividida pelas horas em movimento. */
  potenciaMediaMw: number | null;
  pico: PicoPotencia | null;
  /** Eficiência ponta a ponta (P4 / P1). */
  eficienciaPercentual: number | null;
  perdas: PerdasConversao | null;
  comparacao?: ComparacaoEnergia;
}

/** Um ponto da curva diária (média de um minuto). */
export interface PontoCurva {
  horario: Horario;
  recuperadaMw: number;
  consumoNoMw: number;
}

/** Curva de potência do dia até o momento atual. */
export interface CurvaDoDia {
  data: DataISO;
  /** Intervalo entre pontos da curva, em minutos. */
  intervaloMinutos: number;
  /** Intervalo de aquisição do ESP32, em segundos. */
  intervaloAquisicaoS: number;
  pontos: PontoCurva[];
}

/** Medição instantânea de um ponto da cadeia de conversão. */
export interface PontoConversao {
  ponto: 1 | 2 | 3 | 4;
  nome: string;
  descricao: string;
  tensaoV: number;
  correnteMa: number;
  potenciaMw: number;
  /** Eficiência do estágio (P atual / P anterior); nula no ponto 1. */
  eficienciaEstagioPercentual: number | null;
}

/** Leitura ao vivo dos 4 pontos da cadeia de conversão. */
export interface CadeiaConversao {
  /** Momento da leitura (ISO 8601). */
  capturadaEm: string;
  pontos: PontoConversao[];
  /** Eficiência instantânea ponta a ponta (P4 / P1). */
  eficienciaPontaAPontaPercentual: number | null;
}

export interface Bateria {
  quimica: string;
  tensaoNominalV: number;
  capacidadeMah: number;
  estado: 'carregando' | 'descarregando' | 'ociosa';
  cargaPercentual: number;
  tensaoV: number;
  ciclos: number;
  temperaturaC: number;
}

export interface Vibracao {
  rmsMs2: number;
  eixo: string;
  /** Classificação calculada pelo backend. */
  faixa: 'baixa' | 'normal' | 'alta';
  piezosAtivos: number;
  piezosTotal: number;
  frequenciaDominanteHz: number;
  temperaturaBlocoC: number;
}

/** Relação do usuário com o veículo (`VehicleRelationship`: OWNER, DRIVER, ADMIN). */
export type RelacaoVeiculo = 'proprietario' | 'motorista' | 'administrador';

/**
 * Veículo vinculado ao usuário (`Vehicle` do backend).
 *
 * Fabricante, modelo e ano são opcionais no contrato; a placa não muda
 * depois do cadastro (task D09).
 */
export interface Veiculo {
  id: string;
  placa: string;
  fabricante: string | null;
  modelo: string | null;
  ano: number | null;
  relacao: RelacaoVeiculo;
  /** Veículo principal: o que aparece nas telas e recebe os testes. */
  principal: boolean;
  criadoEm: string;
}

/** Cadastro de veículo (`CreateVehicleRequest`). */
export interface NovoVeiculo {
  placa: string;
  fabricante?: string | null;
  modelo?: string | null;
  ano?: number | null;
}

/** Edição permitida de veículo (`UpdateVehicleRequest`; a placa não muda). */
export interface AtualizacaoVeiculo {
  fabricante?: string | null;
  modelo?: string | null;
  ano?: number | null;
  principal?: boolean;
}

/** Status da instalação (`InstallationStatus`: ACTIVE, MAINTENANCE, INACTIVE, FAULT). */
export type StatusInstalacao = 'ativa' | 'manutencao' | 'inativa' | 'falha';

/** Instalação do sistema VERS num veículo, com o dispositivo ativo (`Installation`). */
export interface Instalacao {
  id: string;
  veiculoId: string;
  /** Modelo do sistema instalado ("VERS-PZ01"). */
  modelo: string;
  status: StatusInstalacao;
  /** Data da instalação (AAAA-MM-DD). */
  instaladaEm: string | null;
  dispositivo: Dispositivo | null;
}

/** Associação elétrica dos piezos (`PiezoAssociation`: SERIES, PARALLEL, MIXED). */
export type AssociacaoPiezos = 'serie' | 'paralelo' | 'misto';

/** Armazenamento da energia (`StorageType`: BATTERY, SUPERCAPACITOR, CAPACITOR, NONE). */
export type TipoArmazenamento = 'bateria' | 'supercapacitor' | 'capacitor' | 'nenhum';

/**
 * Versão da configuração física de uma instalação (`Configuration`).
 *
 * `piezosTotal` e `piezosInativos` vão além do contrato (que só tem a
 * contagem de ativos) para desenhar a topologia; estão como "a validar".
 */
export interface Configuracao {
  id: string;
  instalacaoId: string;
  nome: string;
  versao: number;
  piezosAtivos: number;
  piezosTotal: number | null;
  piezosInativos: number[] | null;
  associacao: AssociacaoPiezos;
  pontoInstalacao: string;
  armazenamento: TipoArmazenamento;
  observacoes: string | null;
  criadaEm: string;
}

/** Status de uma solicitação de revisão (`SupportStatus`). */
export type StatusRevisao = 'aberta' | 'em-revisao' | 'agendada' | 'resolvida' | 'cancelada';

/** Solicitação de revisão do sistema VERS (`SupportRequest`). */
export interface Revisao {
  id: string;
  veiculoId: string | null;
  instalacaoId: string | null;
  motivo: string;
  status: StatusRevisao;
  criadaEm: string;
  atualizadaEm: string;
}

/** Linha do log do dispositivo (exemplo; o contrato público ainda não tem logs). */
export interface LinhaLog {
  instante: string;
  nivel: 'info' | 'aviso' | 'erro';
  mensagem: string;
}

export interface Dispositivo {
  nome?: string;
  status?: 'PROVISIONING' | 'ONLINE' | 'OFFLINE' | 'REVOKED' | 'FAULT';
  id: string;
  plataforma: string;
  firmware: string;
  online: boolean;
  /** Última mensagem recebida (ISO 8601). */
  ultimoContato: string | null;
  protocolo: string;
}

/** Dispositivo pronto para exibição no card da sidebar. */
export interface DispositivoResumo {
  nome: string;
  online: boolean;
  firmware: string;
  /** Tempo desde a última mensagem, já formatado ("há 3 s"). */
  vistoHa: string;
  protocolo: string;
}

/**
 * Usuário logado (`UserProfile` do backend): só nome e foto podem ser
 * editados pelo próprio usuário; e-mail e função vêm do cadastro.
 */
export interface Usuario {
  id: string;
  nome: string;
  email: string;
  emailVerificado: boolean;
  funcao: string;
  /** URL da foto; sem foto, o avatar mostra as iniciais. */
  foto?: string;
}

/** Edição permitida do perfil (`UpdateUserProfileRequest`). */
export interface AtualizacaoPerfil {
  nome?: string;
  foto?: string | null;
}

/** Amostra simultânea de vibração e potência (dispersão energia × vibração). */
export interface AmostraVibracao {
  data: DataISO;
  horario: Horario;
  vibracaoRmsMs2: number;
  potenciaMw: number;
}

/** Leitura da bateria num instante do dia. */
export interface PontoTensaoBateria {
  horario: Horario;
  tensaoV: number;
  cargaPercentual: number;
}

/** Tensão e carga da bateria ao longo de hoje, até agora. */
export interface SerieTensaoBateria {
  data: DataISO;
  /** Intervalo entre pontos, em minutos. */
  intervaloMinutos: number;
  pontos: PontoTensaoBateria[];
}

/**
 * Qualidade de uma amostra, como o backend classifica (`TelemetryQuality`:
 * VALID, PARTIAL, SUSPECT, INVALID).
 */
export type QualidadeAmostra = 'valida' | 'parcial' | 'suspeita' | 'invalida';

/**
 * Amostra validada de telemetria; a frequência real depende da aquisição.
 *
 * Espelha o `TelemetrySample` do backend nas unidades das telas (mW, mA,
 * mWh). Medidas ausentes vêm como `null` (amostras inválidas não têm
 * tensão, corrente nem potência).
 */
export interface AmostraTelemetria {
  id: string;
  testeId: string;
  /** Data e hora ISO da captura, com milissegundos e o fuso do dispositivo. */
  capturadaEm: string;
  tensaoV: number | null;
  correnteMa: number | null;
  potenciaMw: number | null;
  /** Contador acumulado do dispositivo; não equivale ao resumo oficial do teste. */
  energiaAcumuladaMwh: number | null;
  vibracaoRmsMs2: number | null;
  temperaturaC: number | null;
  piezosAtivos: number | null;
  piezosTotal: number | null;
  qualidade: QualidadeAmostra;
}

/** Status de um teste (`TestStatus` do backend: PLANNED, RUNNING, COMPLETED, FAILED, CANCELLED). */
export type StatusTeste = 'planejado' | 'em-andamento' | 'concluido' | 'falhou' | 'cancelado';

/** Terreno do teste (`TerrainType`: HIGHWAY, CITY, OFFROAD, MIXED, OTHER). */
export type Terreno = 'rodovia' | 'cidade' | 'fora-estrada' | 'misto' | 'outro';

/** Resultado avaliado ao finalizar (`TestOutcome`: SATISFACTORY, UNSATISFACTORY, INCONCLUSIVE). */
export type ResultadoTeste = 'satisfatorio' | 'insatisfatorio' | 'inconclusivo';

/**
 * Teste de campo: um trajeto medido, ao qual as amostras pertencem.
 *
 * Espelha o `TestRecord` do backend. Velocidade, rotação e inclinação não
 * são medidas pelo VERS: são informadas pelo operador ao finalizar.
 */
export interface TesteCampo {
  id: string;
  /** Código curto exibido nas telas ("#023"). */
  codigo: string;
  nome: string;
  estado: StatusTeste;
  terreno: Terreno;
  /** Local do teste (do snapshot do backend). */
  local: string;
  /** Início e fim (ISO com fuso); nulos antes de iniciar e enquanto em andamento (fim). */
  inicio: string | null;
  fim: string | null;
  criadoEm: string;
  resultado: ResultadoTeste | null;
  /** Retrato do veículo e da instalação no momento do teste. */
  modeloVeiculo: string | null;
  piezosAtivos: number;
  versaoConfiguracao: number;
  pesoVeiculoKg: number | null;
  velocidadeMediaKmh: number | null;
  rotacaoMediaRpm: number | null;
  inclinacaoGraus: number | null;
  observacoes: string | null;
}

/** Busca de testes (`TestSearchQuery` do backend). */
export interface ConsultaTestes {
  pagina?: number;
  tamanhoPagina?: number;
  status?: StatusTeste;
  /** Intervalo do início do teste: início inclusivo, fim exclusivo. */
  inicioDe?: string;
  inicioAte?: string;
}

/** Qualidade do resumo de um teste (`SummaryQuality`: GOOD, PARTIAL, INVALID). */
export type QualidadeResumo = 'boa' | 'parcial' | 'invalida';

/** Resumo de energia de um teste encerrado (`EnergySummary` de período TEST). */
export interface ResumoTeste {
  testeId: string;
  energiaRecuperadaMwh: number;
  potenciaMediaMw: number | null;
  picoPotenciaMw: number | null;
  amostras: number;
  qualidade: QualidadeResumo;
}

/** Um teste da comparação, com o resumo (nulo se ainda não encerrou). */
export interface ItemComparacao {
  testeId: string;
  resumo: ResumoTeste | null;
}

/** Planejamento de teste; instalação/configuração explícitas são obrigatórias na API real. */
export interface NovoTeste {
  /** Obrigatórios na API real; o exemplo mantém sua configuração sintética. */
  instalacaoId?: string;
  configuracaoId?: string;
  nome: string;
  terreno: Terreno;
  local: string;
  pesoVeiculoKg?: number | null;
  observacoes?: string | null;
}

/** Finalização de um teste (`FinishTestRequest`). */
export interface FinalizacaoTeste {
  status: 'concluido' | 'falhou';
  resultado?: ResultadoTeste | null;
  velocidadeMediaKmh?: number | null;
  rotacaoMediaRpm?: number | null;
  inclinacaoGraus?: number | null;
  observacoes?: string | null;
}

/** Cancelamento de um teste (`CancelTestRequest`). */
export interface CancelamentoTeste {
  motivo?: string;
}

/** Consulta de amostras de um teste (`TelemetrySearchQuery` do backend). */
export interface ConsultaTelemetria {
  testeId: string;
  /** Página a partir de 1 (padrão 1). */
  pagina?: number;
  /** Itens por página, de 1 a 100 (padrão 20). */
  tamanhoPagina?: number;
  qualidade?: QualidadeAmostra;
  /** Intervalo de captura: início inclusivo, fim exclusivo. */
  de?: string;
  ate?: string;
}

/** Página de resultados de uma consulta paginada. */
export interface PaginaDe<T> {
  itens: T[];
  total: number;
  pagina: number;
  tamanhoPagina: number;
}

/** Autor de uma mensagem da conversa com o Viber. */
export type AutorMensagem = 'usuario' | 'viber';

/**
 * Natureza de uma resposta do Viber (como no mobile): medição e explicação
 * vêm dos dados; inferência e recomendação ganham selo de cautela.
 */
export type TipoResposta = 'medicao' | 'explicacao' | 'inferencia' | 'recomendacao';

/** Sugestões que o exemplo sabe responder sem o backend da Viber. */
export type SugestaoViber = 'eficiencia' | 'resumo' | 'revisao';

/** Comparação de testes anexada a uma resposta. */
export interface AnexoComparacao {
  tipo: 'comparacao';
  itens: { codigo: string; nome: string; energiaMwh: number; potenciaMediaMw: number | null }[];
}

/** Mensagem da conversa com o Viber. */
export interface MensagemViber {
  id: string;
  conversaId: string;
  autor: AutorMensagem;
  texto: string;
  /** Natureza da resposta (só nas do Viber). */
  tipo: TipoResposta | null;
  /** Período ou base dos números da resposta ("Resumo semanal · 28/09 a 04/10"). */
  referencia: string | null;
  enviadaEm: string;
  anexo: AnexoComparacao | null;
}

/** Conversa com o Viber (lista de recentes). */
export interface ConversaViber {
  id: string;
  titulo: string;
  atualizadaEm: string;
}

/** Contexto autorizado que delimita os dados da conversa. */
export interface ContextoViber {
  id: string;
  rotulo: string;
  /** Complemento do botão de resumo ("Resumo da semana"). */
  rotuloResumo: string;
}

/** Envio de uma mensagem ao Viber. */
export interface EnvioViber {
  conversaId: string;
  texto: string;
  contextoId: string;
  /** Sugestão escolhida; sem ela, é uma pergunta livre. */
  sugestao?: SugestaoViber;
}

/** Credenciais do Login (`LoginRequest`). */
export interface Credenciais {
  email: string;
  senha: string;
}

/** Conta nova do Criar conta (`RegisterRequest`; o nome é opcional). */
export interface NovaConta {
  email: string;
  senha: string;
  nome?: string;
}
