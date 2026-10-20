<!-- Planeja a integração das medições reais e registra decisões do programador. -->
# Lote 4 — testes, telemetria, energia e CSV

## Decisões confirmadas em 20/10/2026

- API local da demonstração, com dados sintéticos.
- Fuso de apresentação e filtros: `America/Sao_Paulo`.
- Semana: última semana completa, de segunda a domingo; intervalo UTC
  correspondente com início inclusivo e fim exclusivo.
- Energia real: somente blocos horários completos, com cobertura visível.
  Curvas sem contrato continuam em área de demonstração identificada.
- Usar resumos oficiais `HOUR`, sem somar períodos sobrepostos ou calcular
  média simples de médias. Ausência de bloco não equivale a energia zero.
- A cobertura informa blocos disponíveis e sua qualidade; não comprova
  aquisição contínua durante cada hora.

## Execução

1. Proteger exportação paginada: preservar filtros, limitar a 10.000 amostras,
   rejeitar total variável, IDs repetidos, página truncada ou metadados inválidos.
   Exibir erro na tela sem baixar arquivo parcial. Testes antes da implementação.
2. Adicionar operações IPC específicas para testes, transições, amostras,
   resumos e comparação; reutilizar autenticação e validação do remetente.
3. Adaptar contratos reais, unidades e nulabilidade. Seleção explícita de
   instalação/configuração ao criar teste; comparação de dois a cinco testes.
4. Integrar telas, ordem global das amostras, consultas por recurso e CSV.
   Não chamar contador acumulado do dispositivo de energia oficial recuperada.
5. Integrar energia com intervalos horários completos e cobertura, mantendo
   os gráficos sem contrato separados. Conferir limites de dia/mês existentes
   durante implementação, registrando a janela exata na interface.
6. Rodar unidade completa, typecheck, build e ensaio Electron dev/build com
   fixtures conhecidas. Atualizar matriz, roadmap e contexto com evidências.

## Escopo da primeira alteração

`renderer/data/consultasTelemetria.ts` e seus testes;
`renderer/pages/TelemetriaPage.tsx` e seus testes para falhas de exportação;
este plano, roadmap da integração e contexto diário.

Não muda contratos do backend, banco, infraestrutura ou implantação.
Paginação não oferece snapshot: a verificação de total e IDs detecta várias
mudanças concorrentes, mas não garante identidade do conjunto se o total ficar
igual. Snapshot/cursor consistente exige evolução do contrato.

## Estado

Concluído no escopo da demonstração local. Testes/transições, telemetria,
resumos TEST, comparação, energia por instalação/períodos/cobertura e CSV
conectados à API. Tempo real, recuperação e ensaio MQTT/instalador seguem nos
lotes5/6. Os registros abaixo preservam a execução das partes anteriores.

Primeira alteração concluída: proteção do CSV e erro recuperável na tela.
Validação: 86 arquivos/616 testes unitários aprovados, typecheck aprovado e
build dos três alvos Electron aprovado. Testes cobrem truncamento, duplicação,
mudança do total, vínculo, limites, filtros e nova tentativa após falha.
Não repetido ensaio Electron com API real nesta alteração.

## Próxima parte autorizada por NXT

Criar shared/ensaios.ts, main/ensaios.ts, renderer/data/ensaios.ts e testes
antes da implementação. Registrar operações fixas no main/preload e compor
o adaptador na AplicacaoConectada. Integrar lista/transições, resumos TEST,
comparação e amostras. Formulário exige instalação e configuração explícitas.
Conferir Dialogos, PainelTesteAtivo, TabelaHistorico, TelemetriaPage, exportação,
hooks e banner: nenhum contador de dispositivo apresentado como energia oficial,
total de piezos ausente como desconhecido, bateria demonstrativa separada.
Datas de apresentação em Brasília; filtros convertidos para UTC. Paginação de
amostras descendente global sobre contrato ascendente, sem baixar todo o teste.
Energia por instalação e períodos continuam para a próxima parte do lote4.

Validação desta parte: ampliar scripts/session-rehearsal.mjs e
scripts/session-electron.cjs existentes para criar/iniciar/finalizar/cancelar
testes sintéticos, consultar amostras/resumos/comparação e provar 404 entre
contas no Electron dev/build. Limpar por IDs das próprias contas os resumos,
amostras e testes antes de remover veículos/usuários. Usar somente o compose
vers-realtime-rehearsal e suas portas55432/56379, preservando os containers de uso.

Implementado o transporte na mesma fila de autenticação/cadastro, com validação
de remetente já existente, contratos minimizados, enums/UUIDs/datas/metadados
conferidos, CSRF e sem replay de mutações. O adaptador mantém nulos, converte
A/W/Wh para mA/mW/mWh, apresenta Brasília e envia filtros UTC. Resumo inválido
tem estado próprio; contador não substitui energia recuperada oficial.

Telemetria lista todo o histórico por páginas de100 testes e mantém no gráfico
até100 amostras recentes da janela de10 minutos, com truncamento visível.
Tabela e CSV consultam as demais amostras; total físico de piezos desconhecido.
Troca de teste/filtro não reaproveita placeholder de outro recurso. Janela móvel
avança em relógio de10s, sem recriar chaves a cada render. Estado de consulta
REST não comprova conexão física; pausa da tela não interrompe aquisição.

Ensaio ampliado usa UI real no planejamento/início/finalização e ponte real
para cancelamento, consultas e comparação; outra conta recebe404 para leitura
e transição. Também verifica persistência no banco. Nesta parte a telemetria
do ensaio é vazia: valores e paginação com265 amostras são cobertos em unidade.
Publicação MQTT e prova positiva de ponta a ponta permanecem para o lote6.

## Evidências finais desta parte

