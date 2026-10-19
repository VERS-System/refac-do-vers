/**
 * As 11 telas do app, cada uma carregada sob demanda (divisão por tela,
 * Fase 5): o código de uma tela só é baixado quando ela é aberta. O shell
 * (sidebar, barra superior, busca e notificações) fica no pacote inicial.
 *
 * Nos testes (Vitest), todas as telas chegam pré-carregadas, para que cada
 * tela apareça na primeira renderização, como antes da divisão. No build,
 * `import.meta.env.MODE` vira texto fixo e esse trecho some. Plano em
 * `.AIs/docs/plans/desktop-frontend-fase-5.md`.
 */

import { telaSobDemanda } from './telaSobDemanda';

export const TELAS = {
  visaoGeral: telaSobDemanda(() =>
    import('@/pages/VisaoGeralPage').then((m) => ({ default: m.VisaoGeralPage })),
  ),
  telemetria: telaSobDemanda(() =>
    import('@/pages/TelemetriaPage').then((m) => ({ default: m.TelemetriaPage })),
  ),
  energia: telaSobDemanda(() =>
    import('@/pages/EnergiaPage').then((m) => ({ default: m.EnergiaPage })),
  ),
  testes: telaSobDemanda(() =>
    import('@/pages/TestesPage').then((m) => ({ default: m.TestesPage })),
  ),
  veiculos: telaSobDemanda(() =>
    import('@/pages/VeiculosPage').then((m) => ({ default: m.VeiculosPage })),
  ),
  veiculoInstalacao: telaSobDemanda(() =>
    import('@/pages/VeiculoInstalacaoPage').then((m) => ({ default: m.VeiculoInstalacaoPage })),
  ),
  viberIa: telaSobDemanda(() =>
    import('@/pages/ViberIaPage').then((m) => ({ default: m.ViberIaPage })),
  ),
  configuracoes: telaSobDemanda(() =>
    import('@/pages/ConfiguracoesPage').then((m) => ({ default: m.ConfiguracoesPage })),
  ),
  login: telaSobDemanda(() => import('@/pages/LoginPage').then((m) => ({ default: m.LoginPage }))),
  criarConta: telaSobDemanda(() =>
    import('@/pages/CriarContaPage').then((m) => ({ default: m.CriarContaPage })),
  ),
  primeiroVeiculo: telaSobDemanda(() =>
    import('@/pages/PrimeiroVeiculoPage').then((m) => ({ default: m.PrimeiroVeiculoPage })),
  ),
};

if (import.meta.env.MODE === 'test') {
  await Promise.all(Object.values(TELAS).map((tela) => tela.precarregar()));
}
