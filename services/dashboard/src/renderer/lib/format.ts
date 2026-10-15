/**
 * Formatadores pt-BR das grandezas mostradas no app desktop do VERS.
 *
 * Centralizam a regra de exibição de números (vírgula decimal, milhar com
 * ponto, zero sem sinal) e das unidades da coleta piezoelétrica (mW, mWh, Wh
 * e %). As telas nunca devem chamar `toFixed` ou `toLocaleString` direto, para
 * que todos os valores sigam o mesmo padrão. Potência, energia e aceleração
 * saem na unidade escolhida nas Configurações (`lib/unidades.ts`).
 */

import { JOULES_POR_MWH, MS2_POR_G, unidadesAtuais } from './unidades';

/** Valor já formatado acompanhado da unidade, exibidos separadamente nos KPIs. */
export interface Medida {
  valor: string;
  unidade: string;
}

/** Texto exibido no lugar de valores ausentes ou inválidos. */
export const VALOR_AUSENTE = '–';

/** Cache de formatadores do Intl por combinação de casas e sinal. */
const formatadores = new Map<string, Intl.NumberFormat>();

/**
 * Devolve um `Intl.NumberFormat` pt-BR com casas fixas, reaproveitando instâncias.
 *
 * Criar um `Intl.NumberFormat` é caro e as telas formatam centenas de valores
 * (tabelas de telemetria), por isso cada configuração é criada uma vez só.
 * `useGrouping: 'always'` garante o ponto de milhar também com quatro dígitos.
 */
function obterFormatador(casas: number, sinal: 'negative' | 'exceptZero'): Intl.NumberFormat {
  const chave = `${casas}:${sinal}`;
  let formatador = formatadores.get(chave);
  if (!formatador) {
    formatador = new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: casas,
      maximumFractionDigits: casas,
      useGrouping: 'always',
      signDisplay: sinal,
    });
    formatadores.set(chave, formatador);
  }
  return formatador;
}

/** Indica se o valor é um número finito, descartando nulos, NaN e infinitos. */
function ehNumeroValido(valor: number | null | undefined): valor is number {
  return typeof valor === 'number' && Number.isFinite(valor);
}

/**
 * Formata um número no padrão pt-BR com a quantidade fixa de casas decimais.
 *
 * Usa `signDisplay: 'negative'` para que valores que arredondam para zero
 * (como -0,04 com uma casa) apareçam como "0,0" em vez de "-0,0".
 * Valores ausentes ou inválidos viram {@link VALOR_AUSENTE}.
 */
export function formatarNumero(valor: number | null | undefined, casas = 0): string {
  if (!ehNumeroValido(valor)) return VALOR_AUSENTE;
  return obterFormatador(casas, 'negative').format(valor);
}

/**
 * Formata uma potência recebida em mW, na unidade preferida.
 *
 * Em mW (padrão do laboratório) fica inteira, como nos KPIs e na cadeia de
 * conversão; em W ganha três casas a mais ("0,212 W"), para não perder a
 * precisão da coleta piezoelétrica.
 */
export function formatarPotencia(mW: number | null | undefined, casas = 0): Medida {
  if (unidadesAtuais().potencia === 'W') {
    return { valor: formatarNumero(ehNumeroValido(mW) ? mW / 1000 : mW, casas + 3), unidade: 'W' };
  }
  return { valor: formatarNumero(mW, casas), unidade: 'mW' };
}

/**
 * Formata uma energia recebida em mWh, na unidade preferida.
 *
 * Em mWh: abaixo de 1 Wh mostra mWh inteiro ("292 mWh"); a partir daí, Wh
 * com duas casas ("1,92 Wh"). Em joules (1 mWh = 3,6 J): J inteiro abaixo de
 * 1 kJ e kJ com duas casas a partir daí. A comparação usa o valor já
 * arredondado, para nunca exibir "1.000 mWh". A opção `unidade` fixa a escala
 * (a pequena, mWh/J, ou a grande, Wh/kJ), útil em eixos e colunas; `casas`
 * define as decimais da escala pequena (padrão: inteiro).
 */
