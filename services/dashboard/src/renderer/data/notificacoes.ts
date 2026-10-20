/**
 * Notificações do sino da barra superior (Fase 5), montadas a partir dos
 * dados do app, sem backend de notificações.
 *
 * Dois grupos:
 * - **alertas disparados**: os alertas ativos das Configurações conferidos
 *   contra os dados. Os limites ficam aqui, porque o campo `limite` do
 *   alerta é só texto: dispositivo sem mensagens há mais de 5 min,
 *   eficiência ponta a ponta de hoje abaixo de 30% e bloco dos piezos acima
 *   de 60 °C. O "Resumo diário por e-mail" não é um alerta de dado e não
 *   entra;
 * - **eventos**: o que aconteceu, tirado dos próprios dados (dispositivo
 *   online, teste em andamento, testes encerrados), do mais recente, até 5.
 *
 * Plano em `.AIs/docs/plans/desktop-frontend-fase-5.md`.
 */

import { formatarNumero, formatarPercentual } from '@/lib/format';
import type { Alerta } from '@/stores/preferencias';
import { formatarIsoComFuso } from './calculos';
import type { Dispositivo, TesteCampo } from './tipos';

/** Fuso de Brasília em minutos. */
const FUSO_MINUTOS = -180;

export interface Notificacao {
  id: string;
  titulo: string;
  detalhe: string;
  /** Quando aconteceu (ISO), para ordenar e mostrar o horário. */
  quando: string;
  tom: 'danger' | 'warning' | 'info' | 'success' | 'neutral';
}

export interface DadosNotificacoes {
  alertas: Alerta[];
  agora: Date;
  dispositivo?: Dispositivo | null;
  eficienciaHojePercentual?: number | null;
  temperaturaBlocoC?: number;
  testes?: TesteCampo[];
}

/** Limites dos alertas das Configurações. */
const MINUTOS_SEM_MENSAGEM = 5;
const EFICIENCIA_MINIMA = 30;
const TEMPERATURA_MAXIMA_C = 60;
/** Quantos eventos o painel mostra. */
const MAXIMO_EVENTOS = 5;

/** Texto do evento de um teste encerrado, pelo estado. */
const TEXTO_ENCERRAMENTO: Partial<
  Record<TesteCampo['estado'], { texto: string; tom: Notificacao['tom'] }>
> = {
  concluido: { texto: 'concluído', tom: 'success' },
  falhou: { texto: 'falhou', tom: 'danger' },
  cancelado: { texto: 'cancelado', tom: 'neutral' },
};

/** Confere os alertas ativos contra os dados e devolve os que passaram do limite. */
function alertasDisparados(dados: DadosNotificacoes): Notificacao[] {
  const ativos = new Set(dados.alertas.filter((a) => a.ativo).map((a) => a.id));
  const disparados: Notificacao[] = [];
  const { dispositivo, eficienciaHojePercentual: eficiencia, temperaturaBlocoC } = dados;
  // No horário de Brasília, como as demais datas do app.
  const agoraIso = formatarIsoComFuso(dados.agora, FUSO_MINUTOS);

  if (ativos.has('offline') && dispositivo?.ultimoContato) {
    const minutos = (dados.agora.getTime() - Date.parse(dispositivo.ultimoContato)) / 60_000;
    if (minutos > MINUTOS_SEM_MENSAGEM) {
      disparados.push({
        id: 'alerta-offline',
        titulo: 'Dispositivo sem mensagens',
        detalhe: `${dispositivo.plataforma} · ${dispositivo.id} sem mensagens há ${Math.floor(minutos)} min.`,
        quando: dispositivo.ultimoContato,
        tom: 'danger',
      });
    }
  }
  if (ativos.has('eficiencia') && eficiencia != null && eficiencia < EFICIENCIA_MINIMA) {
    disparados.push({
      id: 'alerta-eficiencia',
      titulo: 'Eficiência abaixo de 30%',
      detalhe: `Eficiência ponta a ponta de hoje em ${formatarPercentual(eficiencia).valor}%.`,
      quando: agoraIso,
      tom: 'warning',
    });
  }
  if (
    ativos.has('temperatura') &&
    temperaturaBlocoC !== undefined &&
    temperaturaBlocoC > TEMPERATURA_MAXIMA_C
  ) {
    disparados.push({
      id: 'alerta-temperatura',
      titulo: 'Temperatura acima de 60 °C',
      detalhe: `Bloco dos piezos a ${formatarNumero(temperaturaBlocoC, 1)} °C.`,
      quando: agoraIso,
      tom: 'danger',
    });
  }
  return disparados;
}

/** Eventos dos dados: dispositivo online, teste em andamento e testes encerrados. */
function eventos(dados: DadosNotificacoes): Notificacao[] {
  const lista: Notificacao[] = [];
  const { dispositivo } = dados;
  if (dispositivo?.online && dispositivo.ultimoContato) {
    lista.push({
      id: `evento-online-${dispositivo.id}`,
      titulo: `${dispositivo.plataforma} · ${dispositivo.id} online`,
      detalhe: `Última mensagem por ${dispositivo.protocolo}.`,
      quando: dispositivo.ultimoContato,
      tom: 'success',
    });
  }
  for (const teste of dados.testes ?? []) {
    if (teste.estado === 'em-andamento' && teste.inicio) {
      lista.push({
        id: `evento-teste-${teste.id}-andamento`,
        titulo: `Teste ${teste.codigo} em andamento`,
        detalhe: teste.nome,
        quando: teste.inicio,
        tom: 'info',
      });
    }
    const encerramento = TEXTO_ENCERRAMENTO[teste.estado];
    if (encerramento && teste.fim) {
      lista.push({
        id: `evento-teste-${teste.id}-${teste.estado}`,
        titulo: `Teste ${teste.codigo} ${encerramento.texto}`,
        detalhe: teste.nome,
        quando: teste.fim,
        tom: encerramento.tom,
      });
    }
  }
  return lista.sort((a, b) => Date.parse(b.quando) - Date.parse(a.quando)).slice(0, MAXIMO_EVENTOS);
}

/** Monta os alertas disparados e os eventos recentes. */
export function montarNotificacoes(dados: DadosNotificacoes): {
  disparados: Notificacao[];
  eventos: Notificacao[];
} {
  return { disparados: alertasDisparados(dados), eventos: eventos(dados) };
}
