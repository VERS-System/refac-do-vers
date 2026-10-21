/** Agrupa avisos e preserva a leitura pendente antes de consultar novamente o REST. */
import type { Query, QueryClient } from '@tanstack/react-query';
import type { RecursoTempoReal } from '../../shared/realtime';

/** Localiza todas as páginas/filtros/comparações que dependem do recurso avisado. */
export function consultaDoRecurso(query: Query, recurso: RecursoTempoReal): boolean {
  const [grupo, tipo, filtro] = query.queryKey;
  if (recurso.type === 'installation') return grupo === 'energia' && tipo === 'instalacao' && filtro === recurso.id;
  if (grupo === 'telemetria' && tipo === 'amostras') return (filtro as { testeId?: string } | null)?.testeId === recurso.id;
  return grupo === 'testes' && (tipo === 'busca' || (tipo === 'resumo' && filtro === recurso.id) ||
    (tipo === 'comparacao' && Array.isArray(filtro) && filtro.includes(recurso.id)));
}

/** Marca consultas por hash e só refaz as ativas, sem cancelar dados em trânsito. */
export function criarAtualizadorTempoReal(cliente: QueryClient) {
  const pendentes = new Set<Query>(); let timer: ReturnType<typeof setTimeout> | undefined; let ativo = true;
  /** Agenda um único lote, inclusive quando uma leitura marcada termina depois do aviso. */
  function agendar() {
    if (!ativo || timer || !pendentes.size) return;
    timer = setTimeout(() => {
      timer = undefined;
      for (const query of pendentes) {
        if (query.state.fetchStatus !== 'idle') continue;
        pendentes.delete(query);
        void cliente.invalidateQueries({ predicate: q => q === query }, { cancelRefetch: false });
      }
    }, 100);
  }
  const remover = cliente.getQueryCache().subscribe(evento => {
    if (pendentes.has(evento.query) && evento.query.state.fetchStatus === 'idle') agendar();
  });
  return {
    /** Não deduplica por data: cada aviso pode representar uma persistência tardia. */
    avisar(recurso: RecursoTempoReal) {
      if (!ativo) return;
      cliente.getQueryCache().getAll().filter(q => q.meta?.tempoReal !== false && consultaDoRecurso(q, recurso)).forEach(q => pendentes.add(q));
      agendar();
    },
    /** Impede efeitos sobre o cache da conta seguinte após desmontagem. */
    encerrar() { ativo = false; clearTimeout(timer); pendentes.clear(); remover(); },
  };
}
