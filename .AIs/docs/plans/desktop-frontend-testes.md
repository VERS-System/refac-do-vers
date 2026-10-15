<!-- Plano da tela Testes de campo do app desktop (Fase 4 do roadmap do frontend desktop), escrito antes da implementação. -->

# Plano — Tela Testes de campo (desktop)

Parte da Fase 4 do [roadmap do frontend desktop](desktop-frontend-roadmap.md).
Referência visual: `services/dashboard/design-reference/04-testes`. Alinhado
à task da equipe [D08 — Testes experimentais](desktop-roadmap/08-telas-testes.md)
e ao contrato `TestRecord` / `TestSearchQuery` / `FinishTestRequest`
(`packages/shared-types/src/tests.ts`).

## 1. Decisões do usuário (14/10/2026)

| Tema | Decisão |
|---|---|
| Ações | Funcionam no exemplo: planejar (Novo teste), iniciar, finalizar e cancelar, com confirmação; transições em memória; iniciar com outro teste em andamento é recusado (conflito); a tela só mostra o novo estado depois da resposta (D08) |
| Filtros | Só os do contrato: abas por status com contagem e paginação. Busca e terreno ficam como pedido ao backend |
| Painel ao vivo | Só o medido: tempo decorrido, energia recuperada, potência instantânea, piezos, configuração e bateria. Sem velocidade, rotação, inclinação nem meta (velocidade, rotação e inclinação são informadas ao finalizar e aparecem nos testes encerrados) |
| Histórico | Trajetos da base: cada trajeto da semana vira um teste, com a energia do dia repartida entre seus trajetos |

## 2. Divergências com o Stitch

| Onde | Stitch | Implementação | Motivo |
|---|---|---|---|
| Datas | 03/10 a 07/10 | 28/09 a 05/10 18:05 (+ planejado) | o "agora" é 05/10 18:05 |
| Energia por teste | 0,44 a 4,18 mWh | ~80 a ~210 mWh | um trajeto de 45 min recupera ~145 mWh |
| Abas | Todos, Em execução, Concluídos, Falhos | + Planejados e Cancelados | status do contrato |
| Busca e terreno | campos na lista | fora (pedido ao backend) | `TestSearchQuery` não tem |
| Painel ao vivo | velocidade, rotação, inclinação, meta | fora | não são medidos; sem meta no contrato |
| Comparação | "Pico de vibração 3,8G" e texto interpretativo | energia, potência média, pico de potência e duração; sem texto | o resumo do teste (`EnergySummary`) não tem vibração; o texto não é cálculo |
| "Falha fixação" | resultado | status Falhou + observação | `FAILED` é status; resultado só satisfatório/insatisfatório/inconclusivo |

## 3. Dados de exemplo (derivados)

`fixtures/testes.ts`, a partir de `SEMANA_EXEMPLO` e da curva de hoje:

| Dia | Testes | Observação |
|---|---|---|
| 28/09 Seg | #008 Rodovia · SP-348 (manhã), #009 Cidade · Centro (tarde) | |
| 29/09 Ter | #010 (inconclusivo), #011 | |
| 30/09 Qua | #012, #013, #014 cancelado antes de iniciar (chuva) | |
| 01/10 Qui | #015, #016 (pico de 412 mW às 17:42) | |
| 02/10 Sex | #017 **falhou** (fixação de um piezo), #018 | o dia das lacunas de 4% |
| 03/10 Sáb | #019 Fora de estrada, #020 Misto | |
| 04/10 Dom | #021 Misto (insatisfatório) | |
| 05/10 Seg | #022 Rodovia (concluído, da curva), #023 Cidade (em andamento) | os da Telemetria |
| — | #024 Fora de estrada, planejado | |

- Energia e horas de cada dia repartidas entre os trajetos por uma fração
  fixa; as somas batem com a tela Energia. Potência média = energia ÷ horas.
