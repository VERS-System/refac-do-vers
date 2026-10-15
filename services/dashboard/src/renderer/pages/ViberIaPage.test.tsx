/**
 * Testes da tela Viber.
 *
 * Seguem o plano `.AIs/docs/plans/desktop-frontend-viber.md` e a task D11:
 * conversa com respostas montadas dos dados (sempre com a fonte), selos de
 * inferência e recomendação como no mobile, contextos autorizados, pergunta
 * livre indisponível sem perder o rascunho, conversas recentes e estados.
 */

import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { RepositorioProvider, type RepositorioVers } from '@/data/repositorio';
import { criarRepositorioMock } from '@/data/repositorioMock';
import { ROTAS } from '@/routes/navegacao';
import { ViberIaPage } from './ViberIaPage';

/** Renderiza a tela com rota para Testes (atalho da comparação). */
function renderizar(repositorio: RepositorioVers = criarRepositorioMock()) {
  const cliente = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={cliente}>
      <RepositorioProvider repositorio={repositorio}>
        <MemoryRouter initialEntries={[ROTAS.viberIa]}>
          <Routes>
            <Route path={ROTAS.viberIa} element={<ViberIaPage />} />
            <Route path={ROTAS.testes} element={<h1>Tela de testes</h1>} />
          </Routes>
        </MemoryRouter>
      </RepositorioProvider>
    </QueryClientProvider>,
  );
  return repositorio;
}

/** A lista de mensagens da conversa (um `role="log"`). */
const conversa = () => screen.getByRole('log', { name: 'Mensagens da conversa' });

