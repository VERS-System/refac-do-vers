<!-- Plano e baseline para fechar as lacunas da Fase 03 em entregas pequenas. -->

# Fase 03 — correções lote a lote (26/09/2026)

## Baseline — lote 01

- Árvore de trabalho inicialmente limpa. `AppModule` registra Config, Throttler, Prisma e Health; apenas `GET /api/v1/health/live` e `GET /api/v1/health/ready` são rotas públicas efetivas.
- `main.ts` configura prefixo, Helmet, CORS, validação, filtro, interceptors e shutdown. `API_PREFIX` tem padrão `api/v1` e validação Joi.
- Scaffolds de `auth`, `data`, `ai`, `mqtt`, `websocket`, guards e middleware legados existem, mas não estão ligados ao `AppModule`; não contam como endpoints implementados. DTOs, filtro, interceptors e auditoria da F03 estão ligados ou disponíveis, porém a cobertura adversa está incompleta.
- Matriz contrato × implementação: `/health/live` e `/health/ready` — implementados; todas as demais operações em `.AIs/docs/Api/openapi.yaml` — contrato futuro, sem controller registrado. Não alterar os contratos de domínio nesta fase.
- Baseline: `pnpm --filter @vers/backend test:unit`, `lint` e `build` não chegaram aos scripts: PowerShell bloqueou `pnpm.ps1` e `pnpm.cmd` tentou reinstalar `node_modules` sem TTY. Binários locais do serviço: Jest 15 suítes/40 testes, ESLint e `nest build` passaram.
- Lote 02: prefixo `/api/v1`, roteamento HTTP e rejeição Joi de configuração inválida já têm testes existentes (`app.foundation.spec.ts`, `main.spec.ts`, `env.config.spec.ts`). Nenhuma alteração funcional necessária; a comprovação de falha de inicialização com configuração inválida ainda deve ser reforçada antes do encerramento formal do lote.

## Lote 02 — fechado em 26/09/2026

- `app.foundation.spec.ts` agora compila o `AppModule` em isolamento com `API_PREFIX=/api/` e confirma rejeição que identifica `API_PREFIX`.
- O teste HTTP existente confirma `/api/v1/health/live`; `main.spec.ts` confirma a aplicação do prefixo e da infraestrutura global. Nenhuma mudança de produção foi necessária.
- Jest local: 15 suítes/44 testes; ESLint e `nest build` passaram. `pnpm` tentou reinstalar dependências e falhou por conexão com o registro; os binários locais executaram os mesmos scripts.
- Próximo lote: concluir revisão de entrada e paginação do lote 03.

## Lote 03 — fechado em 26/09/2026

- Correção P3 já aplicada nesta sessão: datas UTC inexistentes são rejeitadas por comparação com a representação canônica do instante; dia bissexto válido é aceito.
- O harness HTTP comprova allowlist, UUID inválido, datas não UTC ou inexistentes, intervalo invertido, página zero ou negativa, `pageSize` acima de 100, transformação numérica, padrões 1/20 e limite válido de 100.
- Padrões e máximo conferidos com `.AIs/docs/Api/openapi.yaml` e tipos compartilhados. Jest local: 15 suítes/45 testes aprovados.
- Próximo lote: envelope e catálogo de erros por HTTP. O P2 (status 200 no log de falhas) permanece reservado ao lote 05.

## Lote 04 — fechado em 26/09/2026

- Harness HTTP cobre lista vazia paginada sem envelope duplo e erros 400, 404, 409, 429 e 500 com código, mensagem, detalhes, `requestId` e timestamp; não há exposição de mensagem interna ou stack trace nesses cenários.
- Teste primeiro demonstrou que a lista podia devolver `requestId` divergente do header. `ResponseEnvelopeInterceptor` agora impõe o ID da requisição mesmo quando o controller entrega envelope público.
- Jest local: 15 suítes/47 testes; ESLint e `nest build` passaram. Os logs de erros ainda registram status 200 (P2), reservado ao lote 05.

## Lote 05 — fechado em 26/09/2026

- Teste HTTP falhou primeiro: resposta 400 era registrada com status 200. `LoggingInterceptor` agora usa o status da `HttpException` ou 500 para falha inesperada.
- Testes HTTP conferem status e `requestId` iguais em resposta e log para 400/500, ausência de mensagem interna no log e isolamento de resposta/log em três requisições concorrentes.
- Política de entrada já implementada e mantida: `x-request-id` com 1–80 caracteres de `[A-Za-z0-9._:-]` é reutilizado; demais valores recebem UUID gerado pelo servidor. Corpo, query, cookies e autorização não entram no log estruturado.
- Próximo lote: CORS, headers e throttling.

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