export function formatarEnergia(
  mWh: number | null | undefined,
  opcoes: { unidade?: 'mWh' | 'Wh'; casas?: number } = {},
): Medida {
  const emJoules = unidadesAtuais().energia === 'J';
  const pequena = emJoules ? 'J' : 'mWh';
  const grande = emJoules ? 'kJ' : 'Wh';
  if (!ehNumeroValido(mWh)) {
    return { valor: VALOR_AUSENTE, unidade: opcoes.unidade === 'Wh' ? grande : pequena };
  }
  const valorPequeno = emJoules ? mWh * JOULES_POR_MWH : mWh;
  const escalaGrande = opcoes.unidade
    ? opcoes.unidade === 'Wh'
    : Math.abs(Math.round(valorPequeno)) >= 1000;
  if (escalaGrande) return { valor: formatarNumero(valorPequeno / 1000, 2), unidade: grande };
  return { valor: formatarNumero(valorPequeno, opcoes.casas ?? 0), unidade: pequena };
}

/**
 * Formata uma aceleração (vibração RMS) recebida em m/s², na unidade
 * preferida: m/s² com uma casa ("3,2 m/s²") ou g com uma casa a mais
 * ("0,33 g").
 */
export function formatarAceleracao(ms2: number | null | undefined, casas = 1): Medida {
  if (unidadesAtuais().aceleracao === 'g') {
    return {
      valor: formatarNumero(ehNumeroValido(ms2) ? ms2 / MS2_POR_G : ms2, casas + 1),
      unidade: 'g',
    };
  }
  return { valor: formatarNumero(ms2, casas), unidade: 'm/s²' };
}

/**
 * Formata um percentual já na escala 0 a 100, com uma casa por padrão.
 *
 * O DESIGN.md pede eficiências com uma casa decimal ("53,5%").
 */
export function formatarPercentual(valor: number | null | undefined, casas = 1): Medida {
  return { valor: formatarNumero(valor, casas), unidade: '%' };
}

/**
 * Formata uma variação percentual com sinal explícito ("+6,6%", "-3,2%").
 *
 * Usa `signDisplay: 'exceptZero'`: valores que arredondam para zero ficam sem
 * sinal, evitando "+0,0%" ou "-0,0%".
 */
export function formatarVariacao(valor: number | null | undefined, casas = 1): string {
  if (!ehNumeroValido(valor)) return VALOR_AUSENTE;
  return `${obterFormatador(casas, 'exceptZero').format(valor)}%`;
}

/**
 * Junta valor e unidade num texto só, para tabelas, tooltips e leitores de tela.
 *
 * Separa com espaço ("212 mW"), exceto o percentual, que fica colado ("53,5%").
 * Quando o valor está ausente, devolve só o traço, sem unidade.
 */
export function formatarMedida(medida: Medida): string {
  if (medida.valor === VALOR_AUSENTE) return VALOR_AUSENTE;
  if (medida.unidade === '%') return `${medida.valor}%`;
  return `${medida.valor} ${medida.unidade}`;
}

/**
 * Formata o tempo desde um evento ("há 3 s", "há 2 min", "há 1 h", "há 2 dias").
 *
 * Usa a maior unidade inteira, arredondando para baixo, como no card do ESP32
 * ("visto há 3 s"). Valores negativos (relógios dessincronizados) ou inválidos
 * viram {@link VALOR_AUSENTE}.
 */
export function formatarTempoDecorrido(segundos: number): string {
  if (!ehNumeroValido(segundos) || segundos < 0) return VALOR_AUSENTE;
  if (segundos < 60) return `há ${Math.floor(segundos)} s`;
  if (segundos < 3600) return `há ${Math.floor(segundos / 60)} min`;
  if (segundos < 86400) return `há ${Math.floor(segundos / 3600)} h`;
  const dias = Math.floor(segundos / 86400);
  return `há ${dias} ${dias === 1 ? 'dia' : 'dias'}`;
}

