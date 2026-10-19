/**
 * Testes da tela Energia.
 *
 * Conferem os números aprovados da referência (Semana), o comportamento nos
 * outros períodos (decisão de 14/10/2026: a tela inteira segue o período),
 * a exportação do resumo em CSV, o atalho para a tarifa e os estados de
 * carregamento, erro e vazio.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { correlacaoPearson } from '@/data/calculos';
import { RepositorioProvider, type RepositorioVers } from '@/data/repositorio';
import { criarRepositorioMock } from '@/data/repositorioMock';
import { formatarNumero } from '@/lib/format';
import { ROTAS } from '@/routes/navegacao';
import { usePeriodoStore, type Periodo } from '@/stores/periodo';
import { usePreferencias } from '@/stores/preferencias';
import { EnergiaPage } from './EnergiaPage';

/** Renderiza a tela no período pedido, com rota para Configurações (atalho da tarifa). */
function renderizar(periodo: Periodo, repositorio: RepositorioVers = criarRepositorioMock()) {
  usePeriodoStore.getState().setPeriodo(periodo);
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={cliente}>
      <RepositorioProvider repositorio={repositorio}>
        <MemoryRouter initialEntries={[ROTAS.energia]}>
          <Routes>
            <Route path={ROTAS.energia} element={<EnergiaPage />} />
            <Route path={ROTAS.configuracoes} element={<h1>Tela de configurações</h1>} />
          </Routes>
        </MemoryRouter>
      </RepositorioProvider>
    </QueryClientProvider>,
  );
  return repositorio;
}

/** Espera a região nomeada aparecer contendo o texto informado. */
async function regiaoCom(nome: string | RegExp, texto: string | RegExp) {
  const regiao = await screen.findByRole('region', { name: nome });
  await within(regiao).findByText(texto);
  return regiao;
}

