/**
 * Tela Testes de campo do app desktop (referência: design-reference/04-testes).
 *
 * Histórico de testes com abas por status e paginação, painel do teste em
 * andamento, comparação de testes encerrados e as ações (planejar, iniciar,
 * finalizar, cancelar) em diálogos. Plano e decisões em
 * `.AIs/docs/plans/desktop-frontend-testes.md`; segue a task D08 da equipe:
 * a tela só mostra o novo estado depois da resposta do repositório.
 */

import { useState } from 'react';
import { GitCompareArrows, Plus } from 'lucide-react';
import { Page } from '@/components/layout/Page';
import { ComparacaoTestes } from '@/components/testes/ComparacaoTestes';
import {
  DialogoCancelar,
  DialogoFinalizar,
  DialogoIniciar,
  DialogoNovoTeste,
} from '@/components/testes/Dialogos';
import { PainelTesteAtivo } from '@/components/testes/PainelTesteAtivo';
import { TabelaHistorico, TAMANHO_PAGINA_HISTORICO } from '@/components/testes/TabelaHistorico';
import { Button } from '@/components/ui/Button';
import { formatarIsoComFuso } from '@/data/calculos';
import { useRepositorio } from '@/data/repositorio';
import type { StatusTeste, TesteCampo } from '@/data/tipos';
import { consumirDestino } from '@/stores/destinoBusca';

/** Mínimo de testes para comparar (contrato do backend). */
const MINIMO_COMPARACAO = 2;
/** Fuso de Brasília em minutos, para comparar com os horários dos testes. */
const FUSO_MINUTOS = -180;

/** Ação aberta num diálogo, com o teste a que se refere. */
type DialogoAberto =
  { tipo: 'novo' } | { tipo: 'iniciar' | 'finalizar' | 'cancelar'; teste: TesteCampo } | null;

/** Renderiza a tela Testes de campo. */
export function TestesPage() {
  const repositorio = useRepositorio();
  // Aberta pela busca geral, a tela começa em "Todos", na página do teste
  // escolhido, com a linha dele destacada.
  const [destino] = useState(() => consumirDestino('teste'));
  const [aba, setAba] = useState<StatusTeste | 'todos'>('todos');
  const [pagina, setPagina] = useState(
    destino?.tipo === 'teste' ? Math.floor(destino.indice / TAMANHO_PAGINA_HISTORICO) + 1 : 1,
  );
  const [selecionados, setSelecionados] = useState<Map<string, TesteCampo>>(new Map());
  const [comparados, setComparados] = useState<TesteCampo[] | null>(null);
  const [dialogo, setDialogo] = useState<DialogoAberto>(null);
  const agora = formatarIsoComFuso(repositorio.agora(), FUSO_MINUTOS);

  /** Trocar de aba volta para a primeira página. */
  const trocarAba = (nova: StatusTeste | 'todos') => {
    setAba(nova);
    setPagina(1);
  };

  /** Marca ou desmarca um teste para a comparação. */
  const alternarSelecao = (teste: TesteCampo) => {
    setSelecionados((atual) => {
      const proximo = new Map(atual);
      if (proximo.has(teste.id)) proximo.delete(teste.id);
      else proximo.set(teste.id, teste);
      return proximo;
    });
  };

  const testeDo = (tipo: 'iniciar' | 'finalizar' | 'cancelar') =>
    dialogo && dialogo.tipo === tipo ? dialogo.teste : null;
  const fecharDialogo = () => setDialogo(null);

  return (
    <Page
      title="Testes de campo"
      subtitle="Compare configurações e terrenos"
      actions={
        <>
          <Button
            variant="secondary"
            icon={GitCompareArrows}
            disabled={selecionados.size < MINIMO_COMPARACAO}
            onClick={() => setComparados([...selecionados.values()])}
          >
            {`Comparar (${selecionados.size})`}
          </Button>
          <Button icon={Plus} onClick={() => setDialogo({ tipo: 'novo' })}>
            Novo teste
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
        <TabelaHistorico
          onIniciar={teste => setDialogo({ tipo: 'iniciar', teste })}
          onFinalizar={teste => setDialogo({ tipo: 'finalizar', teste })}
          onCancelar={teste => setDialogo({ tipo: 'cancelar', teste })}
          aba={aba}
          onTrocarAba={trocarAba}
          pagina={pagina}
          onTrocarPagina={setPagina}
          selecionados={selecionados}
          onAlternarSelecao={alternarSelecao}
          agora={agora}
          destacadoId={destino?.id ?? null}
        />
        <div className="flex flex-col gap-4">
          <PainelTesteAtivo
            agora={agora}
            onFinalizar={(teste) => setDialogo({ tipo: 'finalizar', teste })}
            onCancelar={(teste) => setDialogo({ tipo: 'cancelar', teste })}
            onIniciar={(teste) => setDialogo({ tipo: 'iniciar', teste })}
          />
          <ComparacaoTestes testes={comparados} />
        </div>
      </div>
      <DialogoNovoTeste aberto={dialogo?.tipo === 'novo'} onFechar={fecharDialogo} />
      <DialogoIniciar teste={testeDo('iniciar')} onFechar={fecharDialogo} />
      <DialogoFinalizar teste={testeDo('finalizar')} onFechar={fecharDialogo} />
      <DialogoCancelar teste={testeDo('cancelar')} onFechar={fecharDialogo} />
    </Page>
  );
}
