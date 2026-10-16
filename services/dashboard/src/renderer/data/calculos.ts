/**
 * Cálculos de energia, eficiência e resumos de período do VERS.
 *
 * Funções puras que fazem o papel do backend: a partir das medições brutas
 * (energia por ponto, horas em movimento, curva de potência, V/I/P) derivam
 * todos os números exibidos nas telas. Assim nenhum valor exibido é copiado à
 * mão: se a base muda, os KPIs, tabelas e comparações mudam juntos.
 */

import { formatarTempoDecorrido } from '@/lib/format';
import type { Periodo } from '@/stores/periodo';
import type {
  CadeiaConversao,
  DataISO,
  DiaMedido,
  Dispositivo,
  DispositivoResumo,
  EnergiaPorPonto,
  Horario,
  PerdasConversao,
  PicoPotencia,
  PontoConversao,
  PontoCurva,
  ResumoDia,
  ResumoEnergia,
  Veiculo,
} from './tipos';

/**
 * Eficiência de um estágio: saída sobre entrada, em percentual.
 *
 * Devolve `null` sem entrada, porque a razão não é definida (e exibir "0%"
 * sugeriria uma medição que não existe).
 */
export function eficiencia(saida: number, entrada: number): number | null {
  if (entrada === 0) return null;
  return (saida / entrada) * 100;
}

/** Perda percentual de um estágio (100 menos a eficiência), ou `null` sem entrada. */
export function perdaPercentual(saida: number, entrada: number): number | null {
  const valor = eficiencia(saida, entrada);
  return valor === null ? null : 100 - valor;
}

/** Variação percentual de `atual` em relação a `referencia`, ou `null` se a referência for zero. */
export function variacaoPercentual(atual: number, referencia: number): number | null {
  if (referencia === 0) return null;
  return (atual / referencia - 1) * 100;
}

/**
 * Integra uma série de potências igualmente espaçadas pela regra dos trapézios.
 *
 * É o método citado na tela Energia ("Integração trapezoidal de P = V × I").
 * Com potência em mW e intervalo em horas, o resultado sai em mWh.
 */
export function integrarTrapezios(valores: readonly number[], intervaloHoras: number): number {
  let soma = 0;
  for (let i = 1; i < valores.length; i++) {
    soma += ((valores[i - 1] + valores[i]) / 2) * intervaloHoras;
  }
  return soma;
}

/** Converte minutos desde a meia-noite em "HH:MM". */
export function minutosParaHorario(minutos: number): Horario {
  const horas = Math.floor(minutos / 60);
  return `${String(horas).padStart(2, '0')}:${String(minutos % 60).padStart(2, '0')}`;
}

/** Converte "HH:MM" em minutos desde a meia-noite. */
export function horarioParaMinutos(horario: Horario): number {
  const [horas, minutos] = horario.split(':').map(Number);
  return horas * 60 + minutos;
}

/** Potência média em movimento: energia sobre horas, ou `null` se não houve movimento. */
function potenciaMedia(energiaMwh: number, horas: number): number | null {
  return horas > 0 ? energiaMwh / horas : null;
}

/** Perdas de cada estágio a partir das energias por ponto, ou `null` sem energia no P1. */
function calcularPerdas(energia: EnergiaPorPonto): PerdasConversao | null {
  if (energia.p1 === 0) return null;
  return {
    regulador: perdaPercentual(energia.p2, energia.p1) ?? 0,
    bateria: perdaPercentual(energia.p3, energia.p2) ?? 0,
    celular: perdaPercentual(energia.p4, energia.p3) ?? 0,
  };
}

/** Acrescenta a um dia medido a potência média e a eficiência ponta a ponta. */
export function resumirDia(dia: DiaMedido): ResumoDia {
  return {
    ...dia,
    potenciaMediaMw: potenciaMedia(dia.energia.p1, dia.horasMovimento),
    eficienciaPercentual: eficiencia(dia.energia.p4, dia.energia.p1),
  };
}

/**
 * Resume uma lista de dias num período (Dia, Semana ou Mês).
 *
 * Soma energias e horas; a potência média é a energia total sobre as horas
 * totais (ponderada pelo tempo, não a média das médias diárias). O pico é o
 * maior entre os dias. Os dias devem vir em ordem cronológica.
 */
