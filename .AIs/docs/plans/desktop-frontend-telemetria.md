<!-- Plano da tela Telemetria do app desktop (Fase 4 do roadmap do frontend desktop), escrito antes da implementação. -->

# Plano — Tela Telemetria (desktop)

Parte da Fase 4 do [roadmap do frontend desktop](desktop-frontend-roadmap.md).
Referência visual: `services/dashboard/design-reference/02-telemetria`.
Alinhado à task da equipe [D05 — Telemetria ao vivo](desktop-roadmap/05-tela-telemetria-tempo-real.md)
e ao contrato `TelemetrySample` / `TelemetrySearchQuery`
(`packages/shared-types/src/telemetry.ts`).

## 1. Decisões do usuário (14/10/2026)

| Tema | Decisão |
|---|---|
| Gráfico "Sinal em tempo real" | Últimos **10 minutos** de amostras de 10 s (não o "60 s a 10 Hz" do Stitch, que o contrato não fornece) |
| Escopo das amostras | **Por teste**, como o D05: os dois trajetos de hoje viram os testes #022 (manhã, concluído) e #023 (tarde, em andamento); seletor de teste com padrão no em andamento; energia acumulada por teste |
| Botão "Ao vivo" | Alterna **Ao vivo** (consulta a cada 10 s) e **Pausado**; mostra o estado da conexão do D05 (conectado, reconectando, desatualizado, offline, pausado). No exemplo os dados não mudam (relógio fixo em 18:05) |
| "Buffer local · Limpar" | Trocado por **"N amostras neste teste"**, sem Limpar (o D05 proíbe histórico local como fonte de verdade) |
| Exportar CSV | Gera o arquivo de verdade, como na Energia (decisão de 14/10/2026) |

## 2. Divergências com o Stitch

| Onde | Stitch | Implementação | Motivo |
|---|---|---|---|
| Horários | 14:31–14:32 | até 18:05 (o "agora" do exemplo) | às 14:32 o carro estava parado |
| Energia acumulada | +0,03 mWh por amostra | ≈ 0,59 mWh por amostra a 212 mW | 212 mW × 10 s ÷ 3600 |
| Gráfico | 60 s a 10 Hz | 10 min a cada 10 s | só existem amostras de 10 s |
| Qualidade | Válida, Parcial, Suspeita | + Inválida | enum do backend tem 4 valores |
| Total de amostras | 3.412 | contado das amostras do teste | derivado, não copiado |
| Busca "por teste" | campo de texto | seletor de teste | a telemetria é por teste |

## 3. Dados de exemplo (derivados, não inventados)

- **Testes de hoje** (`fixtures/testes.ts`): #022 "Rodovia · SP-348", 07:50–08:35,
  concluído; #023 "Cidade · Centro Sorocaba", desde 17:21, em andamento. São
  os dois deslocamentos da curva de hoje. A tela Testes vai partir deles.
- **Amostras** (`fixtures/telemetria.ts`), a cada 10 s dentro de cada teste
  (270 na manhã, 265 à tarde), com milissegundos de captura variando:
  - potência: interpolação linear da curva por minuto (a integral bate com a
    curva);
  - tensão: `1,6 + 0,0152 × P` (212 mW → 4,82 V); corrente: `P ÷ V`
    (→ 44 mA), como a cadeia ao vivo;
  - vibração: `P ÷ 66` + ruído (mesmo modelo da dispersão da Energia);
  - temperatura: sobe ao longo do teste até 31,4 °C no fim do #023;
  - piezos: 6 de 8 na maior parte; 5 ou 4 às vezes (semente fixa);
  - qualidade: Suspeita com 4 ou menos piezos, Parcial com 5, Inválida
    raramente (tensão e corrente ausentes), Válida no resto;
  - energia acumulada: trapézios desde o início do teste;
  - a última amostra (18:05:00) é a leitura ao vivo: 212 mW, 4,82 V, 44 mA,
    3,2 m/s², 31,4 °C, 6/8, Válida.

## 4. Contrato do repositório

