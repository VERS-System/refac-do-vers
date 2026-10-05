# F04 — persistência mínima de auditoria de autenticação

## Objetivo

Conectar os cinco eventos existentes (register, login, refresh, logout,
logout-all) a `AuditEvent`, reutilizando a política allowlist e o schema atual.
GET csrf não é evento de autenticação. Não gravar body, cookies, tokens, email,
senha, IP ou payload livre. Usar o requestId confiável do middleware.

## Execução

1. Testes do gravador Prisma: somente campos sanitizados e falhas sem segredos.
2. Implementar gravador em `src/common/audit` sem alterar banco/dependências.
3. Após decisão do programador sobre falha de auditoria, conectar ao AuthModule
   e testar sucesso/erro das operações, preservando erros públicos originais.
4. Executar test:unit, lint e build; atualizar contratos, roadmap e contexto.

Arquivos previstos: gravador e teste novos em common/audit; integração específica
em modules/auth com testes; auth.module.ts e eventualmente controller/service;
documentação da F04 e contexto diário.

## Decisão aprovada — 05/10/2026

O programador escolheu manter auth e revogação e registrar falha técnica sem
segredos. Persistência de auditoria separada da transação da sessão; sem rollback
de autenticação ou revogação. Log técnico estático com ação/requestId, sem causa
interna. Interceptor exclusivo do controller registra SUCCESS/FAILURE e aguarda
a tentativa de gravação. GET csrf e recusas dos guards ficam fora do interceptor.

Escopo mínimo: actorId/resourceId nulos; não inferir identidade de cookies não
validados nem registrar conta identificada apenas por email. Cadastro novo e
duplicado geram o mesmo evento SUCCESS. Sem fila, retentativa ou garantia de
entrega quando o banco estiver indisponível. F05 aguarda PR do programador.

## Entrega e validação

Gravador Prisma + interceptor específico registrados no AuthModule e controller.
Testes cobrem projeção segura, eventos inválidos, sucesso/falha dos cinco fluxos,
preservação de exceções, falha de auditoria e exclusão de CSRF/guards.
22 suítes/139 testes, lint, build e git diff --check passaram.
Sem dependências novas, migrations ou acesso ao banco real. pnpm tentou instalar
e abortou sem TTY; verificação equivalente pelos scripts npm.cmd locais.
