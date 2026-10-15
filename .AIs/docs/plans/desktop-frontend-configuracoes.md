<!-- Plano da tela Configurações do app desktop (Fase 4 do roadmap do frontend desktop), escrito antes da implementação. -->

# Plano — Tela Configurações (desktop)

Parte da Fase 4 do [roadmap do frontend desktop](desktop-frontend-roadmap.md).
Referência visual: `services/dashboard/design-reference/07-configuracoes`.
Contratos: `UserProfile` / `UpdateUserProfileRequest`
(`packages/shared-types/src/users.ts`) e `LogoutAllRequest`
(`packages/shared-types/src/auth.ts`).

## 1. Decisão do usuário (14/10/2026)

As preferências valem no app todo: unidades (mW/W, mWh/J, m/s²/g) mudam a
exibição em todas as telas, "Reduzir movimento" desliga as animações e a
tarifa cadastrada destrava a "Estimativa de economia" da Energia; ficam
salvas localmente (Zustand persistido). Perfil, alertas e sessões funcionam
em memória; "Encerrar todas as sessões" pede confirmação e leva ao Login.

## 2. Como fica

- **Rascunho**: as mudanças da tela ficam num rascunho até "Salvar
  alterações"; "Descartar" volta ao que estava salvo. Os dois botões só se
  ativam com mudanças.
- **Perfil**: nome (editável), e-mail (do contrato, só leitura, com
  "Verificado"), função (só leitura) e foto (PNG ou JPG até 2 MB, guardada
  em memória). Salvar o nome atualiza a sidebar.
- **Unidades e exibição**: potência mW ou W, energia mWh ou J (kJ a partir
  de 1.000 J), aceleração m/s² ou g; "Reduzir movimento" (também segue o
  `prefers-reduced-motion` do sistema). Aviso: "Os dados são armazenados em
  unidades SI. A conversão acontece só na exibição."
- **Alertas**: dispositivo offline > 5 min, eficiência < 30%, temperatura >
  60 °C (ligados) e resumo diário por e-mail às 23:59 (desligado), com
  contagem de ativos.
- **Tarifa de energia**: valor em R$/kWh; com tarifa, a Energia mostra a
  economia do período e o ritmo anual da última semana completa.
- **Sessões e segurança**: "Encerrar todas as sessões" com confirmação.
- **Sobre o VERS**: versão do app, firmware do ESP32, base de exemplo.
- Navegação lateral do painel rola até cada seção.

## 3. Unidades no app todo

- `lib/unidades.ts` lê a preferência do store e converte; os formatadores
  (`formatarPotencia`, `formatarEnergia`, novo `formatarAceleracao`) devolvem
  o valor e a unidade preferidos.
- Os 44 pontos que escreviam a unidade fixa passam a usar a unidade
  devolvida (cards, tabelas, gráficos e eixos).
- O shell remonta a tela ao trocar as unidades, para tudo se recalcular.
- **Fora da conversão** (a validar): CSV exportado (dados, em unidades base
  com a unidade no cabeçalho) e textos da Viber (conteúdo do backend).

## 4. Divergências com o Stitch

| Onde | Stitch | Implementação | Motivo |
|---|---|---|---|
| Telefone | campo | fora | não existe no `UserProfile` |
| E-mail | editável (aparência) | só leitura | o contrato só edita nome e foto |
| Animações + Reduzir movimento | dois controles | só "Reduzir movimento" | faziam a mesma coisa |
| "Pulso MQTT/BLE" | texto | "MQTT" | o app usa MQTT |
| Sincronização "Último backup 14:32" | rodapé | fora | sem dado; contradiz o "agora" 18:05 |
| Tarifa | só item de menu | seção com valor em R$/kWh | destrava a economia da Energia |

## 5. Arquivos

- Novos: `stores/preferencias.ts`, `lib/unidades.ts`,
  `components/configuracoes/` (seções), `pages/ConfiguracoesPage.test.tsx`
  e testes.
- Alterados: `lib/format.ts` (unidades, `formatarAceleracao`,
  `formatarMoeda`), `data/tipos.ts` (perfil), `data/repositorio.tsx`,
  `data/repositorioMock.ts`, `hooks/useDados.ts`,
  `components/energia/CardEconomia.tsx`, `components/layout/AppShell.tsx`,
  `styles/global.css` (reduzir movimento), `test/setup.ts` e os componentes
  com unidade fixa.

## 6. Validação

TDD, `npm run test:unit`, `npm run build`, Prettier, prints em 1280 e 1512
px. Sem commit (regra 7).

## 7. A validar pelo programador

- Conversão fora do CSV e da Viber.
- Limiares dos alertas fixos (só ligar e desligar).
- Estimativa anual pela última semana completa.
- Foto guardada só em memória (o contrato tem `avatarUrl`, sem upload).
- Escalas em joules: J inteiro até 1 kJ e kJ com duas casas; potência em W
  com três casas ("0,212 W"); aceleração em g com duas casas ("0,33 g").
- Gráficos continuam desenhados em mW e m/s²; só eixos, dicas e legendas
  mudam. No eixo direito da Telemetria (tensão e vibração juntas) os
  números ficam na escala original.
- Preferências gravadas no aparelho (`localStorage`), exceto os alertas.

## 8. Execução (14/10/2026)

- TDD: 23 testes novos falharam pelo motivo certo antes da implementação
  (store, formatadores, repositório, hook, Energia e a tela); depois, mais 3
  testes vermelhos para as unidades na tabela da Energia, na Telemetria e
  nas casas da energia acumulada.
- Implementado: `stores/preferencias.ts` (Zustand + `persist`, sem os
  alertas), `lib/unidades.ts`, formatadores com unidade preferida,
  `formatarAceleracao`, `formatarMoeda`, `atualizarPerfil`/`encerrarSessoes`
  no repositório de exemplo, `useAcoesPerfil`, `CardEconomia` com tarifa,
  `AppShell` (remonta ao trocar unidades e aplica `data-reduzir-movimento`),
  CSS de movimento reduzido (preferência do app e do sistema),
  `components/configuracoes/Secoes.tsx` e a página.
- Unidades aplicadas em: KPIs da Visão geral e da Energia, card de vibração,
  tabela por dia, gráficos de energia (eixos, rótulos e legendas), dispersão
  energia × vibração, Telemetria (tabela, botões das séries, sinal),
  Testes (tabela, painel ativo, comparação) e anexo da Viber.
- Ajuste visual: o texto de ajuda do e-mail saiu (desalinhava "Função").
- Resultado: 430 testes passando sem avisos, `tsc` e build ok, prints em
  1280 e 1512 px conferidos.
