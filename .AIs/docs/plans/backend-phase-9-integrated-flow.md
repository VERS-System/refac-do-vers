<!-- Planeja ampliar o ensaio do executável com sessão HTTP, duplicatas e isolamento. -->
# F09 — Fluxo integrado do backend

## Próximo recorte — veículo e ciclo HTTP

Continuidade autorizada pelo programador. Ampliar a mesma suíte com terceiro
cenário: login real, veículo por POST /vehicles, preparação SQL de instalação,
configuração e dispositivo (sem rotas públicas de criação), teste por POST
/tests, início e encerramento por HTTP, telemetria MQTT vinculada ao teste novo
e consulta de resumo/série. Esperar relógio real ultrapassar última captura
antes de encerrar, sem editar horários persistidos. Verificar snapshots,
horários do servidor, CSRF ausente e transições repetidas recusadas.

Usar somente IDs próprios para limpeza, incluindo auditoria por requestId.
Reutilizar bancada, guard, build e comandos existentes; avisar antes de Docker,
inventariar serviços/portas e parar só bancada ao terminar. Executar unitários,
lint, tipos, build e suíte real. Não acrescentar produção ou dependência sem
regressão demonstrada. Ativação de conta e Electron seguem fora deste recorte.

## Escopo autorizado

Continuidade solicitada pelo programador após levantamento da F09. Reutilizar
test/realtime/bootstrap-rehearsal.e2e-spec.ts e bancada existente. Acrescentar
login HTTP com cookies/CSRF reais, reenvio do mesmo lote sem duplicar amostras
ou energia, consulta da série e recusa REST/Socket.IO após remover vínculo.
Manter usuário ativo sintético: ativação de conta não será inventada.

Sem código de produção, dependências ou configuração novos. Veículo,
instalação, dispositivo e teste continuam fixtures: este recorte não comprova
criação ponta a ponta pela API nem integração Electron. Instalações possuem
somente rotas de leitura. Atualizar roadmap e contexto com limites e evidências.

## Verificação

Executar test:unit, lint, build e TypeScript incluindo testes. Rodar somente
suíte ampliada na bancada local autorizada, com configuração explícita sem
ler .env, guard de banco fixo e certificado público. Avisar antes de Docker;
preservar demais stacks e volumes e limpar somente IDs sintéticos criados.
Falha na infraestrutura não constitui RED funcional. Testes novos exercitam
comportamento existente, sem forçar alteração de produção para obter RED.

## Critério de saída

Login por HTTP cria sessão utilizável no REST/Socket.IO; mensagem MQTT gera
três amostras e 4/3600 Wh; reenvio preserva contagens/energia; vínculo removido
recebe indisponibilidade no REST e ACK de recusa no Socket.IO. Registrar execução
real separadamente da preparação e não declarar F09 concluída.

## Resultado — 19/10/2026

Dois cenários reais aprovados em 15,4 s no executável compilado: modo passivo
preservado; modo ativo usa login HTTP com CSRF/cookies reais, recebe MQTT/TLS,
avisa Socket.IO e retorna três amostras/4/3600 Wh. Reenvio seguido por novo lote
processado (barreira observável) resulta em dois brutos, seis amostras e
10/3600 Wh. REST confirma seis registros; após retirar vínculo, telemetria e
resumo respondem 404 e subscribe responde RESOURCE_UNAVAILABLE.

Primeira execução falhou por expectativa da fixture: segundo lote reiniciava
accumulatedEnergyWh. Contador corrigido para continuidade entre lotes; nenhuma
correção de produção. Nova execução aprovada. Login recebe requestId exclusivo
para limpeza de sua auditoria sem apagar eventos alheios.

46 suítes/962 testes unitários, lint, build e TypeScript incluindo testes
aprovados. Lint/TypeScript repetidos após ajuste final da fixture. Não houve
nova dependência, .env, migration, Neon, frontend, commit ou push.

Inventário inicial: demais stacks paradas e portas livres. Apenas bancada
vers-realtime-rehearsal iniciada; certificado público renovado pelo inicializador
existente e copiado ao output ignorado. Ao fim, zero registros em users,
refresh_sessions, user_vehicles, vehicles, vers_installations, devices, tests,
mqtt_messages, telemetry_samples, energy_summaries e audit_events. Bancada
parada sem apagar volumes. A consulta inicial incluiu por engano audit_logs,
inexistente; corrigida para audit_events na conferência final, sem mutação SQL.

Limites: cliente Socket.IO de ensaio, sem Electron; conta ativa e recursos de
domínio provisionados como fixtures; criação/ciclo de testes pela API, ativação
da conta, observabilidade e operação remota continuam pendentes. Não comprova
shutdown gracioso Windows nem auditoria persistida (somente limpeza final).

## Resultado do ciclo HTTP — 19/10/2026

Terceiro cenário aprovado junto aos dois anteriores: 3/3 em 19,101 s.
Veículo criado por HTTP com propriedade atribuída pelo backend; tentativa sem
CSRF recebe 403. Instalação/configuração/dispositivo preparados somente no
banco sintético. Teste planejado via HTTP valida snapshot, criador e horários
inicialmente nulos. Início e encerramento usam relógio real do servidor;
repetições retornam 409. Espera limitada garante que as três capturas caibam no
intervalo. Lote MQTT/TLS enviado após encerramento é processado para o mesmo
teste: série com três amostras e resumo TEST de 4/3600 Wh.

Primeira execução chegou ao final funcional, mas falhou no afterEach: vínculo
OWNER impedia excluir o veículo. Corrigida ordem local para desvincular antes
de removeFixture; nenhum helper compartilhado ou código de produção alterado.
Registros da tentativa removidos por IDs específicos em transação. Três resumos
de calendário ficaram órfãos após essa limpeza manual e também foram
identificados/removidos por seus IDs, sem limpeza global. Segunda execução
passou integralmente. Conferência final: zero nas 12 tabelas usadas, incluindo
configurations, audit_events e energy_summaries.

46 suítes/962 testes unitários, lint, TypeScript e build aprovados; lint/tipos
repetidos após ajuste do afterEach. Sem novo teste unitário de produção: somente
ampliação do ensaio de comportamento existente. Sem .env, Neon, migration,
dependência, commit ou push. Bancada exclusiva parada, volumes preservados.

Este recorte cobre criação de veículo e ciclo de teste pela API, mas não cria
conta ativa nem instalação por HTTP. Não comprova captura contínua durante teste
RUNNING, recálculo automático no encerramento sem novo MQTT, sessão Electron,
auditoria persistida, observabilidade ou operação remota. F09 permanece aberta.