- Velocidade, rotação e inclinação (informadas ao finalizar) por terreno.
- Resumo do teste (`EnergySummary` de período TEST) só para testes
  encerrados (concluído ou falhou); o em andamento usa a telemetria (última
  amostra: energia acumulada e potência).

## 4. Contrato do repositório

- `buscarTestes({ pagina, tamanhoPagina, status?, inicioDe?, inicioAte? })`
  → página (padrão 10 na tela), do mais recente para o mais antigo.
- `obterResumoTeste(testeId)` → resumo do teste encerrado ou `null`.
- `compararTestes(ids)` → 2 a 5 testes, cada um com o resumo ou `null`.
- `criarTeste`, `iniciarTeste`, `finalizarTeste`, `cancelarTeste` → o teste
  atualizado; erros tipados (`conflito`, `transicao-invalida`, `validacao`,
  `nao-encontrado`).
- A Telemetria passa a usar `buscarTestes({ inicioDe: hoje })`.

## 5. Tela

- Barra superior: título "Testes de campo", subtítulo "Compare
  configurações e terrenos", "Dados de exemplo", **Comparar (n)** (2 a 5
  selecionados) e **Novo teste**.
- Histórico: abas por status com contagem, tabela (seleção, teste/nome com
  terreno, início, duração, energia, potência, status/resultado) e
  paginação.
- Painel do teste em andamento (ou, sem ele, o próximo planejado com
  "Iniciar teste"): tempo decorrido, energia recuperada, potência,
  configuração, bateria, "Finalizar teste" e "Cancelar".
- Comparação: barras por métrica para os testes comparados.
- Diálogos acessíveis (`role="dialog"`, foco, Esc): planejar, iniciar,
  finalizar (concluído/falhou, resultado, velocidade, rotação, inclinação,
  observações) e cancelar (motivo). Erros do repositório aparecem no
  diálogo.
- Componentes novos de UI: `Dialog`, `Select`, `Textarea`.
- Remove `components/TestConfigPanel.tsx` (tema antigo).

## 6. Validação

TDD, `npm run test:unit`, `npm run build`, prints em 1280 e 1512 px. Sem
commit (regra 7).

## 7. Execução (14/10/2026, madrugada)

Implementado conforme o plano, aguardando revisão e commit do programador.

- TDD: 54 testes falharam pelo motivo certo com esboços; depois 51 arquivos
  de teste e 357 testes passando, sem avisos; build OK.
- Histórico: 17 testes (13 concluídos, 1 falho, 1 em andamento, 1
  planejado, 1 cancelado); páginas de 10.
- Lógica dos testes em memória isolada em `data/testesEmMemoria.ts`
  (busca, resumo, comparação e máquina de estados com `ErroRepositorio`).
- A Telemetria passou a usar `buscarTestes({ inicioDe: hoje })`.
- Componentes novos: `components/ui/Dialog.tsx`, `Select.tsx`,
  `Textarea.tsx`, `Paginacao.tsx` (agora também usado pela Telemetria) e
  `components/testes/` (`rotulos.ts`, `TabelaHistorico.tsx`,
  `PainelTesteAtivo.tsx`, `ComparacaoTestes.tsx`, `Dialogos.tsx`).
- Ajustes da conferência visual (1280 px): cabeçalhos de energia e potência
  em duas linhas, nome truncado, duração sem quebra, abas compactas, coluna
  lateral de 300 px e botões do painel empilhados.
- Removido `components/TestConfigPanel.tsx`.

## 8. A validar pelo programador

- O contrato não tem data prevista para testes planejados: a lista mostra a
  data de criação ("Planejado em 05/10").
- Resumo por teste: o plano assume um endpoint de resumo do teste
  encerrado (o backend tem resumos TEST, mas a rota de consulta por teste
  não está no contrato público).
- Só testes encerrados (com resumo) podem ser comparados.
- Repartição da energia de cada dia entre os trajetos e os valores de
  velocidade, rotação e inclinação por terreno.
