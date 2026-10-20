/**
 * Sino de notificações da barra superior (Fase 5).
 *
 * Mostra um ponto quando há notificações não lidas (o número também vai no
 * nome do botão, para o leitor de tela) e abre um painel ancorado no sino,
 * sem bloquear a tela: os alertas ativos das Configurações que dispararam
 * (ou "Nenhum alerta disparado") e os eventos recentes, montados a partir dos
 * dados por `montarNotificacoes`. "Marcar como lidas" vale em todas as telas
 * enquanto o app está aberto (só em memória). Esc ou clique fora fecham e o
 * foco volta ao sino. Plano em `.AIs/docs/plans/desktop-frontend-fase-5.md`.
 */

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Bell } from 'lucide-react';
import { create } from 'zustand';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { montarNotificacoes, type Notificacao } from '@/data/notificacoes';
import { useRepositorio } from '@/data/repositorio';
import { chavesConsulta, useResumoEnergia, useTestes, useVibracao } from '@/hooks/useDados';
import { cn } from '@/lib/cn';
import { formatarDataCurta } from '@/lib/format';
import { ROTAS } from '@/routes/navegacao';
import { definirDestino } from '@/stores/destinoBusca';
import { usePreferencias } from '@/stores/preferencias';

/** Ids das notificações já lidas, enquanto o app está aberto. */
export const useNotificacoesLidas = create<{ lidas: string[] }>(() => ({ lidas: [] }));

/** Cor do ponto de cada notificação, pelo tom. */
const COR_PONTO: Record<Notificacao['tom'], string> = {
  danger: 'bg-danger',
  warning: 'bg-warning',
  info: 'bg-info',
  success: 'bg-success',
  neutral: 'bg-fg-muted',
};

/** Alertas disparados e eventos a partir dos dados do app. */
function useNotificacoes() {
  const repositorio = useRepositorio();
  const alertas = usePreferencias((estado) => estado.alertas);
  // O dispositivo sem o resumo da sidebar: o alerta precisa do último contato.
  const dispositivo = useQuery({
    queryKey: chavesConsulta.dispositivo,
    queryFn: () => repositorio.obterDispositivo(),
    enabled: !repositorio.cadastroReal,
  });
  const hoje = useResumoEnergia('dia');
  const vibracao = useVibracao();
  const testes = useTestes({ tamanhoPagina: 100 });
  return useMemo(
    () =>
      montarNotificacoes({
        alertas,
        agora: repositorio.agora(),
        dispositivo: repositorio.cadastroReal ? undefined : dispositivo.data,
        eficienciaHojePercentual: hoje.data?.eficienciaPercentual,
        temperaturaBlocoC: vibracao.data?.temperaturaBlocoC,
        testes: testes.data?.itens,
      }),
    [alertas, repositorio, dispositivo.data, hoje.data, vibracao.data, testes.data],
  );
}

/** "04/10 18:05" a partir de uma data ISO com fuso (data e hora locais do texto). */
function quandoFoi(iso: string): string {
  return `${formatarDataCurta(iso.slice(0, 10))} ${iso.slice(11, 16)}`;
}

/** Uma notificação: ponto do tom, título, detalhe e quando. */
function ItemNotificacao({ notificacao, lida }: { notificacao: Notificacao; lida: boolean }) {
  return (
    <li className="flex gap-3 rounded-control px-3 py-2.5 hover:bg-hover/40">
      <span
        aria-hidden="true"
        className={cn('mt-1.5 size-2 shrink-0 rounded-full', COR_PONTO[notificacao.tom])}
      />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className={cn('text-[13px]', lida ? 'text-fg-secondary' : 'font-medium text-fg')}>
          {notificacao.titulo}
          {!lida && <span className="sr-only"> (não lida)</span>}
        </span>
        <span className="truncate text-xs text-fg-muted">{notificacao.detalhe}</span>
      </span>
      <span className="shrink-0 font-mono text-[11px] text-fg-muted">
        {quandoFoi(notificacao.quando)}
      </span>
    </li>
  );
}

