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

Em andamento. Testes/transições, telemetria, resumos TEST, comparação e CSV
conectados à API. Energia por instalação/períodos ainda não concluída.

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
