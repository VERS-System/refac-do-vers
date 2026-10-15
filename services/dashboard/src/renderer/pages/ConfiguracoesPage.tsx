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
import { Page } from '@/components/layout/Page';
import { Button } from '@/components/ui/Button';
import { EstadoConsulta } from '@/components/ui/EstadoConsulta';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAcoesPerfil, useUsuarioAtual } from '@/hooks/useDados';
import { cn } from '@/lib/cn';
import { formatarNumero } from '@/lib/format';
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
const SECOES = [
  { id: 'perfil', rotulo: 'Perfil' },
  { id: 'unidades', rotulo: 'Unidades e exibição' },
  { id: 'alertas', rotulo: 'Alertas' },
  { id: 'tarifa', rotulo: 'Tarifa de energia' },
  { id: 'sessoes', rotulo: 'Sessões e segurança' },
  { id: 'sobre', rotulo: 'Sobre o VERS' },
];

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
  const usuario = useUsuarioAtual();
  const { atualizar } = useAcoesPerfil();
  const [salvo, setSalvo] = useState<Rascunho | null>(null);
  const [rascunho, setRascunho] = useState<Rascunho | null>(null);
  const [erroTarifa, setErroTarifa] = useState<string | undefined>();
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [secaoAtiva, setSecaoAtiva] = useState('perfil');

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
      <div className="grid grid-cols-[220px_minmax(0,1fr)] items-start gap-6">
        <nav aria-label="Painel de ajustes" className="sticky top-0 flex flex-col gap-1">
          <span className="mb-2 px-3 font-label text-[11px] tracking-[0.08em] text-fg-muted uppercase">
            Painel de ajustes
          </span>
          {SECOES.map((secao) => (
            <button
              key={secao.id}
              type="button"
              aria-current={secaoAtiva === secao.id ? 'true' : undefined}
              onClick={() => irParaSecao(secao.id)}
              className={cn(
                'rounded-control border px-3 py-2.5 text-left text-sm transition-colors',
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
