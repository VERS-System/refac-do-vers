/**
 * Componente raiz do app desktop do VERS.
 *
 * Define as rotas da interface. Usa HashRouter porque, empacotado no
 * Electron, o app é aberto via `file://`, onde rotas baseadas em caminho não
 * funcionam. As 8 telas internas ficam dentro do `AppShell` (sidebar + tela);
 * Login, Criar conta e Primeiro veículo ficam fora dele. A rota raiz e rotas
 * desconhecidas levam à Visão geral, a tela inicial. Cada tela é carregada
 * sob demanda (`routes/telas`); enquanto o código chega, o `Suspense` mostra
 * o esqueleto da tela (no shell, a sidebar continua na tela).
 *
 * Também monta os provedores de dados: o cache do TanStack Query e o
 * repositório (hoje, o de exemplo; a API real entra trocando só esta peça).
 */

import { Suspense, useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { CarregandoTela } from '@/components/layout/CarregandoTela';
import { RepositorioProvider, type RepositorioVers } from '@/data/repositorio';
import { criarRepositorioMock } from '@/data/repositorioMock';
import { ROTAS } from '@/routes/navegacao';
import { TELAS } from '@/routes/telas';
import { usePreferencias } from '@/stores/preferencias';

/**
 * Monta os provedores, o roteador e a tabela de rotas do app.
 *
 * O `QueryClient` e o repositório são criados uma vez por montagem
 * (via `useState`), para não perder o cache a cada renderização. O
 * repositório pode vir de fora: os testes usam isso para simular recusas do
 * backend sem mexer no repositório de exemplo.
 */
export default function App({ repositorio: externo }: { repositorio?: RepositorioVers } = {}) {
  const [clienteConsultas] = useState(() => new QueryClient());
  const [repositorio] = useState(() => externo ?? criarRepositorioMock());
  const reduzirMovimento = usePreferencias((estado) => estado.reduzirMovimento);

  // "Reduzir movimento" vira `data-reduzir-movimento` no `<html>`, que o CSS
  // global usa para desligar animações em todas as telas, inclusive no Login.
  useEffect(() => {
    const raiz = document.documentElement;
    if (reduzirMovimento) raiz.dataset.reduzirMovimento = 'true';
    else delete raiz.dataset.reduzirMovimento;
    return () => {
      delete raiz.dataset.reduzirMovimento;
    };
  }, [reduzirMovimento]);

  return (
    <QueryClientProvider client={clienteConsultas}>
      <RepositorioProvider repositorio={repositorio}>
        <HashRouter>
          <Suspense fallback={<CarregandoTela />}>
            <Routes>
              <Route element={<AppShell />}>
                <Route path={ROTAS.visaoGeral} element={<TELAS.visaoGeral />} />
                <Route path={ROTAS.telemetria} element={<TELAS.telemetria />} />
                <Route path={ROTAS.energia} element={<TELAS.energia />} />
                <Route path={ROTAS.testes} element={<TELAS.testes />} />
                <Route path={ROTAS.veiculos} element={<TELAS.veiculos />} />
                <Route path={ROTAS.veiculoInstalacao} element={<TELAS.veiculoInstalacao />} />
                <Route path={ROTAS.viberIa} element={<TELAS.viberIa />} />
                <Route path={ROTAS.configuracoes} element={<TELAS.configuracoes />} />
              </Route>
              <Route path={ROTAS.login} element={<TELAS.login />} />
              <Route path={ROTAS.criarConta} element={<TELAS.criarConta />} />
              <Route path={ROTAS.primeiroVeiculo} element={<TELAS.primeiroVeiculo />} />
              <Route path="*" element={<Navigate to={ROTAS.visaoGeral} replace />} />
            </Routes>
          </Suspense>
        </HashRouter>
      </RepositorioProvider>
    </QueryClientProvider>
  );
}
