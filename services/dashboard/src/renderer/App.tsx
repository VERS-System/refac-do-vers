/**
 * Componente raiz do app desktop do VERS.
 *
 * Define as rotas da interface. Usa HashRouter porque, empacotado no
 * Electron, o app é aberto via `file://`, onde rotas baseadas em caminho não
 * funcionam. As 8 telas internas ficam dentro do `AppShell` (sidebar + tela);
 * Login, Criar conta e Primeiro veículo ficam fora dele. A rota raiz e rotas desconhecidas
 * levam à Visão geral, a tela inicial.
 *
 * Também monta os provedores de dados: o cache do TanStack Query e o
 * repositório (hoje, o de exemplo; a API real entra trocando só esta peça).
 */

import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { RepositorioProvider, type RepositorioVers } from '@/data/repositorio';
import { criarRepositorioMock } from '@/data/repositorioMock';
import { ConfiguracoesPage } from '@/pages/ConfiguracoesPage';
import { CriarContaPage } from '@/pages/CriarContaPage';
import { EnergiaPage } from '@/pages/EnergiaPage';
import { LoginPage } from '@/pages/LoginPage';
import { PrimeiroVeiculoPage } from '@/pages/PrimeiroVeiculoPage';
import { TelemetriaPage } from '@/pages/TelemetriaPage';
import { TestesPage } from '@/pages/TestesPage';
import { VeiculosPage } from '@/pages/VeiculosPage';
import { VeiculoInstalacaoPage } from '@/pages/VeiculoInstalacaoPage';
import { ViberIaPage } from '@/pages/ViberIaPage';
import { VisaoGeralPage } from '@/pages/VisaoGeralPage';
import { ROTAS } from '@/routes/navegacao';

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
  return (
    <QueryClientProvider client={clienteConsultas}>
      <RepositorioProvider repositorio={repositorio}>
        <HashRouter>
          <Routes>
            <Route element={<AppShell />}>
              <Route path={ROTAS.visaoGeral} element={<VisaoGeralPage />} />
              <Route path={ROTAS.telemetria} element={<TelemetriaPage />} />
              <Route path={ROTAS.energia} element={<EnergiaPage />} />
              <Route path={ROTAS.testes} element={<TestesPage />} />
              <Route path={ROTAS.veiculos} element={<VeiculosPage />} />
              <Route path={ROTAS.veiculoInstalacao} element={<VeiculoInstalacaoPage />} />
              <Route path={ROTAS.viberIa} element={<ViberIaPage />} />
              <Route path={ROTAS.configuracoes} element={<ConfiguracoesPage />} />
            </Route>
            <Route path={ROTAS.login} element={<LoginPage />} />
            <Route path={ROTAS.criarConta} element={<CriarContaPage />} />
            <Route path={ROTAS.primeiroVeiculo} element={<PrimeiroVeiculoPage />} />
            <Route path="*" element={<Navigate to={ROTAS.visaoGeral} replace />} />
          </Routes>
        </HashRouter>
      </RepositorioProvider>
    </QueryClientProvider>
  );
}
