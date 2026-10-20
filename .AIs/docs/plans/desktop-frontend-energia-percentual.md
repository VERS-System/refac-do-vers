<!-- Plano: tela Energia mostra em % quanto da energia recuperada foi para cada dispositivo. -->

# Plano — energia por dispositivo em % (tela Energia)

## 1. Problema

Para quem não é da área, "224 mWh entregues à bateria" não diz nada, e a
comparação "≈ 1% de uma recarga" faz parecer que o sistema quase não faz
nada. O usuário final entende melhor **quanto da energia gerada foi para
cada dispositivo**, em porcentagem.

## 2. Decisões do programador (regra 11, 19/10/2026)

| Ponto | Decisão |
| --- | --- |
| Energia gerada (recuperada, ponto 1) | Continua em mWh/Wh. |
| Energia para a bateria e para o celular (KPIs) | Número principal em **% do recuperado**; o mWh fica pequeno no rodapé ("do recuperado · 224 mWh"). |
| "≈ 1% de uma recarga" | Sai do card do celular. |
| Card "Perdas na conversão" | Ponto 1 em mWh; pontos 2 a 4 em % do recuperado. A perda de cada etapa (em vermelho) continua. |
| Cadeia de conversão (Visão geral) | Fica como está: mostra potência instantânea (mW) e já tem o η de cada etapa. |

Base do %: `eficiencia(pX, p1)` com uma casa decimal, como as demais
eficiências do DESIGN.md. No card do celular, o valor é igual à eficiência
ponta a ponta (53,5%), que já aparece no fim do card de perdas.

## 3. Mudanças por arquivo

| Arquivo | Mudança |
| --- | --- |
| `components/energia/KpisEnergia.tsx` | KPIs "Energia para a bateria" e "Energia para o celular" em %, com o mWh no rodapé; sai a recarga de referência. |
| `components/energia/CardPerdas.tsx` | Pontos 2 a 4 em % do recuperado. |
| `data/referencias.ts` | Remove `CAPACIDADE_CELULAR_MWH`, se não houver outro uso. |
| `pages/EnergiaPage.tsx` | Comentário do topo atualizado. |
| `pages/EnergiaPage.test.tsx` | Testes atualizados **antes** da implementação (TDD). |

Fora do escopo: gráfico de barras (série da bateria em mWh), tabela e CSV
do resumo por dia (dados técnicos), app mobile.

## 4. Lotes

1. Testes vermelhos em `EnergiaPage.test.tsx` (Semana, Dia e Hora).
2. KPIs em %.
3. Card de perdas em %.
4. Regressão: `npm run test:unit`, `tsc --noEmit`, Prettier e conferência
   visual no navegador.

## 5. Adendo (19/10/2026): versão web no celular

Pedido do usuário: levar a mudança para a versão web que o grupo abre no
celular e corrigir a tela vazia ao rolar até o fim. O link publicado tinha
sido gerado antes da correção do `sr-only` (área rolável `relative` no
`Page`). Além disso, o shell usava `h-screen` (`100vh`), que no navegador do
celular conta a barra de endereço escondida e corta o fim da tela.

- `components/layout/AppShell.tsx`: `h-screen` → `h-dvh`.
- `components/layout/AuthLayout.tsx`: `min-h-screen` → `min-h-dvh`.
- Testes antes (`App.test.tsx`, `AuthLayout.test.tsx`).
- Versão web gerada de novo (`vite build --config vite.web.config.ts
  --base ./`) e publicada no mesmo link, sem os arquivos antigos.
