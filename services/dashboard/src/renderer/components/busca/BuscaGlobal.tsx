/**
 * Busca geral da barra superior (Fase 5): botão com lupa e atalho Ctrl+K
 * (Cmd+K no macOS) que abrem um diálogo de busca.
 *
 * Procura nas telas, nas seções das Configurações, nos testes (pelo código ou
 * nome) e nos veículos (pelo nome ou placa), com os dados do app, sem
 * backend. O campo segue o padrão combobox do WAI-ARIA: setas percorrem a
 * lista, a opção ativa é anunciada por `aria-activedescendant` e Enter ou
 * clique abrem o item: a tela, ou a tela com o item escolhido (o teste
 * destacado no histórico, o veículo nos detalhes, a seção das
 * Configurações). Plano em `.AIs/docs/plans/desktop-frontend-fase-5.md`.
 */

import { useEffect, useId, useMemo, useState, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { SECOES_CONFIGURACOES } from '@/components/configuracoes/listaSecoes';
import { TEXTO_TERRENO } from '@/components/testes/rotulos';
import { Dialog } from '@/components/ui/Dialog';
import { IconButton } from '@/components/ui/IconButton';
import { nomeDoVeiculo } from '@/components/veiculos/ListaVeiculos';
import { useTestes, useVeiculos } from '@/hooks/useDados';
import { buscar, type ItemBusca } from '@/lib/busca';
import { cn } from '@/lib/cn';
import { formatarDataCurta } from '@/lib/format';
import { NAVEGACAO_PRINCIPAL, ROTAS } from '@/routes/navegacao';
import { definirDestino, type DestinoBusca } from '@/stores/destinoBusca';

/** Item da busca com o destino que a tela aberta deve mostrar. */
type ItemComDestino = ItemBusca & { destino?: DestinoBusca };

/** Monta o índice: telas, seções, testes (mais recentes primeiro) e veículos. */
function useIndiceBusca(): ItemComDestino[] {
  const testes = useTestes({ tamanhoPagina: 100 });
  const veiculos = useVeiculos();
  return useMemo(() => {
    const telas: ItemComDestino[] = NAVEGACAO_PRINCIPAL.map((item) => ({
      id: `tela-${item.path}`,
      titulo: item.label,
      grupo: 'Tela',
      rota: item.path,
    }));
    const secoes: ItemComDestino[] = SECOES_CONFIGURACOES.map((secao) => ({
      id: `secao-${secao.id}`,
      titulo: secao.rotulo,
      grupo: 'Configurações',
      rota: ROTAS.configuracoes,
      destino: { tipo: 'secao', id: secao.id },
    }));
    const listaTestes: ItemComDestino[] = (testes.data?.itens ?? []).map((teste, indice) => ({
      id: `teste-${teste.id}`,
      titulo: `Teste ${teste.codigo}`,
      // `formatarDataCurta` recebe só a data (AAAA-MM-DD) do início do teste.
      detalhe: [
        TEXTO_TERRENO[teste.terreno],
        teste.inicio && formatarDataCurta(teste.inicio.slice(0, 10)),
      ]
        .filter(Boolean)
        .join(' · '),
      termos: [teste.nome],
      grupo: 'Teste',
      rota: ROTAS.testes,
      destino: { tipo: 'teste', id: teste.id, indice },
    }));
    const listaVeiculos: ItemComDestino[] = (veiculos.data ?? []).map((veiculo) => ({
      id: `veiculo-${veiculo.id}`,
      titulo: nomeDoVeiculo(veiculo),
      detalhe: veiculo.placa,
      grupo: 'Veículo',
      rota: ROTAS.veiculos,
      destino: { tipo: 'veiculo', id: veiculo.id },
    }));
    return [...telas, ...secoes, ...listaTestes, ...listaVeiculos];
  }, [testes.data, veiculos.data]);
}

/** Diálogo da busca: campo, lista de resultados e o aviso de "nenhum resultado". */
function PainelBusca({ onFechar }: { onFechar: () => void }) {
  const navegar = useNavigate();
  const indice = useIndiceBusca();
  const idLista = useId();
  const [termo, setTermo] = useState('');
  const [ativo, setAtivo] = useState(0);
  const resultados = useMemo(() => buscar(indice, termo) as ItemComDestino[], [indice, termo]);
  const idOpcao = (posicao: number) => `${idLista}-${posicao}`;

  /** Abre o item: guarda o destino para a tela, fecha a busca e navega. */
  function escolher(item: ItemComDestino | undefined) {
    if (!item) return;
    if (item.destino) definirDestino(item.destino);
    onFechar();
    navegar(item.rota);
  }

  /** Setas andam pela lista (em roda); Enter abre a opção ativa. */
  function aoPressionarTecla(evento: KeyboardEvent<HTMLInputElement>) {
    if (resultados.length === 0) return;
    if (evento.key === 'ArrowDown' || evento.key === 'ArrowUp') {
      evento.preventDefault();
      const passo = evento.key === 'ArrowDown' ? 1 : -1;
      setAtivo((atual) => (atual + passo + resultados.length) % resultados.length);
    } else if (evento.key === 'Enter') {
      evento.preventDefault();
      escolher(resultados[ativo]);
    }
  }

  return (
    <Dialog
      aberto
      titulo="Buscar no VERS"
      descricao="Telas, seções das Configurações, testes pelo código e veículos pela placa."
      onFechar={onFechar}
      className="max-w-xl"
    >
      <div className="flex flex-col gap-3">
        <div className="relative">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-fg-muted"
          />
          <input
            role="combobox"
            aria-label="Buscar"
            aria-expanded={resultados.length > 0}
            aria-controls={idLista}
            aria-autocomplete="list"
            aria-activedescendant={resultados.length > 0 ? idOpcao(ativo) : undefined}
            value={termo}
            onChange={(evento) => {
              setTermo(evento.target.value);
              setAtivo(0);
            }}
            onKeyDown={aoPressionarTecla}
            placeholder="Ex.: Energia, #024, DEF4G56"
            className="h-12 w-full rounded-full border border-line bg-inset pr-5 pl-11 text-sm text-fg placeholder:text-fg-muted focus-visible:border-accent-border"
          />
        </div>
        {resultados.length > 0 ? (
          <ul
            id={idLista}
            role="listbox"
            aria-label="Resultados"
            className="flex max-h-80 flex-col gap-1 overflow-y-auto"
          >
            {resultados.map((item, posicao) => (
              <li
                key={item.id}
                id={idOpcao(posicao)}
                role="option"
                aria-selected={posicao === ativo}
                onClick={() => escolher(item)}
                onMouseMove={() => setAtivo(posicao)}
                className={cn(
                  'flex cursor-pointer items-center justify-between gap-3 rounded-control px-3 py-2.5',
                  posicao === ativo ? 'bg-accent-subtle text-accent' : 'text-fg',
                )}
              >
                <span className="flex min-w-0 items-baseline gap-2">
                  <span className="truncate text-sm font-medium">{item.titulo}</span>
                  {item.detalhe && (
                    <span className="truncate font-mono text-xs text-fg-muted">{item.detalhe}</span>
                  )}
                </span>
                <span className="shrink-0 font-label text-xs text-fg-muted">{item.grupo}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p role="status" className="px-3 py-6 text-center text-[13px] text-fg-muted">
            {`Nenhum resultado para “${termo.trim()}”.`}
          </p>
        )}
      </div>
    </Dialog>
  );
}

/** Botão da lupa e o atalho Ctrl+K (ou Cmd+K), que abrem a busca. */
export function BuscaGlobal() {
  const [aberta, setAberta] = useState(false);

  useEffect(() => {
    /** Ctrl+K ou Cmd+K abre a busca de qualquer ponto da tela. */
    const atalho = (evento: globalThis.KeyboardEvent) => {
      if ((evento.ctrlKey || evento.metaKey) && evento.key.toLowerCase() === 'k') {
        evento.preventDefault();
        setAberta(true);
      }
    };
    document.addEventListener('keydown', atalho);
    return () => document.removeEventListener('keydown', atalho);
  }, []);

  return (
    <>
      <IconButton icon={Search} label="Buscar (Ctrl+K)" onClick={() => setAberta(true)} />
      {aberta && <PainelBusca onFechar={() => setAberta(false)} />}
    </>
  );
}
