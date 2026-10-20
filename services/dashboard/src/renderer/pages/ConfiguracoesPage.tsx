/**
 * Tela Configurações do app desktop (referência: design-reference/07-configuracoes).
 *
 * Perfil, unidades e exibição, alertas, tarifa de energia, sessões e sobre o
 * VERS. As mudanças ficam num rascunho até "Salvar alterações"; "Descartar"
 * volta ao que estava salvo. Preferências valem no app todo e ficam no
 * aparelho; o perfil é salvo no repositório. Plano em
 * `.AIs/docs/plans/desktop-frontend-configuracoes.md`. Não mostra o badge
 * "Dados de exemplo" porque a tela não exibe medições.
 */

import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import {
  SecaoAlertas,
  SecaoPerfil,
  SecaoSessoes,
  SecaoSobre,
  SecaoTarifa,
  SecaoUnidades,
} from '@/components/configuracoes/Secoes';
import { SECOES_CONFIGURACOES } from '@/components/configuracoes/listaSecoes';
import { Page } from '@/components/layout/Page';
import { Button } from '@/components/ui/Button';
import { EstadoConsulta } from '@/components/ui/EstadoConsulta';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAcoesPerfil, useUsuarioAtual } from '@/hooks/useDados';
import { useRepositorio } from '@/data/repositorio';
import { cn } from '@/lib/cn';
import { formatarNumero } from '@/lib/format';
import { consumirDestino } from '@/stores/destinoBusca';
import { usePreferencias, type Alerta, type Unidades } from '@/stores/preferencias';

/** Tudo o que a tela edita antes de salvar. */
interface Rascunho {
  nome: string;
  foto: string | undefined;
  unidades: Unidades;
  reduzirMovimento: boolean;
  alertas: Alerta[];
  /** Tarifa como digitada (vazia = sem tarifa). */
  tarifa: string;
}

/** Seções do painel de ajustes, na ordem da tela. */
const SECOES = SECOES_CONFIGURACOES;

/**
 * Lê a tarifa digitada (aceita vírgula). Vazio vira `null` (sem tarifa);
 * texto que não é um número positivo vira `undefined` (erro).
 */
function lerTarifa(texto: string): number | null | undefined {
  const limpo = texto.trim().replace(',', '.');
  if (!limpo) return null;
  const valor = Number(limpo);
  return Number.isFinite(valor) && valor > 0 ? valor : undefined;
}

/** Rascunho com o que está salvo agora (perfil do repositório e preferências do aparelho). */
function rascunhoSalvo(nome: string, foto: string | undefined): Rascunho {
  const { unidades, reduzirMovimento, alertas, tarifaPorKwh } = usePreferencias.getState();
  return {
    nome,
    foto,
    unidades,
    reduzirMovimento,
    alertas,
    tarifa: tarifaPorKwh === null ? '' : formatarNumero(tarifaPorKwh, 2),
  };
}