describe('EnergiaPage — Semana (referência)', () => {
  /** Os quatro KPIs com os números aprovados. */
  it('mostra os KPIs da semana', async () => {
    renderizar('semana');

    const energia = await regiaoCom('Energia recuperada na semana', '1,92');
    expect(within(energia).getByText('Wh')).toBeInTheDocument();
    expect(within(energia).getByText('+8,4% vs semana anterior')).toBeInTheDocument();

    const potencia = await regiaoCom('Potência média em movimento', '186');
    expect(within(potencia).getByText('Pico 412 mW · qui 17:42')).toBeInTheDocument();

    const bateria = await regiaoCom('Energia para a bateria', '76,7');
    expect(within(bateria).getByText('%')).toBeInTheDocument();
    expect(within(bateria).getByText('do recuperado · 1,47 Wh')).toBeInTheDocument();

    const celular = await regiaoCom('Energia para o celular', '53,5');
    expect(within(celular).getByText('%')).toBeInTheDocument();
    expect(within(celular).getByText('do recuperado · 1,03 Wh')).toBeInTheDocument();
    expect(within(celular).queryByText(/recarga/)).not.toBeInTheDocument();
  });

  /** Barras por dia com média, total e método de integração. */
  it('mostra a energia recuperada por dia', async () => {
    renderizar('semana');

    const grafico = await regiaoCom(
      'Energia recuperada por dia',
      'Semana de 28/09 a 04/10 · 10,3 h em movimento',
    );
    expect(
      await within(grafico).findByRole('img', { name: /de 28\/09 a 04\/10/ }),
    ).toBeInTheDocument();
    expect(grafico).toHaveTextContent('Média 274 mWh');
    expect(grafico).toHaveTextContent('Total: 1.920 mWh recuperados');
    expect(grafico).toHaveTextContent(
      'Integração trapezoidal de P = V × I · amostragem a cada 10 s',
    );
    expect(within(grafico).getByText('Entregue à bateria (mWh)')).toBeInTheDocument();
  });

  /**
   * Perdas de cada estágio e a eficiência ponta a ponta. O ponto 1 (gerado)
   * fica em energia; os pontos 2 a 4 dizem quanto do recuperado chegou até eles.
   */
  it('mostra as perdas na conversão', async () => {
    renderizar('semana');

    const perdas = await regiaoCom('Perdas na conversão', '−12,9%');
    const linhas = within(perdas).getAllByRole('listitem');
    expect(linhas).toHaveLength(4);
    expect(linhas[0]).toHaveTextContent('Ponto 1 · Nó piezoelétrico');
    expect(linhas[0]).toHaveTextContent('1,92 Wh');
    expect(linhas[1]).toHaveTextContent('−12,9%');
    expect(linhas[1]).toHaveTextContent('87,1%');
    expect(linhas[2]).toHaveTextContent('−12,0%');
    expect(linhas[2]).toHaveTextContent('76,7%');
    expect(linhas[3]).toHaveTextContent('−30,2%');
    expect(linhas[3]).toHaveTextContent('53,5%');
    for (const linha of linhas.slice(1)) expect(linha).not.toHaveTextContent('Wh');
    expect(perdas).toHaveTextContent('Eficiência ponta a ponta53,5%');
  });

  /** Bateria com especificação, carga, tensão, ciclos, temperatura e a tensão de hoje. */
  it('mostra o estado da bateria', async () => {
    renderizar('semana');

    const bateria = await regiaoCom('Estado da bateria', 'Li-ion 3,7 V · 2200 mAh');
    expect(await within(bateria).findByText('68')).toBeInTheDocument();
    expect(within(bateria).getByText('Carregando')).toBeInTheDocument();
    expect(within(bateria).getByText('3,92 V')).toBeInTheDocument();
    expect(within(bateria).getByRole('meter', { name: 'Carga da bateria' })).toHaveAttribute(
      'aria-valuenow',
      '68',
    );
    expect(bateria).toHaveTextContent('Ciclos 3');
    expect(bateria).toHaveTextContent('Temperatura 31,4 °C');
    expect(await within(bateria).findByText(/Tensão hoje/)).toBeInTheDocument();
  });

  /** Sem tarifa cadastrada, nenhum valor financeiro; o botão leva às Configurações. */
  it('bloqueia a estimativa de economia e leva à tarifa', async () => {
    renderizar('semana');

    const economia = await regiaoCom('Estimativa de economia', /Cadastre uma tarifa de energia/);
    expect(economia).toHaveTextContent('Nenhum valor é calculado sem premissas registradas.');

    await userEvent.click(within(economia).getByRole('button', { name: 'Configurar tarifa' }));
    expect(
      await screen.findByRole('heading', { name: 'Tela de configurações' }),
    ).toBeInTheDocument();
  });

  /** Com tarifa cadastrada, a economia do período e o ritmo anual da última semana. */
  it('estima a economia com a tarifa cadastrada', async () => {
    usePreferencias.getState().salvar({ tarifaPorKwh: 0.95 });
    renderizar('semana');

    const economia = await regiaoCom('Estimativa de economia', 'R$ 0,0018');
    expect(economia).toHaveTextContent('R$ 0,10');
    expect(economia).toHaveTextContent('Tarifa: R$ 0,95/kWh');
    expect(within(economia).getByRole('button', { name: 'Alterar tarifa' })).toBeInTheDocument();
    expect(economia).not.toHaveTextContent('Cadastre uma tarifa');
  });

  /** Dispersão com o r calculado das amostras da semana e a frequência dominante. */
  it('mostra a relação entre energia e vibração', async () => {
    const repositorio = renderizar('semana');
    const amostras = await repositorio.obterAmostrasVibracao('semana');
    const r = correlacaoPearson(amostras.map((a) => ({ x: a.vibracaoRmsMs2, y: a.potenciaMw })));

    const dispersao = await regiaoCom('Energia × vibração', `r = ${formatarNumero(r, 2)}`);
    expect(within(dispersao).getByText('Alta correlação')).toBeInTheDocument();
    expect(dispersao).toHaveTextContent('Frequência dominante42,8 Hz');
    expect(within(dispersao).getByRole('img', { name: /28 amostras/ })).toBeInTheDocument();
  });

  /** Tabela do dia mais recente ao mais antigo, com a qualidade dos dados. */
  it('mostra o resumo por dia', async () => {
    renderizar('semana');

    const tabela = await screen.findByRole('table', { name: 'Resumo por dia' });
    const linhas = await within(tabela).findAllByRole('row');
    expect(linhas).toHaveLength(8);
    const [primeira] = linhas.slice(1);
    expect(primeira).toHaveTextContent('04/10');
    expect(primeira).toHaveTextContent('Dom');
    expect(primeira).toHaveTextContent('168');
    expect(primeira).toHaveTextContent('52,4%');
    expect(primeira).toHaveTextContent('Completa');
    const sexta = linhas.find((linha) => linha.textContent?.includes('02/10'));
    expect(sexta).toHaveTextContent('Lacunas 4%');
  });
});

