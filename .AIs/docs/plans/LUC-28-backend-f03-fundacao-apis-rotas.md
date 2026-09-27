<!-- Plano de execucao da issue Linear LUC-28 para a fundacao REST do backend. -->

# LUC-28 - Backend F03 - Fundacao das APIs e rotas

## Referencias

- Linear: `LUC-28 - Backend F03 - Fundacao das APIs e rotas`.
- Roadmap remoto lido em `origin/backend-mqtt:.AIs/docs/plans/backend-phase-3-execution-roadmap.md`.
- Contratos publicos: `.AIs/docs/Api/endpoints.md`, `.AIs/docs/Api/openapi.yaml` e `packages/shared-types`.

## Objetivo

Preparar o backend NestJS para receber as fases de autenticacao e dominio com
uma base REST uniforme: `/api/v1`, validacao allowlist, envelope publico,
catalogo de erros, correlacao por `requestId`, logs sem dados sensiveis, CORS,
rate limit, politica minima de auditoria e health checks `live`/`ready`.

## Limites de escopo

- Nao implementar cadastro, login, CRUD de veiculos, ciclo de testes, MQTT,
  WebSocket ou IA.
- Nao publicar controllers de dominio vazios nem mocks de sucesso.
- Nao ler `.env`; usar apenas configuracao validada e testes sinteticos.
- Nao decidir politica operacional final de cookies, CSRF, Redis obrigatorio
  para readiness ou retencao de logs. Registrar esses pontos como pendentes.

## Arquivos previstos

- `services/backend/src/main.ts`: composicao global de middleware, validacao,
  prefixo, filtros e interceptors.
- `services/backend/src/main.spec.ts`: testes unitarios do bootstrap.
- `services/backend/src/app.module.ts`: registro de providers globais e health.
- `services/backend/src/config/*.ts`: prefixo `/api/v1` e variaveis da fundacao.
- `services/backend/src/common/**`: DTOs, filtros, interceptors, request id,
  envelopes e auditoria minima.
- `services/backend/src/modules/health/**`: health checks reais e testaveis.
- `.AIs/docs/contexts/Context_24_09_2026.md`: contexto final da sessao.

## Ordem de implementacao

1. Rodar baseline `pnpm --filter @vers/backend test:unit` antes de alterar codigo.
2. Escrever testes de comportamento da F03 antes da implementacao funcional.
3. Ajustar prefixo/versionamento para expor a base publica como `/api/v1`.
4. Implementar DTOs comuns de UUID, datas UTC e paginacao com limites.
5. Implementar envelope de sucesso/erro e filtro global sem stack trace.
6. Implementar `requestId`, propagacao para resposta e logs com redaction.
7. Integrar CORS/rate limit ao formato de erro quando aplicavel.
8. Implementar politica/componente minimo de auditoria, sem gravar toda request.
9. Implementar `/health/live` e `/health/ready` com probe Prisma testavel.
10. Rodar `test:unit`, `lint` e `build`; ajustar documentacao/contexto.

## Criterios de saida

- `/api/v1` e health checks respondem conforme a fase.
- Entradas desconhecidas sao rejeitadas e paginacao tem defaults/limites.
- Todas as respostas e erros incluem `requestId`; erros nao vazam stack, token,
  cookie, SQL, email, placa ou payload pessoal.
- Logs estruturados possuem metodo, rota, status, duracao e `requestId`.
- Health `live` nao depende de banco; `ready` distingue banco indisponivel.
- `pnpm --filter @vers/backend test:unit`, `pnpm --filter @vers/backend lint` e
  `pnpm --filter @vers/backend build` passam.

## Decisoes abertas registradas

- Dominio final, `SameSite` e mecanismo CSRF ficam para a F04.
- Redis nao sera dependencia obrigatoria do readiness REST nesta fase sem
  decisao explicita do programador.
- Limites finais de producao para rate limit devem ser confirmados antes de
  ambientes reais.
