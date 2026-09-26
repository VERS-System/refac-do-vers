<!-- Plano e baseline para fechar as lacunas da Fase 03 em entregas pequenas. -->

# Fase 03 — correções lote a lote (26/09/2026)

## Baseline — lote 01

- Árvore de trabalho inicialmente limpa. `AppModule` registra Config, Throttler, Prisma e Health; apenas `GET /api/v1/health/live` e `GET /api/v1/health/ready` são rotas públicas efetivas.
- `main.ts` configura prefixo, Helmet, CORS, validação, filtro, interceptors e shutdown. `API_PREFIX` tem padrão `api/v1` e validação Joi.
- Scaffolds de `auth`, `data`, `ai`, `mqtt`, `websocket`, guards e middleware legados existem, mas não estão ligados ao `AppModule`; não contam como endpoints implementados. DTOs, filtro, interceptors e auditoria da F03 estão ligados ou disponíveis, porém a cobertura adversa está incompleta.
- Matriz contrato × implementação: `/health/live` e `/health/ready` — implementados; todas as demais operações em `.AIs/docs/Api/openapi.yaml` — contrato futuro, sem controller registrado. Não alterar os contratos de domínio nesta fase.
- Baseline: `pnpm --filter @vers/backend test:unit`, `lint` e `build` não chegaram aos scripts: PowerShell bloqueou `pnpm.ps1` e `pnpm.cmd` tentou reinstalar `node_modules` sem TTY. Binários locais do serviço: Jest 15 suítes/40 testes, ESLint e `nest build` passaram.
- Lote 02: prefixo `/api/v1`, roteamento HTTP e rejeição Joi de configuração inválida já têm testes existentes (`app.foundation.spec.ts`, `main.spec.ts`, `env.config.spec.ts`). Nenhuma alteração funcional necessária; a comprovação de falha de inicialização com configuração inválida ainda deve ser reforçada antes do encerramento formal do lote.

## Ordem de execução

1. Lote 02: acrescentar teste de bootstrap com configuração inválida e conferir prefixo e middleware. Alterar código só se o teste demonstrar defeito.
2. Lote 03: testar entrada por HTTP (allowlist, UUID, paginação, datas UTC e intervalo). Corrigir a aceitação de dias inexistentes (P3).
3. Lote 04: testar envelope HTTP de lista e erros 400/404/409/429/500, inclusive ausência de dados internos.
4. Lote 05: testar correlação concorrente e logs de falha por HTTP. Corrigir status 200 em exceções (P2).
5. Lote 06: testar CORS permitido/negado, preflight, Helmet e throttling 429.
6. Lote 07: testar falha de persistência com adaptador sintético de auditoria, sem publicar persistência de domínio.
7. Lote 08: testar inicialização com banco indisponível, recuperação, timeout e shutdown; corrigir bloqueio do bootstrap pelo Prisma (P1).
8. Lote 09: conferir novamente OpenAPI × rotas registradas, executar testes/lint/build e registrar resultados e pendências.

Cada correção de código começa por teste comportamental que falha, seguida da implementação mínima e de `test:unit`. Não usar Neon ou serviços externos. O programador fará os commits.

## Decisões operacionais abertas

- Redis no readiness REST: **decisão do programador em 26/09/2026: PostgreSQL e Redis são obrigatórios**. O código atual consulta só PostgreSQL; implementar e testar no lote 08.
- Domínio de cookies, `SameSite` e CSRF pertencem à F04; limites finais de rate limit e retenção de logs seguem pendentes para ambiente real.
