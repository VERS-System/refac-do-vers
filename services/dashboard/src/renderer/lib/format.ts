/**
 * Formatadores pt-BR das grandezas mostradas no app desktop do VERS.
 *
 * Centralizam a regra de exibição de números (vírgula decimal, milhar com
 * ponto, zero sem sinal) e das unidades da coleta piezoelétrica (mW, mWh, Wh
 * e %). As telas nunca devem chamar `toFixed` ou `toLocaleString` direto, para
 * que todos os valores sigam o mesmo padrão.
 */

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
 * Formata uma potência em mW (escala da coleta piezoelétrica).
 *
 * A potência é sempre exibida em mW, inteira por padrão, como nos KPIs e na
 * cadeia de conversão das telas.
 */
export function formatarPotencia(mW: number | null | undefined, casas = 0): Medida {
  return { valor: formatarNumero(mW, casas), unidade: 'mW' };
}

/**
 * Formata uma energia recebida em mWh, escolhendo entre mWh e Wh.
 *
 * Abaixo de 1 Wh mostra mWh inteiro ("292 mWh"); a partir daí mostra Wh com
 * duas casas ("1,92 Wh"). A comparação usa o valor já arredondado, para nunca
 * exibir "1.000 mWh". A opção `unidade` fixa a unidade, útil em colunas de
 * tabela que precisam de uma unidade só.
 */
export function formatarEnergia(
  mWh: number | null | undefined,
  opcoes: { unidade?: 'mWh' | 'Wh' } = {},
): Medida {
  if (!ehNumeroValido(mWh)) {
    return { valor: VALOR_AUSENTE, unidade: opcoes.unidade ?? 'mWh' };
  }
  const unidade = opcoes.unidade ?? (Math.abs(Math.round(mWh)) >= 1000 ? 'Wh' : 'mWh');
  if (unidade === 'Wh') return { valor: formatarNumero(mWh / 1000, 2), unidade };
  return { valor: formatarNumero(mWh), unidade };
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
