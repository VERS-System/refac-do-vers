/**
 * Testes da tela Visão geral.
 *
 * Conferem os números aprovados da referência (com as correções da Fase 3,
 * como +6,5% em vez de +6,6%), o que muda com o seletor de período (só o
 * card de energia e o gráfico) e os estados de carregamento, erro e vazio.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RepositorioProvider, type RepositorioVers } from '@/data/repositorio';
import { criarRepositorioMock } from '@/data/repositorioMock';
import { formatarEnergia } from '@/lib/format';
import { PERIODO_PADRAO, usePeriodoStore } from '@/stores/periodo';
import { VisaoGeralPage } from './VisaoGeralPage';

/** Renderiza a tela com um cache novo e o repositório informado. */
function renderizar(repositorio: RepositorioVers = criarRepositorioMock()) {
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={cliente}>
      <RepositorioProvider repositorio={repositorio}>
        <VisaoGeralPage />
      </RepositorioProvider>
    </QueryClientProvider>,
  );
  return repositorio;
}

/** Espera a região nomeada aparecer com o texto informado. */
async function regiaoCom(nome: string | RegExp, texto: string | RegExp) {
  const regiao = await screen.findByRole('region', { name: nome });
  await within(regiao).findByText(texto);
  return regiao;
}

describe('VisaoGeralPage — Dia (padrão)', () => {
  beforeEach(() => {
    usePeriodoStore.getState().setPeriodo(PERIODO_PADRAO);
  });

  /** KPI de energia do dia com a comparação corrigida (+6,5%). */
  it('mostra a energia recuperada hoje', async () => {
    renderizar();

    const card = await regiaoCom('Energia recuperada hoje', '292');
    expect(within(card).getByText('mWh')).toBeInTheDocument();
    expect(within(card).getByText('+6,5% vs média semanal')).toBeInTheDocument();
  });

  /** Potência ao vivo do ponto 1, com o medidor de segmentos. */
  it('mostra a potência instantânea ao vivo', async () => {
    renderizar();

    const card = await regiaoCom('Potência instantânea', '212');
    expect(within(card).getByText('Ao vivo')).toBeInTheDocument();
    expect(within(card).getByRole('meter', { name: 'Nível de potência' })).toHaveAttribute('aria-valuenow', '212');
  });

  /** Eficiência ponta a ponta do dia. */
  it('mostra a eficiência ponta a ponta de hoje', async () => {
    renderizar();

    const card = await regiaoCom('Eficiência ponta a ponta', '53,5');
    expect(within(card).getByText('Piezo → USB · hoje')).toBeInTheDocument();
  });

  /** Bateria com carga e estado. */
  it('mostra a bateria do sistema', async () => {
    renderizar();

    const card = await regiaoCom('Bateria do sistema', '68');
    expect(within(card).getByText('Carregando')).toBeInTheDocument();
  });

  /** Gráfico do dia com movimento, intervalo e pico no resumo acessível. */
  it('mostra a curva do dia', async () => {
    renderizar();

    const grafico = await regiaoCom('Energia recuperada x consumo', /1,5 h em movimento/);
    expect(within(grafico).getByText(/intervalo de 10 s/)).toBeInTheDocument();
    expect(
      within(grafico).getByRole('img', { name: /de 00:00 a 18:05, pico de 386 mW às 17:42/ }),
    ).toBeInTheDocument();
  });

  /** Card de vibração com valor, faixa e detalhes. */
  it('mostra a vibração RMS', async () => {
    renderizar();

    const card = await regiaoCom('Vibração RMS', '3,2');
    expect(within(card).getByText('m/s²')).toBeInTheDocument();
    expect(within(card).getByText('Eixo Z (vertical)')).toBeInTheDocument();
    expect(within(card).getByText('Faixa normal')).toBeInTheDocument();
    expect(within(card).getByText('6 / 8')).toBeInTheDocument();
    expect(within(card).getByText('42,8 Hz')).toBeInTheDocument();
    expect(within(card).getByText('31,4 °C')).toBeInTheDocument();
  });

  /** Cadeia com os 4 pontos, medidas e eficiência de cada estágio. */
  it('mostra a cadeia de conversão', async () => {
    renderizar();

    const cadeia = await regiaoCom('Cadeia de conversão', '4 nós monitorados');
    const pontos = await within(cadeia).findAllByRole('article');
    expect(pontos).toHaveLength(4);

    expect(within(pontos[0]).getByText('Nó comum')).toBeInTheDocument();
    expect(within(pontos[0]).getByText('Entrada AC/DC')).toBeInTheDocument();
    expect(within(pontos[0]).getByText('4,82 V')).toBeInTheDocument();
    expect(within(pontos[0]).getByText('44 mA')).toBeInTheDocument();
    expect(within(pontos[0]).getByText('212 mW')).toBeInTheDocument();
    expect(within(pontos[1]).getByText('η 87,3%')).toBeInTheDocument();
    expect(within(pontos[2]).getByText('η 88,6%')).toBeInTheDocument();
    expect(within(pontos[3]).getByText('η 70,1%')).toBeInTheDocument();
    expect(within(pontos[3]).getByText('115 mW')).toBeInTheDocument();
  });
});