/** Data ISO `AAAA-MM-DD` (só a data, sem horário). */
const DATA_ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Dias da semana abreviados, de domingo (0) a sábado (6), como em `Date.getUTCDay`. */
const DIAS_DA_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

/**
 * Formata uma data ISO como "DD/MM" ("28/09 a 04/10" nos subtítulos e eixos).
 *
 * Lê o texto direto, sem criar `Date`, para não sofrer com o fuso local
 * (`new Date('2026-09-28')` é meia-noite UTC, que no Brasil ainda é dia 27).
 */
export function formatarDataCurta(data: string): string {
  const partes = DATA_ISO.exec(data);
  return partes ? `${partes[3]}/${partes[2]}` : VALOR_AUSENTE;
}

/**
 * Dá o dia da semana abreviado de uma data ISO ("Seg", "Qui", "Dom").
 *
 * Usado no eixo do gráfico da semana. Calcula em UTC a partir dos números da
 * data, pelo mesmo motivo de {@link formatarDataCurta}: o resultado não pode
 * depender do fuso da máquina.
 */
export function formatarDiaSemanaCurto(data: string): string {
  const partes = DATA_ISO.exec(data);
  if (!partes) return VALOR_AUSENTE;
  const [, ano, mes, dia] = partes.map(Number);
  return DIAS_DA_SEMANA[new Date(Date.UTC(ano, mes - 1, dia)).getUTCDay()];
}

/**
 * Formata uma data ISO como "DD/MM/AAAA" (data completa, usada no CSV).
 *
 * Lê o texto direto, sem `Date`, pelo mesmo motivo de {@link formatarDataCurta}.
 */
export function formatarData(data: string): string {
  const partes = DATA_ISO.exec(data);
  return partes ? `${partes[3]}/${partes[2]}/${partes[1]}` : VALOR_AUSENTE;
}

/** Data e hora ISO com horário (e milissegundos opcionais) depois do "T". */
const HORARIO_ISO = /^\d{4}-\d{2}-\d{2}T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?/;

/**
 * Horário de captura de uma data ISO ("18:05:00" ou "18:05:00.410").
 *
 * Lê o horário do próprio texto, que já vem no fuso do dispositivo
 * (`-03:00`), em vez de converter para o fuso da máquina: assim a tabela
 * mostra o mesmo horário que o ESP32 registrou.
 */
export function formatarHorarioCaptura(iso: string, milissegundos = false): string {
  const partes = HORARIO_ISO.exec(iso);
  if (!partes) return VALOR_AUSENTE;
  const horario = `${partes[1]}:${partes[2]}:${partes[3]}`;
  return milissegundos ? `${horario}.${(partes[4] ?? '0').padEnd(3, '0')}` : horario;
}

/** Formatadores de reais por número máximo de casas (criar um `Intl` custa caro). */
const formatadoresMoeda = new Map<number, Intl.NumberFormat>();

/**
 * Formata um valor em reais ("R$ 0,0018", "R$ 12,50").
 *
 * Usa até `casas` decimais (mínimo de duas), porque a economia de energia
 * do VERS é de frações de centavo por semana. Troca o espaço inseparável do
 * `Intl` por um espaço comum, para o texto se comparar e copiar sem surpresa.
 */
export function formatarMoeda(valor: number | null | undefined, casas = 4): string {
  if (!ehNumeroValido(valor)) return VALOR_AUSENTE;
  let formatador = formatadoresMoeda.get(casas);
  if (!formatador) {
    formatador = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: Math.max(2, casas),
    });
    formatadoresMoeda.set(casas, formatador);
  }
  return formatador.format(valor).replace(/\s/g, ' ');
}
