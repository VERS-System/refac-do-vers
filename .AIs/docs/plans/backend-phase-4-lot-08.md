# F04 — lote 08: regressão e fechamento para revisão

## Plano autorizado

1. Escrever testes para CSRF malformado e envelope HTTP 403 antes das correções.
2. Conferir eventos de autenticação na allowlist e validar resultado em runtime.
3. Executar a suíte unitária do backend e atualizar contexto e roadmap.

Arquivos: guard CSRF e teste novo, filtro HTTP e teste, política de auditoria e
teste, roadmap da F04 e contexto de 05/10/2026.

Sem alteração de dependências ou integração externa. Auditoria persistente ainda
depende da integração de domínio; este lote verifica a política reutilizável.
Autenticação WebSocket permanece pendente. F04 só pode ser encerrada após revisão
do programador e conferência final dos contratos e fluxos.

## Divergência encontrada no checkout

O checkout inicial estava em `feature-esp32-micropython-setup`, sem implementação
de auth. O programador informou `backend-mqtt`; o trabalho foi retomado nessa
branch preservando as alterações. O teste CSRF confirmou RangeError para token
multibyte antes da correção, que exige hexadecimal de 64 caracteres.

Conferência de contratos concluída para as seis rotas: tipos compartilhados
complementados para CSRF/logout-all, Origin e X-CSRF-Token declarados nas cinco
mutações, resposta 403 documentada. Referências locais do OpenAPI verificadas.
Regressão HTTP adicionada às cinco mutações; ciclo de sessão permanece coberto
pelos testes HTTP e de serviço existentes, com doubles de banco/Redis.

Arquivos adicionais: `app.foundation.spec.ts`, `packages/shared-types/src/auth.ts`
e teste de tipos, `docs/Api/openapi.yaml`, `docs/Api/endpoints.md`, índice do roadmap.
F04 permanece em andamento até revisão; auditoria persistente não foi conectada.

## Validação final

Backend: 20 suítes/120 testes, lint e build passaram. Shared-types: testes de
compilação, lint e build passaram. OpenAPI: seis rotas, referências locais
resolvidas e CSRF nas cinco mutações. `git diff --check` passou.
