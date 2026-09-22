<!-- Fase 03 do roadmap executável do backend VERS. -->

# Fase 03 — Fundação das APIs e rotas

## Objetivo

Transformar os contratos aprovados em uma API NestJS uniforme, observável e
testável, ainda sem completar todas as regras de domínio.

## Etapa A — Bootstrap e módulos

- registrar somente módulos cobertos por testes no `AppModule`;
- organizar módulos por domínio, não por cliente;
- manter controllers finos e regras em services;
- integrar Prisma por providers testáveis.

## Etapa B — Validação e respostas

- DTOs allowlist com `class-validator`;
- rejeição de campos extras e mass assignment;
- envelope único de sucesso, erro e paginação;
- catálogo estável de códigos de erro;
- filtros para validação, HTTP e falhas externas.

## Etapa C — Rotas e documentação

- implementar primeiro rotas definidas no OpenAPI;
- manter `/api/v1` e versionamento explícito;
- gerar documentação sem expor schemas internos;
- adicionar exemplos sintéticos e estados de erro.

## Etapa D — Observabilidade transversal

- request ID e correlation ID;
- logs estruturados com redaction;
- auditoria allowlist sem tokens ou payload pessoal;
- métricas básicas de latência, erro e rate limit.

## Etapa E — Saúde e dependências

- `/health/live` para vida do processo;
- `/health/ready` para Prisma, Redis e dependências obrigatórias;
- timeouts e classificação de falhas;
- shutdown hooks e encerramento idempotente.

## Testes

- DTOs aceitam somente campos documentados;
- erros nunca retornam stack trace ou segredo;
- paginação possui limites;
- request ID aparece em resposta e log;
- OpenAPI permanece compatível com shared types;
- health checks distinguem vida de prontidão.

## Saída

API inicializa com infraestrutura transversal pronta para autenticação e
recursos de domínio.
