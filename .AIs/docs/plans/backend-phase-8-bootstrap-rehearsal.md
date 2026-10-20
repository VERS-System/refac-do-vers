<!-- Prepara ensaio do executável real sem iniciar serviços antes da autorização específica. -->
# F08 — Ensaio isolado do bootstrap real

> Executado em 19/10/2026: dois cenários reais aprovados, dados sintéticos
> removidos e cinco containers da bancada parados com código zero. Sem encerrar
> F08 inteira: integração de clientes permanece pendente.

## Autorização de execução — 19/10/2026

Programador informou ter desligado o outro sistema e liberou Docker e próximo
passo, em resposta ao pedido específico de subir somente bancada, criar/remover
dados sintéticos e pará-la ao terminar. Inventário inicial confirma serviços
parados. Manter os limites deste plano; nenhum comando na stack paralela.

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

## Ajuste da bancada encontrado na execução

Inicializador mqtt-auth-init falhou ao sobrescrever /auth/passwords preservado,
com erro File exists. Stat confirmou diretório 755 e arquivo 640, ambos 1883:1883;
inicializador executa como root. Mudar propriedade para root não resolveu e foi
descartado. Ajustar docker-compose.test-mqtt.yml para touch do arquivo e
atualização das três credenciais sem -c; restaurar 1883:1883 e 640 ao fim como
já fazia. Sem remover volume ou arquivo. Ajuda do utilitário e fonte oficial
consultadas durante diagnóstico; não atribuir a falha a permissões sem prova.
Verificação: executar o inicializador duas vezes sobre volume preservado e
confirmar sucesso/permissões finais antes de iniciar broker.

## Resultado real — 19/10/2026

- Portas 55432/56379/58883/53000 livres no preflight; demais sistemas já parados
  pelo programador e não alterados pela IA. Iniciado somente projeto isolado.
- Inicializador corrigido passou uma vez via run e novamente via up; arquivo
  final /auth/passwords 640 e 1883:1883. Broker/Redis/PostgreSQL saudáveis.
- Tabelas, triggers e índices relevantes presentes no banco preservado; contagens
  iniciais zero. Sem reaplicar schema, preparar banco ou executar migration.
- Certificado TLS público renovado/copiado, ignorado pelo Git; chave só no volume.
- Build local aprovado. Jest específico: dois cenários aprovados/código zero,
  em 31,936 s. Desabilitado: readiness e namespace inativo. Habilitado: processo
  compilado iniciou coordenador sem chamada manual, publicou lote MQTT/TLS,
  persistiu três amostras, entregou aviso autorizado e retornou um resumo REST
  com energia 4/3600 Wh. Não houve correção de produção necessária.
- SQL final confirmou zero para users, refresh_sessions, user_vehicles, vehicles,
  vers_installations, devices, tests, mqtt_messages, telemetry_samples e
  energy_summaries. Limpeza pelos IDs das fixtures; sem exclusão global.
- Porta HTTP 53000 liberada; os cinco containers Exited (0), volumes preservados.
- Validação final: 46 suítes/961 testes unitários, lint, build, TypeScript noEmit
  e diff --check aprovados. Sem novo rebuild de imagem: usa dist local.

Este ensaio não repetiu os sete cenários F08.7 antigos, não comprova shutdown
gracioso Windows, operação de produção, integração de frontend ou múltiplas
réplicas. Não acessou .env/Neon nem alterou dependências. Sem commit/push.