describe('EnergiaPage — unidades preferidas', () => {
  /** Energia em J e potência em W valem na tabela e nos KPIs. */
  it('mostra a tabela nas unidades escolhidas', async () => {
    usePreferencias
      .getState()
      .salvar({ unidades: { potencia: 'W', energia: 'J', aceleracao: 'm/s²' } });
    renderizar('semana');

    const tabela = await screen.findByRole('table', { name: 'Resumo por dia' });
    expect(
      within(tabela).getByRole('columnheader', { name: 'Energia recuperada (J)' }),
    ).toBeInTheDocument();
    expect(
      within(tabela).getByRole('columnheader', { name: 'Potência média (W)' }),
    ).toBeInTheDocument();
    const [, primeira] = await within(tabela).findAllByRole('row');
    expect(primeira).toHaveTextContent('605');
    expect(primeira).toHaveTextContent('0,168');

    const potencia = await regiaoCom('Potência média em movimento', '0,186');
    expect(within(potencia).getByText('W')).toBeInTheDocument();
  });
});

describe('EnergiaPage — exportação', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  /** "Exportar CSV" baixa o resumo do período em CSV pt-BR. */
  it('exporta o resumo por dia em CSV', async () => {
    const criar = vi.fn((_blob: Blob) => 'blob:vers/csv');
    Object.assign(URL, { createObjectURL: criar, revokeObjectURL: vi.fn() });
    let nomeBaixado = '';
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      nomeBaixado = this.download;
    });
    renderizar('semana');
    await screen.findByRole('table', { name: 'Resumo por dia' });

    await userEvent.click(await screen.findByRole('button', { name: 'Exportar CSV' }));

    expect(nomeBaixado).toBe('vers-resumo-por-dia-2026-09-28-a-2026-10-04.csv');
    const conteudo = await criar.mock.calls[0][0].text();
    expect(conteudo).toContain('Data;Em movimento (h);Energia recuperada (mWh)');
    expect(conteudo).toContain('04/10/2026;1,0;168;168;334;52,4;Completa');
  });
});

