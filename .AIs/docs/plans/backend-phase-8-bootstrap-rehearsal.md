<!-- Prepara ensaio do executável real sem iniciar serviços antes da autorização específica. -->
# F08 — Ensaio isolado do bootstrap real

## Preparação autorizada

Continuidade solicitada após bootstrap opt-in. Criar somente
test/realtime/bootstrap-rehearsal.e2e-spec.ts, reutilizando guard, fixtures,
configuração Jest e bancada vers-realtime-rehearsal existentes. Atualizar índices
e contexto. Nenhuma alteração de produção prevista; corrigir apenas regressão
demonstrada. Sem nova dependência ou Compose.

Dois cenários: executável compilado com MQTT_ENABLED=false expõe REST e recusa
namespace inativo; com true, inicia por conta própria, recebe lote sintético
MQTT/TLS, persiste três amostras, entrega aviso autorizado e retorna resumo REST
com oracle 4/3600 Wh. Não chamar coordenador/start manualmente no ensaio.

## Alvos e limites de execução

Reutilizar projeto vers-realtime-rehearsal e Compose test-db/test-realtime/
test-mqtt, com --env-file docker/mqtt-test/compose.env.example. Portas locais
55432 PostgreSQL, 56379 Redis e 58883 broker TLS; backend filho usa HTTP 53000,
conferida livre antes de iniciar. Bootstrap atual escuta em endereço padrão do
Node (pode incluir interfaces externas); somente contas/segredos sintéticos.
Não abrir firewall ou alterar bind da aplicação neste lote.

Processo filho recebe configuração sintética explícita e certificado público
NODE_EXTRA_CA_CERTS; não herda segredos/NODE_OPTIONS da sessão. Limpar somente
IDs criados. Encerrar somente processo filho iniciado pela suíte e serviços da
bancada ao terminar; preservar volumes e outro sistema em execução. Windows
pode terminar processo sem hooks: este ensaio não comprova shutdown gracioso.

## Sequência após autorização específica

1. Inventariar somente estado Docker e conferir portas; ocupação não pertencente
   à bancada impede início. Não parar outro sistema nem stack VERS habitual.
2. Iniciar os serviços da bancada com mesma base Compose. Renovar certificado
   TLS expirado pelos inicializadores existentes e copiar só certificado público
   para output/realtime-rehearsal/server.crt. Sem rebuild da imagem backend:
   processo de teste executa dist local gerado por npm run build.
3. Conferir schema local; se necessário, preparar apenas vers_test usando cópia
   temporária schema/constraints e prepare.cjs conforme plano F08.7, evitando
   carregamento implícito de .env. Não aplicar migrations externas.
4. No backend, executar build, então Jest dedicado com VERS_REALTIME_REHEARSAL=
   authorized-local-only e NODE_EXTRA_CA_CERTS apontando ao certificado público.
   Usar --runInBand --runTestsByPath test/realtime/bootstrap-rehearsal.e2e-spec.ts
   e --config test/jest.realtime.config.cjs. Executar em novo processo Node.
5. Registrar evidências, limpeza por IDs e stop somente bancada. Sem down -v.

## Validação de preparação

TypeScript noEmit incluindo testes, test:unit, lint e build. Não declarar
integração real aprovada antes de executar. A preparação não exige Docker;
programador pediu aviso antes de usá-lo por existir outro sistema em paralelo.

## Resultado da preparação

TypeScript noEmit incluindo a suíte nova, lint, build e verificação de diff
aprovados. Regressão: 46 suítes/961 testes unitários aprovados. Não há código
de produção novo nem RED/GREEN de integração: os dois cenários reais ainda não
foram executados. Nenhum comando Docker ou acesso à bancada nesta preparação.
Execução depende de autorização específica para iniciar os serviços isolados,
criar/remover seus dados sintéticos e parar somente a bancada ao terminar.