describe('ViberIaPage — conversa', () => {
  /** Barra superior com o aviso de que os cálculos vêm do backend. */
  it('mostra a barra superior', () => {
    renderizar();

    expect(screen.getByRole('heading', { level: 1, name: 'Viber' })).toBeInTheDocument();
    expect(
      screen.getByText(
        'Assistente que interpreta seus dados. Os cálculos vêm do backend, não da IA.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Nova conversa' })).toBeInTheDocument();
  });

  /** Conversa inicial: medição com fonte, comparação anexa e inferência com selo. */
  it('mostra a conversa inicial', async () => {
    renderizar();

    const log = conversa();
    expect(await within(log).findByText('Sim, compara com o teste #022.')).toBeInTheDocument();
    expect(log).toHaveTextContent('168 mWh');
    expect(log).toHaveTextContent('39% abaixo da média da semana');
    expect(within(log).getByText('Sim, compara com o teste #022.')).toBeInTheDocument();
    expect(within(log).getByText('Inferência do Viber — pode conter erros')).toBeInTheDocument();
    expect(log).toHaveTextContent(/Fonte: .*#021 e #022/);

    const comparacao = within(log).getByRole('region', { name: 'Comparação de testes' });
    expect(comparacao).toHaveTextContent('#021');
    expect(comparacao).toHaveTextContent('#022');
  });

  /** O atalho da comparação leva à tela Testes. */
  it('abre a comparação em Testes', async () => {
    renderizar();

    await userEvent.click(
      await within(conversa()).findByRole('link', { name: 'Abrir comparação em Testes' }),
    );

    expect(await screen.findByRole('heading', { name: 'Tela de testes' })).toBeInTheDocument();
  });

  /** "Resumo da semana" responde com os números da semana. */
  it('responde ao resumo da semana', async () => {
    renderizar();
    await within(conversa()).findByText('Sim, compara com o teste #022.');

    await userEvent.click(screen.getByRole('button', { name: 'Resumo da semana' }));

    expect(await within(conversa()).findByText(/1,92 Wh/)).toBeInTheDocument();
    expect(conversa()).toHaveTextContent('8,4%');
  });

  /** A eficiência vem com a medição e a inferência separadas. */
  it('explica a queda de eficiência', async () => {
    renderizar();
    await within(conversa()).findByText('Sim, compara com o teste #022.');

    await userEvent.click(screen.getByRole('button', { name: 'Por que a eficiência caiu?' }));

    expect(await within(conversa()).findByText(/52,4%/)).toBeInTheDocument();
    expect(within(conversa()).getAllByText('Inferência do Viber — pode conter erros')).toHaveLength(
      2,
    );
  });

  /** A revisão dos piezos é uma recomendação, com o selo. */
  it('recomenda a revisão dos piezos', async () => {
    renderizar();
    await within(conversa()).findByText('Sim, compara com o teste #022.');

    await userEvent.click(screen.getByRole('button', { name: 'Quando revisar os piezos?' }));

    expect(
      await within(conversa()).findByText('Recomendação do Viber — confira antes de agir'),
    ).toBeInTheDocument();
    expect(conversa()).toHaveTextContent('piezo 6');
  });

  /** Pergunta livre: aviso de indisponível e o rascunho continua no campo. */
  it('mantém o rascunho da pergunta livre', async () => {
    renderizar();
    await within(conversa()).findByText('Sim, compara com o teste #022.');
    const campo = screen.getByLabelText('Pergunte ao Viber sobre seus dados');

    await userEvent.type(campo, 'Qual foi o pico?');
    await userEvent.click(screen.getByRole('button', { name: 'Enviar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Perguntas livres ficam disponíveis com o backend da Viber.',
    );
    expect(campo).toHaveValue('Qual foi o pico?');
  });
});

describe('ViberIaPage — contexto e conversas', () => {
  /** Contexto da conversa: período, veículo, teste ativo, amostras e os 4 nós. */
  it('mostra o contexto', async () => {
    renderizar();

    const contexto = screen.getByRole('region', { name: 'Contexto da conversa' });
    expect(await within(contexto).findByRole('radio', { name: 'Semana' })).toBeChecked();
    expect(await within(contexto).findByText('Honda Civic 2026 · ABC1D23')).toBeInTheDocument();
    expect(
      await within(contexto).findByText('#023 · Cidade · Centro Sorocaba'),
    ).toBeInTheDocument();
    expect(await within(contexto).findByText('265 validadas')).toBeInTheDocument();
    expect(await within(contexto).findByText('212 mW')).toBeInTheDocument();
    expect(contexto).toHaveTextContent('3,30 V');
    expect(await within(contexto).findByText('68%')).toBeInTheDocument();
    expect(contexto).toHaveTextContent('115 mW');
  });

  /** Trocar o contexto troca o resumo oferecido. */
  it('troca o contexto do resumo', async () => {
    renderizar();
    await within(conversa()).findByText('Sim, compara com o teste #022.');

    await userEvent.click(await screen.findByRole('radio', { name: 'Hoje' }));
    await userEvent.click(screen.getByRole('button', { name: 'Resumo de hoje' }));

    expect(await within(conversa()).findByText(/292 mWh/)).toBeInTheDocument();
  });

  /** Nova conversa começa vazia e entra nas recentes. */
  it('cria uma conversa nova', async () => {
    renderizar();
    await within(conversa()).findByText('Sim, compara com o teste #022.');

    await userEvent.click(screen.getByRole('button', { name: 'Nova conversa' }));

    expect(
      await within(conversa()).findByText('Escolha uma sugestão para começar.'),
    ).toBeInTheDocument();
    const recentes = screen.getByRole('region', { name: 'Conversas recentes' });
    expect(within(recentes).getAllByRole('button')[0]).toHaveTextContent('Nova conversa');
  });

  /** Abrir uma conversa recente mostra as mensagens dela. */
  it('abre uma conversa recente', async () => {
    renderizar();
    const recentes = screen.getByRole('region', { name: 'Conversas recentes' });

    await userEvent.click(
      await within(recentes).findByRole('button', { name: /Falha de fixação do piezo 7/ }),
    );

    await waitFor(() => expect(conversa()).toHaveTextContent('#017'));
    expect(
      within(recentes).getByRole('button', { name: /Falha de fixação do piezo 7/ }),
    ).toHaveAttribute('aria-current', 'true');
  });
});

describe('ViberIaPage — estados', () => {
  /** Enquanto o Viber responde, a tela avisa. */
  it('mostra que está respondendo', async () => {
    const repositorio = criarRepositorioMock();
    vi.spyOn(repositorio, 'enviarMensagemViber').mockReturnValue(new Promise(() => {}));
    renderizar(repositorio);
    await within(conversa()).findByText('Sim, compara com o teste #022.');

    await userEvent.click(screen.getByRole('button', { name: 'Resumo da semana' }));

    expect(await screen.findByText('Viber está respondendo…')).toBeInTheDocument();
  });

  /** Falha ao carregar a conversa: erro com "Tentar de novo". */
  it('mostra o erro da conversa', async () => {
    const repositorio = criarRepositorioMock();
    vi.spyOn(repositorio, 'obterMensagensViber').mockRejectedValue(new Error('sem conexão'));
    renderizar(repositorio);

    expect(await screen.findByText('Não foi possível carregar a conversa.')).toBeInTheDocument();
  });
});
