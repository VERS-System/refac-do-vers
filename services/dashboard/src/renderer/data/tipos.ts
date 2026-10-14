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

export interface Veiculo {
  id: string;
  fabricante: string;
  modelo: string;
  ano: number;
  placa: string;
}

export interface Dispositivo {
  id: string;
  plataforma: string;
  firmware: string;
  online: boolean;
  /** Última mensagem recebida (ISO 8601). */
  ultimoContato: string;
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

export interface Usuario {
  id: string;
  nome: string;
  funcao: string;
  /** URL da foto; sem foto, o avatar mostra as iniciais. */
  foto?: string;
}
