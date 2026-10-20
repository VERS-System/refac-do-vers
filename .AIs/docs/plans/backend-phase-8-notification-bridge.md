<!-- Planeja ponte passiva de eventos pós-commit para avisos mínimos por recurso no Redis. -->
# F08.3.2 — Ponte de avisos

Avanço solicitado em 15/10/2026 após coordenação 8.3.1. Reutilizar decisões:
evento invalida consultas REST, Redis indisponível pausa novas recepções,
histórico confirmado não é desfeito e notificações não são duráveis.

## Escopo antes do código

Novo RealtimeNotificationService/spec no módulo realtime, injetando pipeline,
Prisma e Pub/Sub existentes. Constructor inerte; start instala listener antes
da recuperação inicial do coordenador. Consultar somente pares distintos de
installationId/testId em TelemetrySample pelo messageId interno. Sem acesso ao
payload bruto, usuário ou medições. Validar identidade/versão/data do evento
interno antes da consulta. Não inferir teste pelo envelope ou instalação.

Emitir um data.updated por recurso distinto não nulo, com horário UTC de
emissão do aviso. Lote parcialmente fora do teste ainda avisa instalação e
somente testes efetivamente associados; lote sem amostras não gera aviso.
Falhas são contidas com código fixo, sem rollback ou retry manual de publicação.
False de publicação pode representar envio ambíguo; não prometer entrega.

Coordenador recebe ponte, instala após abrir Redis e antes de reconciliar
pipeline; shutdown tenta concluir pipeline e tarefas da ponte antes de fechar
Redis. Hooks Nest podem ocorrer simultaneamente: shutdown continua best-effort,
sem garantia de aviso final. Ponte remove listener e aguarda tarefas iniciadas.
Pipeline isola listeners individualmente para uma falha anterior não bloquear
a ponte; preservar once e captura de rejeição assíncrona.

Atualizar módulo, testes afetados do coordenador/pipeline, contrato, índice e
contexto. Sem schema, migration, dependência, frontend, Socket.IO, ativação
automática, conexão ou consulta real a banco/broker. DatArquiteto aplicado à
consulta mínima existente; Backend-master/IoT-master/Ponytail mantidos.

## Verificação

TDD: constructor inerte, deduplicação por recurso, null/leituras sem teste,
evento inválido, ausência de amostras, falha SQL/publicação sem vazamento,
falha de um recurso sem bloquear seguintes, shutdown com lookup pendente,
listener anterior com erro e instalação da ponte antes da recuperação.
Rodar test:unit/lint/build e diff --check. Rebuild somente backend e conferir
live/readiness. Ensaio real e autorização de clientes continuam lotes posteriores.

## Evidência local — 15/10/2026

RED por ponte ausente e listener anterior bloqueando seguintes. GREEN:
43 suítes/881 testes unitários, 15 novos; lint/build aprovados. Testes cobrem
recursos distintos, null/sem amostras, validação interna, consulta/pub falhando,
continuidade após falha de um recurso, start idempotente e shutdown com lookup
pendente. Integração em memória usa pipeline/ponte reais e comprova ausência de
consulta/aviso antes da promessa de commit resolver. Mocks do coordenador
verificam instalação antes do início e encerramento antes do Redis.

Sem alteração de schema/dependências ou ensaio externo. Rebuild somente backend
concluído, imagem 4e3b136803a7. Live ok; readiness 503 inicial e repetição ok com
database/redis ok e MQTT disabled. Ponte permanece sem ativação automática,
como os demais serviços. diff --check e espaços finais dos arquivos novos aprovados.
