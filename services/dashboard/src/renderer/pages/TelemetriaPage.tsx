/**
 * Tela Telemetria do app desktop (referência: design-reference/02-telemetria).
 *
 * Amostras persistidas de um teste de campo, consultadas a cada 10 s: o
 * sinal dos últimos 10 minutos, as últimas leituras com o estado da conexão
 * e a tabela paginada com filtros e exportação em CSV. Plano e decisões em
 * `.AIs/docs/plans/desktop-frontend-telemetria.md`:
 * - a telemetria é por teste (padrão: o em andamento), como a task D05; o
 *   seletor real percorre o histórico; no exemplo, lista os iniciados hoje;
 * - "Ao vivo" repete as consultas a cada 10 s; "Pausado" congela a tela;
 * - não há seletor de período (a referência não tem).
 */

import { useEffect, useRef, useState } from 'react';
import { Download } from 'lucide-react';
import { Page } from '@/components/layout/Page';
import { CardSinal } from '@/components/telemetria/CardSinal';
import { CardUltimasLeituras } from '@/components/telemetria/CardUltimasLeituras';
import { TabelaAmostras } from '@/components/telemetria/TabelaAmostras';
import { Button } from '@/components/ui/Button';
import { Paginacao } from '@/components/ui/Paginacao';
import { estadoConexao } from '@/data/calculos';
import { buscarTodasAmostras } from '@/data/consultasTelemetria';
import { csvAmostrasTelemetria, nomeArquivoTelemetria } from '@/data/exportacao';
import { useRepositorio } from '@/data/repositorio';
import type { QualidadeAmostra, TesteCampo } from '@/data/tipos';
import { useAmostrasTelemetria, useTestes } from '@/hooks/useDados';
import { cn } from '@/lib/cn';
import { baixarArquivo } from '@/lib/download';

/** Intervalo de consulta; não pressupõe a frequência de aquisição do dispositivo. */
const INTERVALO_AO_VIVO_MS = 10_000;
/** Janela do gráfico do sinal. */
const JANELA_SINAL_MS = 10 * 60 * 1000;
/** Itens por página da tabela e quantas leituras recentes mostrar. */
const TAMANHO_PAGINA = 20;
const LEITURAS_RECENTES = 6;

/**
 * Teste exibido: o escolhido pelo usuário ou, por padrão, o em andamento
 * (ou o mais recente, se nenhum estiver em andamento). A lista vem do mais
 * recente para o mais antigo.
 */
function testeExibido(
  testes: TesteCampo[] | undefined,
  escolhido: string | null,
): TesteCampo | undefined {
  if (!testes?.length) return undefined;
  return (
    testes.find((t) => t.id === escolhido) ??
    testes.find((t) => t.estado === 'em-andamento') ??
    testes[0]
  );
}

/** Fuso de Brasília nas datas ISO das consultas. */
const FUSO_BRASILIA = '-03:00';

/**
 * Início da janela do sinal: 10 minutos antes do fim do teste ou, se ele
 * está em andamento, de agora (o relógio do repositório).
 */
function inicioDaJanela(teste: TesteCampo, agora: Date): string {
  const fim = teste.fim ? Date.parse(teste.fim) : agora.getTime();
  return new Date(fim - JANELA_SINAL_MS).toISOString();
}

/** Datas "AAAA-MM-DD" no fuso de Brasília (o en-CA já formata nessa ordem). */
const FORMATO_DATA_BRASILIA = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' });

/**
 * Data de hoje no fuso do dispositivo, para escrever "Hoje" na faixa do
 * teste. Não usa `toISOString`, que dá a data em UTC (depois das 21:00 em
 * Brasília já seria o dia seguinte).
 */
function dataEmBrasilia(instante: Date): string {
  return FORMATO_DATA_BRASILIA.format(instante);
}

/** Botão "Ao vivo": alternador que liga e pausa a atualização periódica. */
function BotaoAoVivo({ ativo, onAlternar }: { ativo: boolean; onAlternar: () => void }) {
  return (
    <Button variant={ativo ? 'primary' : 'secondary'} aria-pressed={ativo} onClick={onAlternar}>
      <span
        aria-hidden="true"
        className={cn('size-2 rounded-full', ativo ? 'ponto-vivo bg-fg-on-accent' : 'bg-fg-muted')}
      />
      Ao vivo
    </Button>
  );
}

