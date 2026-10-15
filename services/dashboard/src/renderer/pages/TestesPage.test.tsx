/**
 * Testes da tela Testes de campo.
 *
 * Seguem o plano `.AIs/docs/plans/desktop-frontend-testes.md`: histórico com
 * abas por status e paginação, painel do teste em andamento só com o que é
 * medido, ações com diálogos (planejar, iniciar, finalizar e cancelar) que só
 * mostram o novo estado depois da resposta, e comparação de testes.
 */

import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErroRepositorio } from '@/data/erros';
import { RepositorioProvider, type RepositorioVers } from '@/data/repositorio';
import { criarRepositorioMock } from '@/data/repositorioMock';
import { formatarNumero } from '@/lib/format';
import { TestesPage } from './TestesPage';

/** Renderiza a tela com um cache novo e o repositório informado. */
function renderizar(repositorio: RepositorioVers = criarRepositorioMock()) {
  const cliente = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={cliente}>
      <RepositorioProvider repositorio={repositorio}>
        <TestesPage />
      </RepositorioProvider>
    </QueryClientProvider>,
  );
  return repositorio;
}

/** Linhas de dados (sem o cabeçalho) da tabela do histórico, depois de carregar. */
async function linhas() {
  const tabela = await screen.findByRole('table', { name: 'Histórico de testes' });
  await within(tabela).findAllByText(/^#0\d\d$/);
  return within(tabela).getAllByRole('row').slice(1);
}

/** Linha do teste com o código informado. */
async function linhaDo(codigo: string) {
  const todas = await linhas();
  const linha = todas.find((l) => within(l).queryByText(codigo));
  if (!linha) throw new Error(`Linha ${codigo} não encontrada`);
  return linha;
}

/** Painel do teste em andamento (ou do próximo planejado). */
const painel = () => screen.getByRole('region', { name: 'Teste em andamento' });

/** Finaliza o #023 pelo diálogo, como concluído e satisfatório. */
async function finalizarO023() {
  await userEvent.click(await within(painel()).findByRole('button', { name: 'Finalizar teste' }));
  const dialogo = screen.getByRole('dialog', { name: 'Finalizar teste #023' });
  await userEvent.selectOptions(within(dialogo).getByLabelText('Resultado'), 'satisfatorio');
  await userEvent.type(within(dialogo).getByLabelText('Velocidade média (km/h)'), '30');
  await userEvent.click(within(dialogo).getByRole('button', { name: 'Finalizar' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
}

describe('TestesPage — histórico', () => {
  /** Barra superior: comparar (desativado sem seleção) e novo teste. */
  it('mostra a barra superior', () => {
    renderizar();

    expect(screen.getByRole('heading', { level: 1, name: 'Testes de campo' })).toBeInTheDocument();
    expect(screen.getByText('Compare configurações e terrenos')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Comparar (0)' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Novo teste' })).toBeEnabled();
  });

  /** Abas por status do contrato, com a contagem de cada uma. */
  it('mostra as abas com contagem', async () => {
    renderizar();

    const abas = screen.getByRole('tablist', { name: 'Status dos testes' });
    for (const nome of [
      'Todos (17)',
      'Em andamento (1)',
      'Concluídos (13)',
      'Falhos (1)',
      'Planejados (1)',
      'Cancelados (1)',
    ]) {
      expect(await within(abas).findByRole('tab', { name: nome })).toBeInTheDocument();
    }
    expect(within(abas).getByRole('tab', { name: 'Todos (17)' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  /** Lista do mais recente ao mais antigo, com energia e potência de cada teste. */
  it('lista os testes', async () => {
    const repositorio = renderizar();
    const resumo022 = await repositorio.obterResumoTeste('teste-022');

    const todas = await linhas();
    expect(todas).toHaveLength(10);
    expect(todas[0]).toHaveTextContent('#024');
    expect(todas[0]).toHaveTextContent('Planejado');

    const t023 = await linhaDo('#023');
    expect(t023).toHaveTextContent('Em andamento');
    expect(t023).toHaveTextContent('Cidade');
    expect(await within(t023).findByText('212')).toBeInTheDocument();
    expect(t023).toHaveTextContent('148');

    const t022 = await linhaDo('#022');
    for (const texto of ['Rodovia', '05/10', '07:50', '45 min', 'Satisfatório'])
      expect(t022).toHaveTextContent(texto);
    expect(
      await within(t022).findByText(formatarNumero(resumo022!.energiaRecuperadaMwh)),
    ).toBeInTheDocument();

    expect(await linhaDo('#017')).toHaveTextContent('Falhou');
  });

  /** A aba filtra pelo status. */
  it('filtra pela aba', async () => {
    renderizar();
    await linhas();

    await userEvent.click(await screen.findByRole('tab', { name: 'Falhos (1)' }));

    await waitFor(async () => expect(await linhas()).toHaveLength(1));
    expect((await linhas())[0]).toHaveTextContent('#017');
  });

  /** Paginação de 10 em 10. */
  it('pagina o histórico', async () => {
    renderizar();
    await linhas();
    const historico = screen.getByRole('region', { name: 'Histórico de testes' });
    expect(historico).toHaveTextContent('Mostrando 1 a 10 de 17 testes');

    await userEvent.click(within(historico).getByRole('button', { name: 'Próxima' }));

    expect(await within(historico).findByText('2 de 2')).toBeInTheDocument();
    expect(await linhaDo('#008')).toBeInTheDocument();
    expect(historico).toHaveTextContent('Mostrando 11 a 17 de 17 testes');
  });
});

describe('TestesPage — teste em andamento', () => {
  /** Só o que é medido: tempo, energia, potência, configuração e bateria. */
  it('mostra o painel ao vivo', async () => {
    renderizar();

    const ao = painel();
    expect(await within(ao).findByText('#023 · Cidade · Centro Sorocaba')).toBeInTheDocument();
    expect(within(ao).getByText('00:44:00')).toBeInTheDocument();
    expect(await within(ao).findByText('148')).toBeInTheDocument();
    expect(within(ao).getByText('212')).toBeInTheDocument();
    expect(ao).toHaveTextContent('Config v3 · 6 piezos');
    expect(await within(ao).findByText('Bateria 68%')).toBeInTheDocument();
    expect(ao).not.toHaveTextContent(/Velocidade|Rotação|Meta/);
  });

  /** Finalizar mostra o novo estado só depois da resposta e passa ao próximo planejado. */
  it('finaliza o teste em andamento', async () => {
    renderizar();

    await finalizarO023();

    expect(await within(painel()).findByText('Nenhum teste em andamento')).toBeInTheDocument();
    expect(within(painel()).getByText(/#024/)).toBeInTheDocument();
    expect(await within(await linhaDo('#023')).findByText('Satisfatório')).toBeInTheDocument();
  });

  /** Iniciar o planejado depois de finalizar o em andamento. */
  it('inicia o próximo planejado', async () => {
    renderizar();
    await finalizarO023();

    await userEvent.click(await within(painel()).findByRole('button', { name: 'Iniciar teste' }));
    const dialogo = screen.getByRole('dialog', { name: 'Iniciar teste #024' });
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Iniciar' }));

    expect(await within(painel()).findByText(/^#024 · /)).toBeInTheDocument();
    expect(within(painel()).getByText('00:00:00')).toBeInTheDocument();
  });

  /** O conflito devolvido pelo repositório aparece no diálogo, sem mudar a tela. */
  it('mostra o conflito ao iniciar', async () => {
    const repositorio = criarRepositorioMock();
    renderizar(repositorio);
    await finalizarO023();
    vi.spyOn(repositorio, 'iniciarTeste').mockRejectedValue(
      new ErroRepositorio(
        'conflito',
        'Já existe um teste em andamento. Finalize ou cancele antes de iniciar outro.',
      ),
    );

    await userEvent.click(await within(painel()).findByRole('button', { name: 'Iniciar teste' }));
    const dialogo = screen.getByRole('dialog', { name: 'Iniciar teste #024' });
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Iniciar' }));

    expect(await within(dialogo).findByRole('alert')).toHaveTextContent(
      'Já existe um teste em andamento',
    );
    expect(within(painel()).getByText('Nenhum teste em andamento')).toBeInTheDocument();
  });

  /** Cancelar com motivo. */
  it('cancela o teste em andamento', async () => {
    renderizar();

    await userEvent.click(await within(painel()).findByRole('button', { name: 'Cancelar teste' }));
    const dialogo = screen.getByRole('dialog', { name: 'Cancelar teste #023' });
    await userEvent.type(within(dialogo).getByLabelText('Motivo'), 'Pneu furado');
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Confirmar cancelamento' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(await within(await linhaDo('#023')).findByText('Cancelado')).toBeInTheDocument();
  });
});

describe('TestesPage — planejar e comparar', () => {
  /** "Novo teste" valida e cria um planejado no topo da lista. */
  it('planeja um teste novo', async () => {
    renderizar();
    await linhas();

    await userEvent.click(screen.getByRole('button', { name: 'Novo teste' }));
    const dialogo = screen.getByRole('dialog', { name: 'Planejar teste' });
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Planejar' }));
    expect(within(dialogo).getByText('Informe o nome do teste.')).toBeInTheDocument();
    expect(within(dialogo).getByText('Informe o local.')).toBeInTheDocument();

    await userEvent.type(
      within(dialogo).getByLabelText('Nome do teste'),
      'Rodovia · Castelo Branco',
    );
    await userEvent.selectOptions(within(dialogo).getByLabelText('Terreno'), 'rodovia');
    await userEvent.type(within(dialogo).getByLabelText('Local'), 'SP-280');
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Planejar' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(await screen.findByRole('tab', { name: 'Planejados (2)' })).toBeInTheDocument();
    await waitFor(async () => expect((await linhas())[0]).toHaveTextContent('#025'));
  });

  /** Seleciona dois testes encerrados e compara as métricas dos resumos. */
  it('compara testes encerrados', async () => {
    renderizar();
    await linhas();
    expect(
      screen.queryByRole('checkbox', { name: 'Selecionar #023 para comparar' }),
    ).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('checkbox', { name: 'Selecionar #016 para comparar' }));
    await userEvent.click(screen.getByRole('checkbox', { name: 'Selecionar #015 para comparar' }));
    await userEvent.click(screen.getByRole('button', { name: 'Comparar (2)' }));

    const comparacao = screen.getByRole('region', { name: 'Comparação de testes' });
    expect(await within(comparacao).findByText('215 mWh')).toBeInTheDocument();
    expect(within(comparacao).getByText('176 mWh')).toBeInTheDocument();
    expect(comparacao).toHaveTextContent('Energia recuperada');
    expect(comparacao).toHaveTextContent('Pico de potência');
    expect(comparacao).toHaveTextContent('#016');
  });

  /** No máximo 5 testes na comparação. */
  it('limita a comparação a 5 testes', async () => {
    renderizar();
    await linhas();
    const caixas = screen.getAllByRole('checkbox', { name: /^Selecionar #0\d\d para comparar$/ });

    for (const caixa of caixas.slice(0, 5)) await userEvent.click(caixa);

    expect(screen.getByRole('button', { name: 'Comparar (5)' })).toBeEnabled();
    expect(caixas[5]).toBeDisabled();
  });
});

describe('TestesPage — estados', () => {
  /** Falha ao buscar: erro no histórico. */
  it('mostra o erro do histórico', async () => {
    const repositorio = criarRepositorioMock();
    vi.spyOn(repositorio, 'buscarTestes').mockRejectedValue(new Error('sem conexão'));
    renderizar(repositorio);

    const historico = screen.getByRole('region', { name: 'Histórico de testes' });
    expect(await within(historico).findByRole('alert')).toHaveTextContent(
      'Não foi possível carregar os testes.',
    );
  });

  /** Sem testes no status: mensagem de vazio. */
  it('mostra a aba vazia', async () => {
    const repositorio = criarRepositorioMock();
    vi.spyOn(repositorio, 'buscarTestes').mockResolvedValue({
      itens: [],
      total: 0,
      pagina: 1,
      tamanhoPagina: 10,
    });
    renderizar(repositorio);

    expect(await screen.findByText('Nenhum teste neste status.')).toBeInTheDocument();
  });
});