export function resumirDias(periodo: Periodo, dias: readonly DiaMedido[]): ResumoEnergia {
  const energia: EnergiaPorPonto = { p1: 0, p2: 0, p3: 0, p4: 0 };
  let horas = 0;
  let pico: PicoPotencia | null = null;
  for (const dia of dias) {
    energia.p1 += dia.energia.p1;
    energia.p2 += dia.energia.p2;
    energia.p3 += dia.energia.p3;
    energia.p4 += dia.energia.p4;
    horas += dia.horasMovimento;
    if (!pico || dia.pico.potenciaMw > pico.potenciaMw) {
      pico = { potenciaMw: dia.pico.potenciaMw, data: dia.data, horario: dia.pico.horario };
    }
  }
  return {
    periodo,
    inicio: dias[0]?.data ?? '',
    fim: dias.at(-1)?.data ?? '',
    diasComDados: dias.length,
    diasComLacunas: dias.filter((dia) => dia.lacunasPercentual > 0).length,
    horasMovimento: horas,
    energiaRecuperadaMwh: energia.p1,
    porPonto: energia,
    potenciaMediaMw: potenciaMedia(energia.p1, horas),
    pico,
    eficienciaPercentual: eficiencia(energia.p4, energia.p1),
    perdas: calcularPerdas(energia),
  };
}

/**
 * Resume um trecho da curva de potência (usado no período Hora).
 *
 * A curva só mede o nó piezoelétrico (P1), então o resumo não traz energia
 * por ponto, eficiência nem perdas: inventar esses valores violaria a regra de
 * honestidade dos dados. Minutos com potência positiva contam como movimento.
 */
export function resumirCurva(
  periodo: Periodo,
  data: DataISO,
  pontos: readonly PontoCurva[],
  intervaloMinutos: number,
): ResumoEnergia {
  const potencias = pontos.map((ponto) => ponto.recuperadaMw);
  const energia = integrarTrapezios(potencias, intervaloMinutos / 60);
  const horas = (potencias.filter((p) => p > 0).length * intervaloMinutos) / 60;
  let pico: PicoPotencia | null = null;
  for (const ponto of pontos) {
    if (ponto.recuperadaMw > 0 && (!pico || ponto.recuperadaMw > pico.potenciaMw)) {
      pico = { potenciaMw: ponto.recuperadaMw, data, horario: ponto.horario };
    }
  }
  return {
    periodo,
    inicio: data,
    fim: data,
    diasComDados: pontos.length > 0 ? 1 : 0,
    diasComLacunas: 0,
    horasMovimento: horas,
    energiaRecuperadaMwh: energia,
    potenciaMediaMw: potenciaMedia(energia, horas),
    pico,
    eficienciaPercentual: null,
    perdas: null,
  };
}

/**
 * Acrescenta à leitura dos 4 pontos a eficiência de cada estágio e a ponta a ponta.
 *
 * Usa a potência medida em cada ponto (o ESP32 mede P diretamente), e não o
 * produto V × I dos valores já arredondados para exibição.
 */
export function enriquecerCadeia(
  capturadaEm: string,
  pontos: readonly Omit<PontoConversao, 'eficienciaEstagioPercentual'>[],
): CadeiaConversao {
  return {
    capturadaEm,
    pontos: pontos.map((ponto, indice) => ({
      ...ponto,
      eficienciaEstagioPercentual:
        indice === 0 ? null : eficiencia(ponto.potenciaMw, pontos[indice - 1].potenciaMw),
    })),
    eficienciaPontaAPontaPercentual:
      pontos.length > 1
        ? eficiencia(pontos[pontos.length - 1].potenciaMw, pontos[0].potenciaMw)
        : null,
  };
}

/** Prepara o dispositivo para o card da sidebar, com o tempo desde o último contato. */
export function resumirDispositivo(dispositivo: Dispositivo, agora: Date): DispositivoResumo {
  const segundos = (agora.getTime() - new Date(dispositivo.ultimoContato).getTime()) / 1000;
  return {
    nome: `${dispositivo.plataforma} · ${dispositivo.id}`,
    online: dispositivo.online,
    firmware: dispositivo.firmware,
    vistoHa: formatarTempoDecorrido(segundos),
    protocolo: dispositivo.protocolo,
  };
}

/** Nome do veículo sem a placa ("Honda Civic 2026"), pulando o que não foi informado. */
export function nomearVeiculo(veiculo: Pick<Veiculo, 'fabricante' | 'modelo' | 'ano'>): string {
  return [veiculo.fabricante, veiculo.modelo, veiculo.ano]
    .filter((parte) => parte !== null && parte !== '')
    .join(' ');
}

/**
 * Descrição curta do veículo usada no subtítulo das telas ("Honda Civic 2026
 * · ABC1D23"). Fabricante, modelo e ano são opcionais no contrato; sem
 * nenhum deles, fica só a placa.
 */