/** Renderiza a tela Telemetria. */
export function TelemetriaPage() {
  const repositorio = useRepositorio();
  const [aoVivo, setAoVivo] = useState(true);
  const [testeEscolhido, setTesteEscolhido] = useState<string | null>(null);
  const [qualidade, setQualidade] = useState<QualidadeAmostra | ''>('');
  const [pagina, setPagina] = useState(1);
  const [paginaTestes, setPaginaTestes] = useState(1);
  const [exportando, setExportando] = useState(false);
  const [erroExportacao, setErroExportacao] = useState(false);
  const [agoraJanela, setAgoraJanela] = useState(() => repositorio.agora());
  const ativa = useRef(false);

  // A resposta atrasada de uma conta/tela encerrada nunca inicia um download.
  useEffect(() => {
    ativa.current = true;
    return () => { ativa.current = false; };
  }, []);

  // O relógio avança só no intervalo da consulta; Date.now no render recriaria a chave a cada resposta.
  useEffect(() => {
    if (!aoVivo) return;
    const timer = setInterval(() => setAgoraJanela(repositorio.agora()), INTERVALO_AO_VIVO_MS);
    return () => clearInterval(timer);
  }, [aoVivo, repositorio]);

  const hoje = dataEmBrasilia(agoraJanela);
  const testes = useTestes(repositorio.ensaiosReais ? { pagina: paginaTestes, tamanhoPagina: 100 }
    : { inicioDe: `${hoje}T00:00:00${FUSO_BRASILIA}` });
  const listaTestes = testes.data?.itens;
  const teste = testeExibido(listaTestes, testeEscolhido);
  const intervaloMs = aoVivo ? INTERVALO_AO_VIVO_MS : false;
  const filtroQualidade = qualidade || undefined;

  const tabela = useAmostrasTelemetria(
    teste
      ? { testeId: teste.id, pagina, tamanhoPagina: TAMANHO_PAGINA, qualidade: filtroQualidade }
      : null,
    { intervaloMs },
  );
  const recentes = useAmostrasTelemetria(
    teste ? { testeId: teste.id, tamanhoPagina: LEITURAS_RECENTES } : null,
    {
      intervaloMs,
    },
  );
  const sinal = useAmostrasTelemetria(
    teste
      ? { testeId: teste.id, de: inicioDaJanela(teste, agoraJanela), tamanhoPagina: 100,
          ...(repositorio.ensaiosReais ? { ate: new Date(teste.fim ?? agoraJanela).toISOString() } : {}) }
      : null,
    { intervaloMs },
  );

  const conexao = estadoConexao({
    aoVivo,
    erro: recentes.isError,
    buscando: recentes.isFetching,
    atualizadoEm: recentes.dataUpdatedAt,
    agora: Date.now(),
  });

  /** Troca de teste ou de filtro volta para a primeira página. */
  const trocarTeste = (id: string) => {
    setTesteEscolhido(id);
    setPagina(1);
  };
  const trocarQualidade = (valor: QualidadeAmostra | '') => {
    setQualidade(valor);
    setPagina(1);
  };

  /** Exporta todas as amostras do teste, com o filtro de qualidade atual. */
  const exportar = async () => {
    if (!teste) return;
    setExportando(true);
    setErroExportacao(false);
    try {
      const amostras = await buscarTodasAmostras(repositorio, {
        testeId: teste.id,
        qualidade: filtroQualidade,
      });
      if (!ativa.current) return;
      baixarArquivo(
        nomeArquivoTelemetria(teste.codigo, teste.inicio ?? teste.criadoEm),
        csvAmostrasTelemetria(amostras, teste.codigo, repositorio.ensaiosReais),
        'text/csv;charset=utf-8',
      );
    } catch {
      if (ativa.current) setErroExportacao(true);
    } finally {
      if (ativa.current) setExportando(false);
    }
  };

  return (
    <Page
      title="Telemetria"
      subtitle={repositorio.ensaiosReais ? 'Consulta periódica a cada 10 s · horários de Brasília' : 'Amostras validadas do ESP32 · intervalo 10 s'}
      actions={
        <>
          <Button
            variant="secondary"
            icon={Download}
            disabled={!teste || exportando}
            onClick={() => void exportar()}
          >
            Exportar CSV
          </Button>
          <BotaoAoVivo ativo={aoVivo} onAlternar={() => setAoVivo((atual) => !atual)} />
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {repositorio.ensaiosReais && testes.data && <section aria-label="Páginas do seletor de testes">
          <Paginacao pagina={testes.data.pagina} tamanho={testes.data.tamanhoPagina} total={testes.data.total} unidade="testes no seletor"
            onTrocar={p => { setPaginaTestes(p); setTesteEscolhido(null); setPagina(1); }} />
          <p className="text-xs text-fg-muted">Consulta REST periódica; o estado da consulta não confirma conexão com o dispositivo. Pausar não interrompe a aquisição.</p>
        </section>}
        {erroExportacao && (
          <p role="alert" className="text-sm text-fg-muted">
            Não foi possível exportar o CSV completo. O limite é de 10.000 amostras;
            confira a conexão e tente novamente com a aquisição pausada ou um filtro de qualidade.
          </p>
        )}
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          <CardSinal consulta={sinal} real={repositorio.ensaiosReais} />
          <CardUltimasLeituras consulta={recentes} conexao={conexao} />
        </div>
        <TabelaAmostras
          testes={{
            data: listaTestes,
            isPending: testes.isPending,
            isError: testes.isError,
            refetch: testes.refetch,
          }}
          teste={teste}
          onTrocarTeste={trocarTeste}
          qualidade={qualidade}
          onTrocarQualidade={trocarQualidade}
          pagina={pagina}
          onTrocarPagina={setPagina}
          amostras={tabela}
          ultimaAmostra={recentes.data?.itens[0]}
          hoje={hoje}
        />
      </div>
    </Page>
  );
}