describe('VisaoGeralPage — troca de período', () => {
  beforeEach(() => {
    usePeriodoStore.getState().setPeriodo(PERIODO_PADRAO);
  });

  /** Semana: energia em Wh com a comparação semanal e barras por dia. */
  it('mostra a semana', async () => {
    renderizar();
    await userEvent.click(screen.getByRole('radio', { name: 'Semana' }));

    const card = await regiaoCom('Energia recuperada na semana', '1,92');
    expect(within(card).getByText('Wh')).toBeInTheDocument();
    expect(within(card).getByText('+8,4% vs semana anterior')).toBeInTheDocument();

    const grafico = await regiaoCom('Energia recuperada por dia', /10,3 h em movimento/);
    expect(
      await within(grafico).findByRole('img', { name: /de 28\/09 a 04\/10, maior valor 390 mWh em 01\/10/ }),
    ).toBeInTheDocument();
  });

  /** Mês: de 01/10 até hoje, sem comparação. */
  it('mostra o mês', async () => {
    renderizar();
    await userEvent.click(screen.getByRole('radio', { name: 'Mês' }));

    const card = await regiaoCom('Energia recuperada no mês', '1,47');
    expect(within(card).queryByText(/vs /)).not.toBeInTheDocument();

    const grafico = await screen.findByRole('region', { name: 'Energia recuperada por dia' });
    expect(await within(grafico).findByRole('img', { name: /de 01\/10 a 05\/10/ })).toBeInTheDocument();
  });

  /** Hora: energia da última hora e curva de 17:05 a 18:05. */
  it('mostra a última hora', async () => {
    const repositorio = renderizar();
    const hora = await repositorio.obterResumoEnergia('hora');
    await userEvent.click(screen.getByRole('radio', { name: 'Hora' }));

    await regiaoCom('Energia recuperada na última hora', formatarEnergia(hora.energiaRecuperadaMwh).valor);
    const grafico = await screen.findByRole('region', { name: 'Energia recuperada x consumo' });
    expect(await within(grafico).findByRole('img', { name: /de 17:05 a 18:05/ })).toBeInTheDocument();
  });

  /** Os cards ao vivo não mudam com o período. */
  it('mantém os dados ao vivo', async () => {
    renderizar();
    await userEvent.click(screen.getByRole('radio', { name: 'Semana' }));

    await regiaoCom('Potência instantânea', '212');
    await regiaoCom('Eficiência ponta a ponta', '53,5');
  });
});

describe('VisaoGeralPage — estados', () => {
  beforeEach(() => {
    usePeriodoStore.getState().setPeriodo(PERIODO_PADRAO);
  });

  /** Enquanto a cadeia não chega, o card fica ocupado e sem valor. */
  it('mostra carregamento', async () => {
    const repositorio = criarRepositorioMock();
    vi.spyOn(repositorio, 'obterCadeiaAoVivo').mockReturnValue(new Promise(() => {}));
    renderizar(repositorio);

    const card = screen.getByRole('region', { name: 'Potência instantânea' });
    expect(card.querySelector('[aria-busy="true"]')).toBeInTheDocument();
    expect(within(card).queryByText('212')).not.toBeInTheDocument();
  });

  /** Uma falha mostra o erro no card e "Tentar de novo" refaz a consulta. */
  it('mostra o erro e tenta de novo', async () => {
    const repositorio = criarRepositorioMock();
    const original = repositorio.obterVibracao.bind(repositorio);
    vi.spyOn(repositorio, 'obterVibracao').mockRejectedValueOnce(new Error('sem conexão')).mockImplementation(original);
    renderizar(repositorio);

    const card = screen.getByRole('region', { name: 'Vibração RMS' });
    expect(await within(card).findByRole('alert')).toHaveTextContent('Não foi possível carregar a vibração.');

    await userEvent.click(within(card).getByRole('button', { name: 'Tentar de novo' }));
    expect(await within(card).findByText('3,2')).toBeInTheDocument();
  });

  /** Curva sem pontos: o gráfico mostra o estado vazio. */
  it('mostra o período sem medições', async () => {
    const repositorio = criarRepositorioMock();
    const curva = await repositorio.obterCurvaDoDia();
    vi.spyOn(repositorio, 'obterCurvaDoDia').mockResolvedValue({ ...curva, pontos: [] });
    renderizar(repositorio);

    const grafico = screen.getByRole('region', { name: 'Energia recuperada x consumo' });
    expect(await within(grafico).findByText('Sem medições neste período.')).toBeInTheDocument();
  });
});