export function descreverVeiculo(
  veiculo: Pick<Veiculo, 'fabricante' | 'modelo' | 'ano' | 'placa'>,
): string {
  const nome = nomearVeiculo(veiculo);
  return nome ? `${nome} · ${veiculo.placa}` : veiculo.placa;
}

/**
 * Recorta a janela final de uma curva: os pontos dos últimos `minutos`.
 *
 * Usado no período Hora (a última hora da curva de hoje). A janela termina no
 * último ponto e inclui o ponto exatamente `minutos` antes dele, então uma
 * curva por minuto rende `minutos + 1` pontos (17:05 a 18:05).
 */
export function recortarUltimosMinutos(
  pontos: readonly PontoCurva[],
  minutos: number,
): PontoCurva[] {
  if (pontos.length === 0) return [];
  const inicio = horarioParaMinutos(pontos[pontos.length - 1].horario) - minutos;
  return pontos.filter((ponto) => horarioParaMinutos(ponto.horario) >= inicio);
}

/** Par de valores de uma dispersão (ex.: vibração RMS × potência). */
export interface ParXY {
  x: number;
  y: number;
}

/** Reta `y = inclinacao × x + intercepto`. */
export interface Reta {
  inclinacao: number;
  intercepto: number;
}

/**
 * Médias e somas de quadrados de uma lista de pares.
 *
 * Base comum da correlação e da regressão: `sxx` e `syy` medem a variação
 * de cada eixo em torno da média e `sxy` a variação conjunta.
 */
function momentos(pares: readonly ParXY[]) {
  const n = pares.length;
  const mediaX = pares.reduce((soma, par) => soma + par.x, 0) / n;
  const mediaY = pares.reduce((soma, par) => soma + par.y, 0) / n;
  let sxx = 0;
  let syy = 0;
  let sxy = 0;
  for (const { x, y } of pares) {
    sxx += (x - mediaX) ** 2;
    syy += (y - mediaY) ** 2;
    sxy += (x - mediaX) * (y - mediaY);
  }
  return { mediaX, mediaY, sxx, syy, sxy };
}

/**
 * Coeficiente de correlação de Pearson (r, de -1 a 1).
 *
 * Mede o quanto os pares se alinham numa reta: o "r = 0,82" da dispersão
 * energia × vibração. Devolve `null` com menos de dois pares ou quando um
 * dos eixos não varia, casos em que r não é definido.
 */
export function correlacaoPearson(pares: readonly ParXY[]): number | null {
  if (pares.length < 2) return null;
  const { sxx, syy, sxy } = momentos(pares);
  if (sxx === 0 || syy === 0) return null;
  return sxy / Math.sqrt(sxx * syy);
}

/**
 * Reta de mínimos quadrados que melhor descreve os pares.
 *
 * Desenhada como tendência na dispersão. Devolve `null` sem pares ou sem
 * variação em x (a reta seria vertical).
 */
export function regressaoLinear(pares: readonly ParXY[]): Reta | null {
  if (pares.length < 2) return null;
  const { mediaX, mediaY, sxx, sxy } = momentos(pares);
  if (sxx === 0) return null;
  const inclinacao = sxy / sxx;
  return { inclinacao, intercepto: mediaY - inclinacao * mediaX };
}

/** Intensidade de uma correlação. */
export type IntensidadeCorrelacao = 'alta' | 'moderada' | 'baixa';

/**
 * Classifica a correlação pelo valor absoluto de r.
 *
 * Faixas usuais: a partir de 0,7 é alta, a partir de 0,4 moderada, abaixo
 * disso baixa. O sinal só indica o sentido, não a intensidade.
 */
export function classificarCorrelacao(r: number | null): IntensidadeCorrelacao | null {
  if (r === null) return null;
  const intensidade = Math.abs(r);
  if (intensidade >= 0.7) return 'alta';
  if (intensidade >= 0.4) return 'moderada';
  return 'baixa';
}

/** Estados da conexão ao vivo da Telemetria (task D05 da equipe). */
export type EstadoConexao =
  'conectando' | 'conectado' | 'reconectando' | 'desatualizado' | 'offline' | 'pausado';

/** Tempo sem resposta nova a partir do qual os dados ao vivo estão desatualizados (três intervalos de 10 s). */
export const LIMITE_DESATUALIZADO_MS = 30_000;