/** Renderiza a tela Configurações. */
export function ConfiguracoesPage() {
  const fotoEditavel = useRepositorio().fotoLocalPermitida !== false;
  const usuario = useUsuarioAtual();
  const { atualizar } = useAcoesPerfil();
  const [salvo, setSalvo] = useState<Rascunho | null>(null);
  const [rascunho, setRascunho] = useState<Rascunho | null>(null);
  const [erroTarifa, setErroTarifa] = useState<string | undefined>();
  const [mensagem, setMensagem] = useState<string | null>(null);
  // Seção escolhida na busca geral (barra superior), se a tela abriu por ela.
  const [destino] = useState(() => consumirDestino('secao'));
  const [secaoAtiva, setSecaoAtiva] = useState<string>(destino?.id ?? 'perfil');
  const carregado = rascunho !== null;

  // Aberta pela busca, a tela rola até a seção quando o conteúdo chega.
  useEffect(() => {
    if (destino && carregado) {
      document.getElementById(destino.id)?.scrollIntoView?.({ block: 'start' });
    }
  }, [destino, carregado]);

  // Quando o perfil chega, o rascunho começa igual ao salvo.
  useEffect(() => {
    if (usuario.data && salvo === null) {
      const inicial = rascunhoSalvo(usuario.data.nome, usuario.data.foto);
      setSalvo(inicial);
      setRascunho(inicial);
    }
  }, [usuario.data, salvo]);

  const alterado =
    rascunho !== null && salvo !== null && JSON.stringify(rascunho) !== JSON.stringify(salvo);

  /** Aplica uma mudança ao rascunho e apaga o aviso de "salvo". */
  function editar(mudanca: Partial<Rascunho>) {
    setRascunho((atual) => (atual ? { ...atual, ...mudanca } : atual));
    setMensagem(null);
  }

  /** Valida a tarifa, salva o perfil (se mudou) e grava as preferências. */
  async function salvarAlteracoes() {
    if (!rascunho || !salvo) return;
    const tarifaPorKwh = lerTarifa(rascunho.tarifa);
    if (tarifaPorKwh === undefined) {
      setErroTarifa('Informe um valor positivo, como 0,95.');
      setSecaoAtiva('tarifa');
      return;
    }
    setErroTarifa(undefined);
    if (rascunho.nome !== salvo.nome || rascunho.foto !== salvo.foto) {
      try {
        await atualizar.mutateAsync({ nome: rascunho.nome, foto: rascunho.foto ?? null });
      } catch (erro) {
        setMensagem(erro instanceof Error ? erro.message : 'Não foi possível salvar o perfil.');
        return;
      }
    }
    usePreferencias.getState().salvar({
      unidades: rascunho.unidades,
      reduzirMovimento: rascunho.reduzirMovimento,
      alertas: rascunho.alertas,
      tarifaPorKwh,
    });
    setSalvo(rascunho);
    setMensagem('Alterações salvas.');
  }

  /** Volta o rascunho ao que está salvo. */
  function descartar() {
    setRascunho(salvo);
    setErroTarifa(undefined);
    setMensagem(null);
  }

  /** Marca a seção no painel e rola até ela. */
  function irParaSecao(id: string) {
    setSecaoAtiva(id);
    document.getElementById(id)?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
  }

  return (
    <Page
      title="Configurações"
      subtitle="Perfil, unidades, alertas e sessões"
      sampleData={false}
      actions={
        <>
          <Button variant="secondary" disabled={!alterado} onClick={descartar}>
            Descartar
          </Button>
          <Button
            icon={Check}
            disabled={!alterado || atualizar.isPending}
            onClick={() => void salvarAlteracoes()}
          >
            Salvar alterações
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-6">
        <nav
          aria-label="Painel de ajustes"
          className="-mx-4 flex gap-1 overflow-x-auto px-4 sm:-mx-6 sm:px-6 lg:sticky lg:top-0 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0"
        >
          <span className="mb-2 hidden px-3 font-label text-[11px] tracking-[0.08em] text-fg-muted uppercase lg:block">
            Painel de ajustes
          </span>
          {SECOES.map((secao) => (
            <button
              key={secao.id}
              type="button"
              aria-current={secaoAtiva === secao.id ? 'true' : undefined}
              onClick={() => irParaSecao(secao.id)}
              className={cn(
                'shrink-0 rounded-control border px-3 py-2.5 text-left text-sm whitespace-nowrap transition-colors',
                secaoAtiva === secao.id
                  ? 'border-accent-border bg-accent-subtle text-accent'
                  : 'border-transparent text-fg-secondary hover:bg-hover hover:text-fg',
              )}
            >
              {secao.rotulo}
            </button>
          ))}
        </nav>
        <div className="flex flex-col gap-4">
          {mensagem && (
            <p
              role="status"
              className="rounded-control border border-success/30 bg-success-subtle px-4 py-2 text-[13px] text-success"
            >
              {mensagem}
            </p>
          )}
          <EstadoConsulta
            consulta={usuario}
            nome="o perfil"
            carregando={<Skeleton className="h-48 w-full" />}
          >
            {(dados) =>
              rascunho ? (
                <SecaoPerfil
                  fotoEditavel={fotoEditavel}
                  usuario={dados}
                  nome={rascunho.nome}
                  foto={rascunho.foto}
                  onNome={(nome) => editar({ nome })}
                  onFoto={(foto) => editar({ foto })}
                />
              ) : null
            }
          </EstadoConsulta>
          {rascunho && (
            <>
              <SecaoUnidades
                unidades={rascunho.unidades}
                reduzirMovimento={rascunho.reduzirMovimento}
                onUnidades={(unidades) => editar({ unidades })}
                onReduzirMovimento={(reduzirMovimento) => editar({ reduzirMovimento })}
              />
              <SecaoAlertas
                alertas={rascunho.alertas}
                onAlertas={(alertas) => editar({ alertas })}
              />
              <SecaoTarifa
                tarifa={rascunho.tarifa}
                erro={erroTarifa}
                onTarifa={(tarifa) => editar({ tarifa })}
              />
            </>
          )}
          <SecaoSessoes />
          <SecaoSobre />
        </div>
      </div>
    </Page>
  );
}