/** Sino com o ponto de não lidas e o painel das notificações. */
export function Notificacoes() {
  const repositorio = useRepositorio();
  const navegar = useNavigate();
  const { disparados, eventos } = useNotificacoes();
  const lidas = useNotificacoesLidas((estado) => estado.lidas);
  const [aberto, setAberto] = useState(false);
  const idPainel = useId();
  const idTitulo = useId();
  const raiz = useRef<HTMLDivElement>(null);
  const painel = useRef<HTMLDivElement>(null);
  const sino = useRef<HTMLButtonElement>(null);

  const todas = [...disparados, ...eventos];
  const naoLidas = todas.filter((n) => !lidas.includes(n.id)).length;

  /** Fecha o painel; com `devolverFoco`, o foco volta ao sino. */
  function fechar(devolverFoco: boolean) {
    setAberto(false);
    if (devolverFoco) sino.current?.focus();
  }

  // Aberto: o foco vai ao painel; Esc ou clique fora fecham.
  useEffect(() => {
    if (!aberto) return undefined;
    painel.current?.focus();
    const tecla = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') fechar(true);
    };
    const clique = (evento: PointerEvent) => {
      if (!raiz.current?.contains(evento.target as Node)) fechar(false);
    };
    document.addEventListener('keydown', tecla);
    document.addEventListener('pointerdown', clique);
    return () => {
      document.removeEventListener('keydown', tecla);
      document.removeEventListener('pointerdown', clique);
    };
  }, [aberto]);

  /** Leva às Configurações, já na seção Alertas. */
  function configurarAlertas() {
    definirDestino({ tipo: 'secao', id: 'alertas' });
    setAberto(false);
    navegar(ROTAS.configuracoes);
  }

  return (
    <div ref={raiz} className="relative">
      <IconButton
        ref={sino}
        icon={Bell}
        label={naoLidas > 0 ? `Notificações, ${naoLidas} não lidas` : 'Notificações'}
        indicator={naoLidas > 0}
        aria-expanded={aberto}
        aria-controls={aberto ? idPainel : undefined}
        onClick={() => (aberto ? fechar(false) : setAberto(true))}
      />
      {aberto && (
        <div
          ref={painel}
          id={idPainel}
          role="dialog"
          aria-labelledby={idTitulo}
          tabIndex={-1}
          className="absolute top-full right-0 z-40 mt-2 flex w-[min(380px,calc(100vw-2rem))] flex-col gap-3 rounded-card border border-line bg-surface p-4 shadow-elevation-1 outline-none"
        >
          <header className="flex items-center justify-between gap-3 px-1">
            <h2 id={idTitulo} className="text-base font-semibold text-fg">
              {repositorio.cadastroReal ? 'Notificações de demonstração' : 'Notificações'}
            </h2>
            <Button
              variant="ghost"
              className="h-8 px-3 text-xs"
              disabled={naoLidas === 0}
              onClick={() => useNotificacoesLidas.setState({ lidas: todas.map((n) => n.id) })}
            >
              Marcar como lidas
            </Button>
          </header>

          <section className="flex flex-col gap-1">
            <h3 className="px-1 font-label text-xs text-fg-muted">Alertas</h3>
            {disparados.length > 0 ? (
              <ul aria-label="Alertas disparados" className="flex flex-col">
                {disparados.map((n) => (
                  <ItemNotificacao key={n.id} notificacao={n} lida={lidas.includes(n.id)} />
                ))}
              </ul>
            ) : (
              <p className="px-1 py-1.5 text-[13px] text-fg-secondary">Nenhum alerta disparado.</p>
            )}
          </section>

          <section className="flex flex-col gap-1 border-t border-line-subtle pt-3">
            <h3 className="px-1 font-label text-xs text-fg-muted">Recentes</h3>
            {eventos.length > 0 ? (
              <ul aria-label="Recentes" className="flex flex-col">
                {eventos.map((n) => (
                  <ItemNotificacao key={n.id} notificacao={n} lida={lidas.includes(n.id)} />
                ))}
              </ul>
            ) : (
              <p className="px-1 py-1.5 text-[13px] text-fg-secondary">Nada recente.</p>
            )}
          </section>

          <footer className="border-t border-line-subtle pt-3">
            <button
              type="button"
              onClick={configurarAlertas}
              className="px-1 text-[13px] font-medium text-accent hover:underline"
            >
              Configurar alertas
            </button>
          </footer>
        </div>
      )}
    </div>
  );
}