export interface SituacaoConsulta {
  /** O usuário deixou "Ao vivo" ligado. */
  aoVivo: boolean;
  /** A última consulta falhou. */
  erro: boolean;
  /** Há uma consulta em andamento. */
  buscando: boolean;
  /** Momento da última resposta com sucesso (ms desde 1970), ou 0 se nunca houve. */
  atualizadoEm: number;
  agora: number;
}

/**
 * Deduz o estado da conexão ao vivo a partir da situação da consulta.
 *
 * A pausa vence tudo (foi o usuário que parou). Com erro, é "reconectando"
 * enquanto uma nova tentativa roda e "offline" quando ela termina. Sem
 * resposta ainda, "conectando". Com dados mais velhos que 30 s,
 * "desatualizado"; caso contrário, "conectado".
 */
export function estadoConexao(situacao: SituacaoConsulta): EstadoConexao {
  if (!situacao.aoVivo) return 'pausado';
  if (situacao.erro) return situacao.buscando ? 'reconectando' : 'offline';
  if (situacao.atualizadoEm === 0) return 'conectando';
  return situacao.agora - situacao.atualizadoEm > LIMITE_DESATUALIZADO_MS
    ? 'desatualizado'
    : 'conectado';
}

/**
 * Escreve um instante como data ISO no fuso informado, em minutos em
 * relação ao UTC (−180 = Brasília): "2026-10-05T18:05:00-03:00".
 *
 * É o formato em que o exemplo registra horários (o do dispositivo), para
 * que os horários gravados pelas ações (iniciar, finalizar, planejar) se
 * comparem e se exibam como os demais, sem depender do fuso da máquina.
 */
export function formatarIsoComFuso(instante: Date, desvioMinutos: number): string {
  const local = new Date(instante.getTime() + desvioMinutos * 60_000).toISOString().slice(0, 19);
  const sinal = desvioMinutos < 0 ? '-' : '+';
  const absoluto = Math.abs(desvioMinutos);
  const horas = String(Math.floor(absoluto / 60)).padStart(2, '0');
  const minutos = String(absoluto % 60).padStart(2, '0');
  return `${local}${sinal}${horas}:${minutos}`;
}

/** Placa Mercosul (ABC1D23) ou antiga (ABC1234), já em maiúsculas e sem hífen. */
const FORMATO_PLACA = /^[A-Z]{3}\d[A-Z\d]\d{2}$/;

/**
 * Normaliza a placa digitada (maiúsculas, sem espaços nem hífen) e confere o
 * formato. Devolve `null` se não for uma placa válida.
 */
export function normalizarPlaca(placa: string): string | null {
  const limpa = placa.trim().toUpperCase().replace(/-/g, '');
  return FORMATO_PLACA.test(limpa) ? limpa : null;
}

/** Regras da senha do cadastro, cada uma atendida ou não. */
export interface RequisitosSenha {
  tamanho: boolean;
  maiuscula: boolean;
  especial: boolean;
  semEspacos: boolean;
}

/**
 * Avalia a senha pelas regras do `RegisterDto` do backend (mínimo de 8
 * caracteres, uma maiúscula, um caractere que não seja letra ou número e
 * nenhum espaço), uma a uma, para a tela mostrar cada requisito ao vivo.
 */
export function requisitosSenha(senha: string): RequisitosSenha {
  return {
    tamanho: senha.length >= 8,
    maiuscula: /[A-Z]/.test(senha),
    especial: /[^A-Za-z0-9\s]/.test(senha),
    semEspacos: !/\s/.test(senha),
  };
}

/** Indica se todas as regras da senha foram atendidas. */
export function senhaValida(senha: string): boolean {
  return Object.values(requisitosSenha(senha)).every(Boolean);
}

/** Formato usual de e-mail: algo@dominio.tld, sem espaços. */
const FORMATO_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Confere o formato do e-mail antes de enviar (o backend valida de novo com
 * `IsEmail`). Ignora espaços nas pontas, como o `Transform` do DTO.
 */
export function emailValido(email: string): boolean {
  return FORMATO_EMAIL.test(email.trim());
}

/** Chassi no padrão VIN (ISO 3779): 17 letras e números, sem I, O e Q. */
const FORMATO_CHASSI = /^[A-HJ-NPR-Z0-9]{17}$/;

/**
 * Normaliza o chassi digitado (maiúsculas, sem espaços nem hífens) e confere
 * o padrão VIN. Devolve `null` se não for um chassi válido. O chassi vai
 * identificar cada carro quando o sistema for real.
 */
export function normalizarChassi(chassi: string): string | null {
  const limpo = chassi.toUpperCase().replace(/[\s-]/g, '');
  return FORMATO_CHASSI.test(limpo) ? limpo : null;
}