- TDD para ponte, adaptador, escolha explícita, ação por linha, placeholder
  entre recursos, qualidade inválida e download atrasado após desmontagem.
- `pnpm.cmd --filter @vers/dashboard test:unit --maxWorkers=4`:88 arquivos,
  642 testes aprovados. Uma execução anterior sob carga falhou na espera da
  tela Perfil; repetição com quatro workers passou. O ajuste de qualidade
  parcial manteve número e indicador em elementos separados; suíte final passou.
- `pnpm.cmd --filter @vers/dashboard build`: typecheck e três alvos aprovados.
- `pnpm.cmd --filter @vers/dashboard exec node scripts/session-rehearsal.mjs`:
  seis processos Electron dev/build aprovados, incluindo restauração e logout.
  A automação foi corrigida para aguardar fechamento do diálogo e identificar
  controles ausentes, sem registrar valores de campos ou credenciais.
- Banco isolado após limpeza:0 usuários,0 veículos,0 testes,0 amostras,
  0 resumos. db-test/redis-test parados; volumes e containers de uso preservados.
- Nenhuma alteração de backend/schema/dependências, deploy, commit ou push.

Próxima parte do lote4: energia por instalação, blocos horários completos,
períodos de Brasília e cobertura visível. Depois lotes5/6. Sem fechamento
antecipado do lote4 nem afirmação de validação com hardware.

## Energia por instalação — próxima parte autorizada por NXT

Arquivos: main/ensaios.ts, shared/ensaios.ts, preload/index.ts e testes;
renderer/data/energia.ts e testes, extração do formatador Brasília para lib,
data/ensaios.ts/repositorio.tsx, hooks/useDados.ts, painel de energia oficial,
EnergiaPage/VisaoGeralPage, banner e testes. Ampliar o ensaio Electron existente
com resumos HOUR sintéticos conhecidos e limpeza pelos IDs das instalações.

Janelas: Hora é a última hora fechada; Dia vai do início de hoje em Brasília
até a última fronteira horária; Mês, do início do mês até essa fronteira.
Semana é a última segunda a domingo completos. API recebe UTC, início
inclusivo e fim exclusivo. Hora em curso nunca entra. Dia/mês sem hora completa
mostram estado próprio, sem enviar intervalo vazio à API.

Usar somente HOUR de instalação, testId null, duração1h, sem duplicatas de
bucket ou IDs, dentro da janela, com páginas completas e total estável.
Limite técnico da janela32dias; no máximo768 blocos. Somar apenas energia
oficial dos blocos GOOD/PARTIAL com amostras, identificando a soma como parcial
quando cobertura/qualidade exigir. INVALID e ausência ficam distintos de zero.
Não somar contagens de amostras nem calcular média global de médias horárias.
Cobertura significa disponibilidade dos resumos, não medição contínua da hora.

Painel real compartilhado pelas duas telas, com seleção de instalação, carga,
erro, vazio, cobertura, tabela horária paginada e CSV de toda a janela. Potência
média/pico permanecem por bloco; nenhuma tarifa/eficiência/energia da bateria
ou celular será inventada. Componentes antigos ficam em área de demonstração
identificada e recolhida. Não há fallback para exemplos na falha real.

Validação: TDD de fuso, virada de dia/ano/mês, semana completa, horário de verão,
limites/paginação/duplicação, nulos/zero/qualidade, troca de instalação e CSV.
Suíte completa, typecheck/build e Electron dev/build com fixture de resumos
persistidos; sem mudar backend, schema, dependências ou implantar serviços.

### Energia concluída — evidências

- `main/ensaios` aceita somente HOUR da instalação, query UTC horária de até
  32dias e campos conhecidos; valida vínculo/testId null/duração/intervalo.
- `data/energia` confere paginação completa e total estável, IDs/buckets únicos,
  energia/qualidade e cobertura. Calendário usa America/Sao_Paulo, inclusive
  horário de verão histórico. Nenhuma média global de médias ou tarifa criada.
- Painel compartilhado nas duas telas: soma dos blocos utilizáveis, cobertura
  GOOD/PARTIAL/INVALID/ausentes, gráfico com lacunas, tabela paginada e CSV
  completo. Resumo zero continua zero; ausência/invalidade não vira zero.
- Área de demonstração só monta após abertura explícita. Troca de recurso ou
  erro real não exibe números do recurso anterior nem exemplos como fallback.
- Unidade final:90 arquivos/669 testes aprovados, com maxWorkers4. Typecheck e
  build main/preload/renderer aprovados. TDD antecedeu implementação dos períodos,
  leitura autorizada e painel; asserção do KPI foi refinada para não aceitar
  por engano um valor do eixo do gráfico.
- Electron real: seis processos dev/build aprovados. Fixture persistida de
  100+200mWh e700mWh em instalações distintas; INVALID7Wh e DAY100Wh não entram
  na soma. Semana completa com168 linhas, CSV169 linhas incluindo cabeçalho,
  qualidades/ausências/fuso conferidos. Download real interceptado e cancelado
  antes de qualquer gravação fora do perfil temporário. Outra conta recebe404.
- Ajustados somente detalhes da automação: duas casas decimais esperadas e
  retorno void na instrumentação do Blob, pois função não atravessa executeJavaScript.
- Limpeza por IDs das próprias instalações/contas, antes de vínculos SetNull;
  banco conferido com0 usuários/veículos/testes/amostras/resumos. Sem dados órfãos.
  db-test/redis-test parados, preservando volumes e containers de uso.

Limites mantidos: paginação REST não é snapshot atômico; cobertura não comprova
aquisição contínua. Fixture de resumos persistidos não prova a ingestão/calibração
física; ensaio MQTT completo permanece no lote6. Sem alteração de backend,
schema, dependências, deploy, commit ou push.
