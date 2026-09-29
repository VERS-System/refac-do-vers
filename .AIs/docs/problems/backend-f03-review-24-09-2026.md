<!-- Revisão do pull da Fase 03 frente ao roadmap executável do backend VERS. -->

# Revisão da Fase 03 — pull `aeeed66`

Data: 24/09/2026. Base: `4764ba9`; commit revisado: `aeeed66` (`feat: implement backend phase 3 API foundation`). Fonte de comparação: `.AIs/docs/plans/backend-phase-3-execution-roadmap.md`, contratos REST e testes incluídos no pull. Esta é uma revisão estática com execução local de testes, lint e build; não houve conexão com Neon nem mudança de código.

## Conclusão

O pull segue o **escopo funcional geral** da Fase 03: cria infraestrutura REST, não publica CRUD de domínio e mantém autenticação para a fase seguinte. Ainda **não atende ao critério de conclusão do roadmap por lotes**. O commit reúne entregas dos lotes 02–08, sem entregas revisáveis e validação registradas lote a lote. Parte dos comportamentos adversos e da conferência de contrato do lote 09 não foi demonstrada. Os três problemas técnicos abaixo precisam de correção.

## Aderência por lote

| Lote | Estado observado | Evidência e lacuna |
| --- | --- | --- |
| 01 — Baseline | Parcial | O contexto registra falha inicial do teste por importação de `AppModule`, mas não traz inventário dos scaffolds, matriz contrato × implementação nem classificação das rotas existentes. |
| 02 — Bootstrap | Parcial | `/api/v1` e teste HTTP de health existem. Não foi demonstrado teste de configuração inválida nem revisão isolada deste lote. |
| 03 — Entrada e paginação | Parcial | Há DTOs e testes unitários de defaults, limites, UUID e intervalo. Faltam testes HTTP de allowlist/campo extra e data de calendário inválida; a validação atual aceita data inexistente. |
| 04 — Envelope e erros | Parcial | Interceptor e filtro foram criados. O teste HTTP cobre apenas sucesso de health; o filtro tem só teste unitário de 400. Faltam evidências HTTP de lista paginada, 404, 409, 429 e 500 sem vazamento. |
| 05 — Correlação e logs | Parcial | Request ID e log estruturado existem. Faltam testes de requisições concorrentes e de log em falha; o status logado no caminho de erro pode ser incorreto. |
| 06 — Limites HTTP e CORS | Parcial | CORS, Helmet e throttling são configurados. O pull não inclui testes novos de origem negada, preflight com credenciais, headers nem 429 no envelope público. |
| 07 — Auditoria | Parcial | `AuditPolicyService` aplica allowlist e descarta payload. Não há teste de falha de persistência; persistência de eventos de domínio continua corretamente fora desta fase. O plano deve deixar explícito como verificar a falha sem antecipar gravação real. |
| 08 — Health | Parcial | `live` e `ready` foram criados; teste unitário cobre falha do probe. O teste HTTP só usa Prisma mockado com sucesso. Não há teste de timeout, recuperação, shutdown nem inicialização com banco fora. A conexão no bootstrap inviabiliza `live` nesse cenário. |
| 09 — Contrato e entrega | Parcial | Documentos REST/OpenAPI, tipos e contexto foram atualizados; testes locais passam. Não há matriz OpenAPI × rotas efetivas nem teste HTTP abrangente dos casos adversos. |

O roadmap determina um lote por vez, falha inicial de teste antes de cada implementação, `test:unit` por lote, diffs pequenos e contexto de cada entrega. O histórico contém apenas um commit para toda a Fase 03 e o contexto registra uma validação final. Isso não prova a sequência de TDD ou revisão por lote. É uma lacuna de evidência e processo; não é prova de que testes foram escritos depois do código.

## Problemas técnicos a corrigir

### P1 — Liveness indisponível quando o banco cai na inicialização

`services/backend/src/prisma/prisma.service.ts` chama `$connect()` em `onModuleInit()`. O `AppModule` importa `PrismaModule`, portanto a inicialização HTTP falha se o banco estiver indisponível. A rota `/api/v1/health/live` foi desenhada para responder sem dependências, mas não chega a existir nesse cenário. `app.foundation.spec.ts` substitui o Prisma por mock e só verifica o caminho de sucesso. **Correção esperada:** permitir que o processo HTTP inicialize e responda `live` com banco fora; `ready` deve retornar 503 e voltar a 200 após recuperação. Testar o ciclo real de inicialização/falha/recuperação sem Neon.

### P2 — Status incorreto nos logs de exceção

Em `services/backend/src/common/interceptors/logging.interceptor.ts`, o `catchError` lê `response.statusCode` antes de o filtro global aplicar o status da exceção. Uma falha 400/500 pode ser registrada como 200. Isso compromete diagnóstico e métricas de erro previstas no lote 05. **Correção esperada:** derivar o status da exceção conhecida ou registrar após a definição do status HTTP; testar 400 e 500 no fluxo HTTP completo, conferindo log e resposta com o mesmo `requestId`.

### P3 — Data UTC de calendário inválida passa na validação

`services/backend/src/common/dto/pagination.dto.ts` usa regex para `startedFrom` e `startedTo`, sem validar se o dia existe. `2026-02-31T12:00:00Z` satisfaz o padrão quando enviado isoladamente. Isso contraria o lote 03, que pede datas UTC válidas. **Correção esperada:** validar instante e formato canônico UTC, incluindo anos bissextos e limites do mês; testar datas impossíveis e intervalo invertido por HTTP.

## Decisões e documentação

- O roadmap reserva ao programador a decisão sobre Redis no readiness. O código e o contexto assumem que Redis não é obrigatório para o REST nesta fase. Registrar essa escolha como decisão aprovada ou reabrir a questão antes de encerrar o lote 08.
- Cookies, `SameSite` e CSRF seguem pendentes para a Fase 04, como previsto. Nenhuma mutação autenticada foi publicada neste pull.
- O índice `.AIs/docs/plans/backend-roadmap/README.md` ainda marca a Fase 03 como planejada. Mantê-la em andamento até fechar os critérios acima; não marcá-la concluída apenas porque o commit compila.

## Verificação realizada nesta revisão

Os binários locais do backend executaram Jest (`15` suítes, `40` testes), ESLint e `nest build` com sucesso. A invocação por `pnpm.cmd` não chegou aos scripts: o pnpm tentou reinstalar dependências e abortou a remoção de `node_modules` por falta de TTY. A validação direta comprova o estado atual dos testes/lint/build, mas não substitui os cenários ausentes nem a evidência por lote.

## Próxima entrega revisável

Corrigir P1–P3 com testes que falhem primeiro, adicionar os cenários HTTP adversos dos lotes 03–06 e 08, documentar a matriz contrato × rotas e a decisão de Redis, então repetir testes, lint e build. Registrar resultados por lote ou por correção pequena, sem refazer a Fase 03 inteira em um único diff.