- `obterTestes()` → testes (hoje, os dois do dia).
- `obterAmostrasTelemetria({ testeId, pagina, tamanhoPagina, qualidade?, de?, ate? })`
  → `{ itens, total, pagina, tamanhoPagina }`, da mais recente para a mais
  antiga; tamanho padrão 20 e máximo 100, como o backend. A mesma consulta
  serve ao gráfico (`de` = agora − 10 min), às últimas leituras (6 itens), à
  tabela e à exportação (todas as páginas).

## 5. Tela

- Barra superior: título, subtítulo "Amostras validadas do ESP32 · intervalo
  10 s", "Dados de exemplo", **Exportar CSV** e **Ao vivo / Pausado**
  (`aria-pressed`). Sem seletor de período (a referência não tem).
- **Sinal em tempo real** (Recharts): potência (mW, eixo esquerdo), tensão (V)
  e vibração RMS (m/s², tracejada) no eixo direito; chips para ligar e
  desligar cada série; eixo em segundos até "Agora"; resumo acessível.
- **Últimas leituras**: as 6 mais recentes (horário, potência, tensão,
  qualidade), estado da conexão e "N amostras neste teste".
- **Tabela de amostras**: filtros de teste e qualidade, faixa do teste
  ("Hoje, 17:21 até 18:05"), piezos ativos; colunas da referência; paginação
  "Mostrando 1 a 20 de 265 amostras" com Anterior/Próxima.
- Estados: carregando, erro (com "Tentar de novo"), teste sem amostras e
  filtro sem resultado.
- Remove o componente antigo `components/TelemetryTable.tsx`.

## 6. Arquivos

- Novos: `data/fixtures/testes.ts`, `data/fixtures/telemetria.ts`,
  `components/telemetria/` (barra de ações, gráfico do sinal, últimas
  leituras, tabela), `components/charts/GraficoSinal.tsx`,
  `pages/TelemetriaPage.test.tsx` e os testes de cada peça.
- Alterados: `data/tipos.ts`, `data/calculos.ts` (estado da conexão),
  `data/repositorio.tsx`, `data/repositorioMock.ts`, `data/exportacao.ts`
  (CSV das amostras), `hooks/useDados.ts`, `lib/format.ts` (horário com
  milissegundos), `pages/TelemetriaPage.tsx` e testes.

## 7. Validação

TDD (testes antes, falhando pelo motivo certo), `npm run test:unit`,
`npm run build` e prints em 1280 e 1512 px. Sem commit: a regra 7 do
`.AIs/AGENTS.md` deixa os commits para o programador.

## 8. Execução (14/10/2026)

Implementado conforme o plano, aguardando revisão e commit do programador.

- TDD: testes do formatador de horário, estado da conexão, testes de hoje,
  gerador das amostras, repositório, hooks, exportação, busca de todas as
  páginas, gráfico do sinal e da página escritos antes; com esboços, 42
  falharam pelo motivo certo. Depois: 45 arquivos de teste e 308 testes
  passando, sem avisos; build OK.
- Números da tarde (#023): 265 amostras, última às 18:05:00 com 212 mW, 4,82
  V, 44 mA, 3,2 m/s², 31,4 °C, 6/8 e Válida; energia acumulada no teste de
  147,96 mWh. Manhã (#022): 270 amostras, 07:50:00 a 08:34:50.
- Ajustes da conferência visual: a tabela ganhou a variante `densa` no
  `Table` (células com 10 px laterais) e cabeçalhos mais curtos
  ("Acumulada (mWh)", "Vibração (m/s²)") para as 10 colunas caberem em
  1280 px; o CSV mantém os nomes completos.
- Extra: o estado de conexão "conectando" (primeira consulta, antes de
  qualquer resposta), além dos estados do D05.
- Removido `components/TelemetryTable.tsx` (tema antigo).

## 9. Premissas a validar pelo programador

- Nomes e horários dos testes #022 e #023 (a tela Testes do Stitch tem
  outras datas, que serão ajustadas a esta linha do tempo).
- Fórmula da tensão em função da potência e as frequências das qualidades.
- Regra de qualidade por número de piezos (o backend é quem classifica; aqui
  é só o exemplo).