describe('EnergiaPage — outros períodos', () => {
  /** Dia: KPIs e perdas de hoje, curva do dia e a linha de hoje na tabela. */
  it('mostra o dia de hoje', async () => {
    renderizar('dia');

    await regiaoCom('Energia recuperada hoje', '292');
    const potencia = await regiaoCom('Potência média em movimento', '195');
    expect(within(potencia).getByText('Pico 386 mW · hoje 17:42')).toBeInTheDocument();
    const bateria = await regiaoCom('Energia para a bateria', '76,7');
    expect(within(bateria).getByText('do recuperado · 224 mWh')).toBeInTheDocument();
    const celular = await regiaoCom('Energia para o celular', '53,5');
    expect(within(celular).getByText('do recuperado · 156 mWh')).toBeInTheDocument();
    expect(within(celular).queryByText(/recarga/)).not.toBeInTheDocument();

    expect(
      await screen.findByRole('region', { name: 'Energia recuperada x consumo' }),
    ).toBeInTheDocument();
    const tabela = await screen.findByRole('table', { name: 'Resumo por dia' });
    expect(await within(tabela).findAllByRole('row')).toHaveLength(2);
    expect(tabela).toHaveTextContent('05/10');
  });

  /** Mês: de 01/10 até hoje, cinco barras e cinco linhas. */
  it('mostra o mês', async () => {
    renderizar('mes');

    await regiaoCom('Energia recuperada no mês', '1,47');
    const grafico = await screen.findByRole('region', { name: 'Energia recuperada por dia' });
    expect(
      await within(grafico).findByRole('img', { name: /de 01\/10 a 05\/10/ }),
    ).toBeInTheDocument();
    const tabela = await screen.findByRole('table', { name: 'Resumo por dia' });
    expect(await within(tabela).findAllByRole('row')).toHaveLength(6);
  });

  /** Hora: só existe a curva do P1, então não há detalhe por ponto nem resumo por dia. */
  it('mostra a última hora sem inventar detalhe por ponto', async () => {
    renderizar('hora');

    await screen.findByRole('region', { name: 'Energia recuperada na última hora' });
    const bateria = await regiaoCom(
      'Energia para a bateria',
      'Sem detalhe por ponto na última hora.',
    );
    expect(within(bateria).queryByText('Wh')).not.toBeInTheDocument();
    await regiaoCom('Energia para o celular', 'Sem detalhe por ponto na última hora.');
    await regiaoCom('Perdas na conversão', 'Sem detalhe por ponto na última hora.');

    const grafico = await screen.findByRole('region', { name: 'Energia recuperada x consumo' });
    expect(
      await within(grafico).findByRole('img', { name: /de 17:05 a 18:05/ }),
    ).toBeInTheDocument();
    const tabela = await screen.findByRole('table', { name: 'Resumo por dia' });
    expect(tabela).toHaveTextContent('O resumo por dia não se aplica à última hora.');
    expect(screen.getByRole('button', { name: 'Exportar CSV' })).toBeDisabled();
  });
});

describe('EnergiaPage — estados', () => {
  beforeEach(() => {
    usePeriodoStore.getState().setPeriodo('semana');
  });

  /** Enquanto a bateria não chega, o card fica ocupado. */
  it('mostra carregamento', () => {
    const repositorio = criarRepositorioMock();
    vi.spyOn(repositorio, 'obterBateria').mockReturnValue(new Promise(() => {}));
    renderizar('semana', repositorio);

    const bateria = screen.getByRole('region', { name: 'Estado da bateria' });
    expect(bateria.querySelector('[aria-busy="true"]')).toBeInTheDocument();
  });

  /** Falha nas amostras: erro no card da dispersão. */
  it('mostra o erro das amostras de vibração', async () => {
    const repositorio = criarRepositorioMock();
    vi.spyOn(repositorio, 'obterAmostrasVibracao').mockRejectedValue(new Error('sem conexão'));
    renderizar('semana', repositorio);

    const dispersao = screen.getByRole('region', { name: 'Energia × vibração' });
    expect(await within(dispersao).findByRole('alert')).toHaveTextContent(
      'Não foi possível carregar as amostras de vibração.',
    );
  });

  /** Período sem amostras: a dispersão mostra o vazio e não calcula r. */
  it('mostra o período sem amostras', async () => {
    const repositorio = criarRepositorioMock();
    vi.spyOn(repositorio, 'obterAmostrasVibracao').mockResolvedValue([]);
    renderizar('semana', repositorio);

    const dispersao = screen.getByRole('region', { name: 'Energia × vibração' });
    expect(await within(dispersao).findByText('Sem amostras neste período.')).toBeInTheDocument();
    expect(within(dispersao).queryByText(/r = /)).not.toBeInTheDocument();
  });
});
