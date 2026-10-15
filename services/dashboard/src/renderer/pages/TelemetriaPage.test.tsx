/**
 * Testes da tela Telemetria.
 *
 * Seguem o plano `.AIs/docs/plans/desktop-frontend-telemetria.md`: amostras
 * por teste (padrão: o em andamento), gráfico dos últimos 10 minutos, últimas
 * leituras com o estado da conexão, tabela paginada com filtros, exportação
 * CSV e os estados de carregamento, erro e vazio.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { buscarTodasAmostras } from '@/data/consultasTelemetria';
import { RepositorioProvider, type RepositorioVers } from '@/data/repositorio';
import { criarRepositorioMock } from '@/data/repositorioMock';
import { formatarNumero } from '@/lib/format';
import { usePreferencias } from '@/stores/preferencias';
import { TelemetriaPage } from './TelemetriaPage';

/** Renderiza a tela com um cache novo e o repositório informado. */
function renderizar(repositorio: RepositorioVers = criarRepositorioMock()) {
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={cliente}>
      <RepositorioProvider repositorio={repositorio}>
        <TelemetriaPage />
      </RepositorioProvider>
    </QueryClientProvider>,
  );
  return repositorio;
}

/** Linhas de dados (sem o cabeçalho) da tabela de amostras. */
async function linhasDaTabela() {
  const tabela = await screen.findByRole('table', { name: /Amostras do teste/ });
  await within(tabela).findAllByText(/^\d{2}:\d{2}:\d{2}\.\d{3}$/);
  return within(tabela).getAllByRole('row').slice(1);
}

describe('TelemetriaPage — conteúdo', () => {
  /** Barra superior da referência, com exportação e ao vivo ligado. */
  it('mostra a barra superior', async () => {
    renderizar();

    expect(screen.getByRole('heading', { level: 1, name: 'Telemetria' })).toBeInTheDocument();
    expect(screen.getByText('Amostras validadas do ESP32 · intervalo 10 s')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Exportar CSV' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ao vivo' })).toHaveAttribute('aria-pressed', 'true');
  });

  /** As 6 leituras mais recentes do teste em andamento, com a contagem e a conexão. */
  it('mostra as últimas leituras', async () => {
    renderizar();

    const card = await screen.findByRole('region', { name: 'Últimas leituras' });
    const leituras = await within(card).findAllByRole('listitem');
    expect(leituras).toHaveLength(6);
    expect(leituras[0]).toHaveTextContent('18:05:00');
    expect(leituras[0]).toHaveTextContent('212 mW');
    expect(leituras[0]).toHaveTextContent('4,82 V');
    expect(leituras[0]).toHaveTextContent('Válida');
    expect(leituras[1]).toHaveTextContent('18:04:50');
    expect(await within(card).findByText('265 amostras neste teste')).toBeInTheDocument();
    expect(await within(card).findByText('Conectado')).toBeInTheDocument();
  });

  /** Gráfico dos últimos 10 minutos, com as séries que podem ser desligadas. */
  it('mostra o sinal dos últimos 10 minutos', async () => {
    renderizar();

    const card = await screen.findByRole('region', { name: 'Sinal em tempo real' });
    expect(within(card).getByText('Últimos 10 minutos · intervalo 10 s')).toBeInTheDocument();
    const grafico = await within(card).findByRole('img', { name: /de 17:55:00 a 18:05:00/ });
    expect(grafico).toHaveAccessibleName(/última leitura 212 mW · 4,82 V · 3,2 m\/s²/);

    const tensao = within(card).getByRole('button', { name: 'Tensão (V)' });
    expect(tensao).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(tensao);
    expect(tensao).toHaveAttribute('aria-pressed', 'false');
  });

  /** Tabela do teste em andamento: 20 linhas por página, da mais recente. */
  it('mostra a tabela de amostras', async () => {
    const repositorio = renderizar();
    const tarde = { id: 'teste-023' };
    const { itens } = await repositorio.obterAmostrasTelemetria({
      testeId: tarde.id,
      tamanhoPagina: 1,
    });

    const linhas = await linhasDaTabela();
    expect(linhas).toHaveLength(20);
    for (const texto of [
      '18:05:00.000',
      '#023',
      '4,82',
      '44',
      '212',
      '3,2',
      '31,4',
      '6/8',
      'Válida',
    ]) {
      expect(linhas[0]).toHaveTextContent(texto);
    }
    expect(linhas[0]).toHaveTextContent(formatarNumero(itens[0].energiaAcumuladaMwh, 2));

    const card = screen.getByRole('region', { name: 'Amostras do teste' });
    expect(card).toHaveTextContent('Hoje, 17:21 até 18:05');
    expect(card).toHaveTextContent('Piezos: 6/8 ativos');
    expect(card).toHaveTextContent('Mostrando 1 a 20 de 265 amostras');
    expect(card).toHaveTextContent('1 de 14');
    expect(within(card).getByRole('button', { name: 'Anterior' })).toBeDisabled();
  });

  /** "Próxima" avança a página. */
  it('pagina a tabela', async () => {
    renderizar();
    await linhasDaTabela();
    const card = screen.getByRole('region', { name: 'Amostras do teste' });

    await userEvent.click(within(card).getByRole('button', { name: 'Próxima' }));

    expect(await within(card).findByText('2 de 14')).toBeInTheDocument();
    expect(card).toHaveTextContent('Mostrando 21 a 40 de 265 amostras');
    expect(within(card).getByRole('button', { name: 'Anterior' })).toBeEnabled();
  });

  /** O filtro de qualidade mostra só as amostras daquela qualidade. */
  it('filtra pela qualidade', async () => {
    const repositorio = renderizar();
    const tarde = { id: 'teste-023' };
    const suspeitas = await repositorio.obterAmostrasTelemetria({
      testeId: tarde.id,
      qualidade: 'suspeita',
    });
    await linhasDaTabela();

    await userEvent.selectOptions(screen.getByLabelText('Qualidade'), 'suspeita');

    const card = screen.getByRole('region', { name: 'Amostras do teste' });
    expect(
      await within(card).findByText(new RegExp(`de ${suspeitas.total} amostras`)),
    ).toBeInTheDocument();
    const linhas = await linhasDaTabela();
    expect(linhas.every((linha) => linha.textContent?.includes('Suspeita'))).toBe(true);
  });

  /** Trocar o teste troca a tabela, a faixa de horário e as leituras. */
  it('troca de teste', async () => {
    const repositorio = renderizar();
    const manha = { id: 'teste-022' };
    await linhasDaTabela();

    await userEvent.selectOptions(screen.getByLabelText('Teste'), manha.id);

    const card = screen.getByRole('region', { name: 'Amostras do teste' });
    expect(await within(card).findByText(/de 270 amostras/)).toBeInTheDocument();
    expect(card).toHaveTextContent('Hoje, 07:50 até 08:35');
    const [primeira] = await linhasDaTabela();
    expect(primeira).toHaveTextContent('08:34:50');
    expect(primeira).toHaveTextContent('#022');
  });

  /** Pausar para de atualizar e muda o estado da conexão. */
  it('pausa e retoma o ao vivo', async () => {
    renderizar();
    const botao = screen.getByRole('button', { name: 'Ao vivo' });
    const card = await screen.findByRole('region', { name: 'Últimas leituras' });

    await userEvent.click(botao);

    expect(botao).toHaveAttribute('aria-pressed', 'false');
    expect(await within(card).findByText('Pausado')).toBeInTheDocument();
  });
});

