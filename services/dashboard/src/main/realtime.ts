/** Conecta avisos autenticados no main e descarta trabalho de observações antigas. */
import { io, type Socket } from 'socket.io-client';
import { validarApiLocal } from './sessao';
import type { ResultadoSessao } from '../shared/sessao';
import type { AvisoTempoReal, ObservacaoTempoReal, RecursoTempoReal } from '../shared/realtime';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
type Credencial = { ok: true; cookie: string } | Extract<ResultadoSessao, { ok: false }>;
type Conexao = { dados: ObservacaoTempoReal; socket?: Socket; timer?: ReturnType<typeof setTimeout>; espera: number };

/** Exige objetos sem campos extras antes de acessar o contrato recebido. */
function objeto(valor: unknown, campos: string[]): valor is Record<string, unknown> {
  return !!valor && typeof valor === 'object' && !Array.isArray(valor) && Object.keys(valor).every(c => campos.includes(c));
}

/** Aceita somente testes/instalações identificados por UUID v4. */
function recursoValido(valor: unknown): valor is RecursoTempoReal {
  return objeto(valor, ['type', 'id']) && (valor.type === 'test' || valor.type === 'installation') &&
    typeof valor.id === 'string' && UUID.test(valor.id);
}

/** Compara identidade do recurso sem distinguir caixa do UUID. */
function mesmoRecurso(a: RecursoTempoReal, b: RecursoTempoReal): boolean {
  return a.type === b.type && a.id.toLowerCase() === b.id.toLowerCase();
}

/** Valida o aviso mínimo sem transformar occurredAt em cursor ou aceitar datas inexistentes. */
function eventoValido(valor: unknown): valor is { resource: RecursoTempoReal } {
  if (!objeto(valor, ['version', 'type', 'resource', 'occurredAt']) || valor.version !== 1 ||
    valor.type !== 'data.updated' || !recursoValido(valor.resource) || typeof valor.occurredAt !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(valor.occurredAt)) return false;
  const instante = new Date(valor.occurredAt);
  return Number.isFinite(instante.getTime()) && instante.toISOString().slice(0, 19) === valor.occurredAt.slice(0, 19);
}

/** Mantém um socket por janela, com recursos limitados e credenciais obtidas novamente a cada conexão. */
export function criarTempoReal(endereco: string, preparar: () => Promise<Credencial>, notificar: (aviso: AvisoTempoReal) => void) {
  const destino = `${new URL(validarApiLocal(endereco)).origin}/realtime`;
  let atual: Conexao | undefined;

  /** Libera transporte/timer antes de permitir outra identidade ou observação. */
  function encerrar(): void {
    const anterior = atual; atual = undefined;
    if (anterior) liberar(anterior);
  }

  /** Remove listeners antes de desconectar para não agendar reconexão por cancelamento local. */
  function liberar(conexao: Conexao): void {
    clearTimeout(conexao.timer); conexao.timer = undefined;
    conexao.socket?.removeAllListeners(); conexao.socket?.disconnect(); conexao.socket = undefined;
  }

  /** Sinaliza indisponibilidade sem vazar causa e limita a espera exponencial a trinta segundos. */
  function repetir(conexao: Conexao): void {
    if (atual !== conexao) return;
    liberar(conexao);
    notificar({ observacao: conexao.dados.observacao, tipo: 'desconectado' });
    conexao.timer = setTimeout(() => { conexao.timer = undefined; void conectar(conexao); }, conexao.espera);
    conexao.espera = Math.min(conexao.espera * 2, 30_000);
  }

  /** Confirma cada assinatura em série; o backend recusa operações concorrentes por socket. */
  async function assinar(conexao: Conexao, socket: Socket): Promise<void> {
    for (const recurso of conexao.dados.recursos) {
      if (atual !== conexao || conexao.socket !== socket) return;
      try {
        const ack: unknown = await socket.timeout(5000).emitWithAck('subscribe', { version: 1, resource: recurso });
        if (atual !== conexao || conexao.socket !== socket) return;
        if (objeto(ack, ['ok', 'version', 'resource']) && ack.ok === true && ack.version === 1 &&
          recursoValido(ack.resource) && mesmoRecurso(ack.resource, recurso)) {
          notificar({ observacao: conexao.dados.observacao, tipo: 'pronto', recurso });
        } else if (objeto(ack, ['ok', 'version', 'code']) && ack.ok === false && ack.version === 1 && ack.code === 'RESOURCE_UNAVAILABLE') {
          notificar({ observacao: conexao.dados.observacao, tipo: 'recurso-indisponivel', recurso });
        } else { repetir(conexao); return; }
      } catch { if (conexao.socket === socket) repetir(conexao); return; }
    }
    conexao.espera = 1000;
  }

  /** Revalida perfil/cookie e instala todos os listeners antes de abrir o transporte. */
  async function conectar(conexao: Conexao): Promise<void> {
    if (atual !== conexao) return;
    notificar({ observacao: conexao.dados.observacao, tipo: 'conectando' });
    try {
      const credencial = await preparar();
      if (atual !== conexao) return;
      if (!credencial.ok) {
        if (credencial.status === 401) {
          notificar({ observacao: conexao.dados.observacao, tipo: 'sessao-expirada' }); encerrar();
        } else repetir(conexao);
        return;
      }
      if (!/^vers_access=[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(credencial.cookie)) { repetir(conexao); return; }
      const socket = io(destino, { path: '/socket.io', autoConnect: false, reconnection: false, forceNew: true,
        transports: ['websocket'], timeout: 10_000,
        extraHeaders: { Origin: 'http://localhost:5174', Cookie: credencial.cookie } });
      conexao.socket = socket;
      socket.on('data.updated', (evento: unknown) => {
        if (atual !== conexao || conexao.socket !== socket || !eventoValido(evento)) return;
        const recurso = conexao.dados.recursos.find(r => mesmoRecurso(r, evento.resource));
        if (recurso) notificar({ observacao: conexao.dados.observacao, tipo: 'atualizacao', recurso });
      });
      socket.on('connect', () => { void assinar(conexao, socket); });
      socket.on('disconnect', () => { if (conexao.socket === socket) repetir(conexao); });
      socket.on('connect_error', () => { if (conexao.socket === socket) repetir(conexao); });
      socket.connect();
    } catch { repetir(conexao); }
  }

  /** Substitui atomicamente os recursos, recusando duplicatas, excesso e comandos arbitrários. */
  function observar(dados: unknown): ResultadoSessao {
    if (!objeto(dados, ['observacao', 'recursos']) || typeof dados.observacao !== 'string' || !UUID.test(dados.observacao) ||
      !Array.isArray(dados.recursos) || dados.recursos.length > 20 || !dados.recursos.every(recursoValido) ||
      dados.recursos.some((r, i, recursos) => recursos.slice(0, i).some(a => mesmoRecurso(a, r)))) {
      return { ok: false, status: 400, erro: 'REQUISICAO_INVALIDA' };
    }
    encerrar();
    if (dados.recursos.length) {
      const conexao: Conexao = { dados: { observacao: dados.observacao,
        recursos: dados.recursos.map(r => ({ type: r.type, id: r.id.toLowerCase() })) }, espera: 1000 };
      atual = conexao; void conectar(conexao);
    }
    return { ok: true };
  }
  return { observar, encerrar };
}
