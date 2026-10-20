/** Liga recursos usados pelas telas à ponte autenticada, sem abrir sockets no renderer. */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { PonteTempoReal, RecursoTempoReal } from '../../shared/realtime';
import { consultaDoRecurso, criarAtualizadorTempoReal } from './tempoReal';

const Contexto = createContext<((recursos: RecursoTempoReal[]) => () => void) | null>(null);

/** Conta consumidores de cada recurso e substitui observação somente quando muda o conjunto. */
export function TempoRealProvider({ ponte, aoExpirar, children }: {
  ponte: PonteTempoReal; aoExpirar?: () => void; children: ReactNode;
}) {
  const cliente = useQueryClient();
  const recursos = useRef(new Map<string, { recurso: RecursoTempoReal; total: number }>());
  const [revisao, alterar] = useState(0);
  const [mensagem, informar] = useState('Tempo real: aguardando seleção de dados.');
  const expirar = useRef(aoExpirar); expirar.current = aoExpirar;
  const registrar = useCallback((lista: RecursoTempoReal[]) => {
    for (const recurso of lista) {
      const chave = `${recurso.type}:${recurso.id}`; const antes = recursos.current.get(chave);
      recursos.current.set(chave, { recurso, total: (antes?.total ?? 0) + 1 });
    }
    alterar(v => v + 1);
    return () => {
      for (const recurso of lista) {
        const chave = `${recurso.type}:${recurso.id}`; const antes = recursos.current.get(chave);
        if (antes && antes.total > 1) antes.total--; else recursos.current.delete(chave);
      }
      alterar(v => v + 1);
    };
  }, []);
  const conjunto = useMemo(() => JSON.stringify([...recursos.current.values()].map(v => v.recurso)
    .sort((a, b) => `${a.type}:${a.id}`.localeCompare(`${b.type}:${b.id}`))), [revisao]);

  useEffect(() => {
    const lista = JSON.parse(conjunto) as RecursoTempoReal[];
    let ativo = true; let observacao = ''; const prontos = new Set<string>(); let negado = false;
    const atualizador = criarAtualizadorTempoReal(cliente);
    /** Refaz assinatura e snapshot em retorno de foco, preservando o polling já aprovado. */
    function observar() {
      if (!ativo) return;
      observacao = crypto.randomUUID(); prontos.clear(); negado = false;
      if (lista.length > 20) { informar('Tempo real indisponível: limite de recursos. Consultas REST mantidas.'); return; }
      informar(lista.length ? 'Tempo real: conectando. Consultas REST mantidas.' : 'Tempo real: aguardando seleção de dados.');
      const id = observacao;
      void ponte.observar({ observacao: id, recursos: lista }).then(resultado => {
        if (ativo && observacao === id && !resultado.ok) informar('Tempo real indisponível. Consultas REST mantidas.');
      }).catch(() => { if (ativo && observacao === id) informar('Tempo real indisponível. Consultas REST mantidas.'); });
    }
    // O listener antecede o IPC para não perder nem mesmo um ACK imediato.
    const remover = ponte.receber(aviso => {
      if (!ativo || aviso.observacao !== observacao) return;
      if (aviso.tipo === 'sessao-expirada') {
        informar('Sessão expirada. Entre novamente.'); void cliente.cancelQueries(); cliente.clear(); expirar.current?.();
      } else if (aviso.tipo === 'desconectado' || aviso.tipo === 'conectando') {
        prontos.clear(); informar('Tempo real desconectado. Consultas REST mantidas; valores podem estar desatualizados.');
      } else if ('recurso' in aviso && lista.some(r => r.type === aviso.recurso.type && r.id === aviso.recurso.id)) {
        if (aviso.tipo === 'recurso-indisponivel') {
          negado = true; informar('Recurso indisponível no tempo real. Conferindo acesso pelo REST.');
          void cliente.resetQueries({ predicate: q => consultaDoRecurso(q, aviso.recurso) });
        } else {
          if (aviso.tipo === 'pronto') prontos.add(`${aviso.recurso.type}:${aviso.recurso.id}`);
          atualizador.avisar(aviso.recurso);
          if (!negado && prontos.size === lista.length) informar('Tempo real conectado. Avisos ativos; valores conferidos pelo REST.');
        }
      }
    });
    const timer = setTimeout(observar, 50);
    window.addEventListener('focus', observar);
    return () => {
      ativo = false; clearTimeout(timer); remover(); atualizador.encerrar(); window.removeEventListener('focus', observar);
      void ponte.observar({ observacao: crypto.randomUUID(), recursos: [] }).catch(() => {});
    };
  }, [cliente, ponte, conjunto]);
  return <Contexto.Provider value={registrar}>{children}
    <p role="status" aria-label="Tempo real" className="fixed right-3 bottom-2 z-40 max-w-md rounded bg-canvas px-3 py-1 text-xs text-fg-muted">{mensagem}</p>
  </Contexto.Provider>;
}

/** Compartilha assinatura entre consumidores; desmontar um não remove os demais. */
export function useRecursosTempoReal(lista: RecursoTempoReal[]) {
  const registrar = useContext(Contexto); const chave = JSON.stringify(lista);
  useEffect(() => registrar?.(JSON.parse(chave)), [registrar, chave]);
}