describe('TelemetriaPage — unidades preferidas', () => {
  /** Vibração em g e potência em W na tabela e nas últimas leituras. */
  it('mostra as amostras nas unidades escolhidas', async () => {
    usePreferencias
      .getState()
      .salvar({ unidades: { potencia: 'W', energia: 'mWh', aceleracao: 'g' } });
    renderizar();

    const tabela = await screen.findByRole('table', { name: /Amostras do teste/ });
    expect(within(tabela).getByRole('columnheader', { name: 'Vibração (g)' })).toBeInTheDocument();
    expect(within(tabela).getByRole('columnheader', { name: 'Potência (W)' })).toBeInTheDocument();
    const [primeira] = await linhasDaTabela();
    expect(primeira).toHaveTextContent('0,33');
    expect(primeira).toHaveTextContent('0,212');

    const leituras = screen.getByRole('region', { name: 'Últimas leituras' });
    expect((await within(leituras).findAllByRole('listitem'))[0]).toHaveTextContent('0,212 W');
  });
});

describe('TelemetriaPage — exportação', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  /** Exporta todas as amostras do teste (com o filtro atual) em CSV pt-BR. */
  it('exporta as amostras do teste em CSV', async () => {
    const criar = vi.fn((_blob: Blob) => 'blob:vers/telemetria');
    Object.assign(URL, { createObjectURL: criar, revokeObjectURL: vi.fn() });
    let nome = '';
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      nome = this.download;
    });
    const repositorio = renderizar();
    const tarde = { id: 'teste-023' };
    const todas = await buscarTodasAmostras(repositorio, { testeId: tarde.id });
    await linhasDaTabela();

    await userEvent.click(screen.getByRole('button', { name: 'Exportar CSV' }));

    await vi.waitFor(() => expect(criar).toHaveBeenCalled());
    expect(nome).toBe('vers-telemetria-teste-023-2026-10-05.csv');
    const conteudo = (await criar.mock.calls[0][0].text()).trimEnd().split('\r\n');
    expect(conteudo).toHaveLength(todas.length + 1);
    expect(conteudo[1]).toMatch(/^05\/10\/2026 18:05:00\.000;#023;4,82;44;212;/);
  });
});

describe('TelemetriaPage — estados', () => {
  /** Enquanto os testes não chegam, a tabela fica ocupada. */
  it('mostra carregamento', () => {
    const repositorio = criarRepositorioMock();
    vi.spyOn(repositorio, 'buscarTestes').mockReturnValue(new Promise(() => {}));
    renderizar(repositorio);

    const card = screen.getByRole('region', { name: 'Amostras do teste' });
    expect(card.querySelector('[aria-busy="true"]')).toBeInTheDocument();
  });

  /** Falha nas amostras: erro na tabela e conexão offline. */
  it('mostra o erro e a conexão offline', async () => {
    const repositorio = criarRepositorioMock();
    vi.spyOn(repositorio, 'obterAmostrasTelemetria').mockRejectedValue(new Error('sem conexão'));
    renderizar(repositorio);

    const card = screen.getByRole('region', { name: 'Amostras do teste' });
    expect(await within(card).findByRole('alert')).toHaveTextContent(
      'Não foi possível carregar as amostras.',
    );
    const leituras = screen.getByRole('region', { name: 'Últimas leituras' });
    expect(await within(leituras).findByText('Offline')).toBeInTheDocument();
  });

  /** Teste sem amostras: mensagem de vazio na tabela. */
  it('mostra o teste sem amostras', async () => {
    const repositorio = criarRepositorioMock();
    vi.spyOn(repositorio, 'obterAmostrasTelemetria').mockResolvedValue({
      itens: [],
      total: 0,
      pagina: 1,
      tamanhoPagina: 20,
    });
    renderizar(repositorio);

    const card = screen.getByRole('region', { name: 'Amostras do teste' });
    expect(await within(card).findByText('Nenhuma amostra neste teste.')).toBeInTheDocument();
  });
});
