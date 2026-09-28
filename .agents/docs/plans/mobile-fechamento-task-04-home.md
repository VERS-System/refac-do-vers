<!-- Subdivisão da Task 04 (Home) em sub-entregas pequenas e testáveis. -->

# Plano — Task 04 Home em sub-entregas

Cada sub-entrega segue TDD (teste antes da tela) e vira um commit pequeno
feito pelo programador. Indicadores e estados chegam por props; valores seguem
fixtures marcadas como amostra até o contrato F06. Nenhum cálculo no cliente;
navegação sai por callbacks.

## 04a — Período, unidade e qualidade nos indicadores

- Exibir ao lado de cada indicador: período ("Últimos 30 dias"), unidade
  ("Wh", "W", "%") e qualidade ("dados de amostra").
- Props de texto com padrão sensato; sem mudar layout dos cards.
- Testes: cada indicador anuncia período, unidade e qualidade.
- Aceite: nenhum número "solto" sem contexto.

## 04b — Carregamento, ausência de dados e erro

- Nova prop `status: HomeStatus` (`loading`, `success`, `noData`, `error`,
  `noInstallation`, `insufficientQuality`); `loading` com indicador,
  `noData`/`error` com mensagens e nova tentativa por callback.
- Testes: cada estado renderiza certo; erro permite tentar de novo.
- Aceite: `loading` não mostra números; erro não mostra zeros.

## 04c — Sem instalação, qualidade insuficiente e marca de amostra

- `noInstallation`: orientação de vincular veículo/sistema (sem navegar
  sozinho); `insufficientQuality`: aviso de dados insuficientes.
- Selo "dados de amostra" visível enquanto houver fixtures.
- Testes: mensagens, selo presente em `success`, ausente quando real (prop).
- Aceite: critério "sem apresentar simulado como real" atendido.

## 04d — Navegação aos detalhes

- Callbacks `onOpenBattery`, `onOpenVersSystem` (e `onOpenViber` já existe);
  cards virem atalhos acessíveis sem calcular nada.
- Testes: cada atalho dispara seu callback.
- Aceite: atalhos com nome acessível e sem diagnóstico.

## 04e — Acessibilidade e validação final da Task 04

- Nome+papel em atalhos/indicadores, ordem de leitura, responsividade;
  regressão total.
- Aceite (critério de saída da Task 04): estado essencial comunicado,
  `test:unit` e `tsc --noEmit` verdes, pronta para resumos do backend.

Arquivos: `src/screens/HomeScreen.tsx` e
`src/screens/__tests__/HomeScreen.test.tsx`
(possível `HomeScreen.states.test.tsx` se o arquivo crescer demais).
