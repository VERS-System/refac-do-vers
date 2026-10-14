<!-- Revisão estática da primeira migration Prisma do banco VERS. -->

# Fase 02 — lote 9: revisão do SQL inicial

## Artefato

`services/backend/prisma/migrations/20260923000100_initial_schema/migration.sql`
foi gerado a partir de `schema.prisma` com `prisma migrate diff --from-empty`
e complementado com os cinco arquivos de `prisma/manual-constraints/`.
`migration_lock.toml` fixa PostgreSQL como provedor. **O SQL ainda não foi
aplicado a nenhum banco neste lote.**

O arquivo contém uma transação, `CREATE EXTENSION IF NOT EXISTS citext`, 14
tabelas, 16 enums, 24 FKs, quatro índices únicos parciais, sete funções e seis
triggers complementares. As colunas de email e placa usam `CITEXT`; economia e
tarifa usam `DECIMAL(18,6)` e `DECIMAL(18,8)`. As FKs de histórico usam `SET NULL`
onde o registro deve sobreviver à exclusão.

## Legado e consumidores

A transação remove explicitamente as sete tabelas experimentais conhecidas em
`public`: `telemetries`, `ai_predictions`, `tests`, `configurations`,
`energy_summaries`, `mqtt_messages` e `ai_interactions`, nessa ordem. Não usa
`CASCADE`: qualquer dependência adicional interrompe a execução. A decisão de
descartar os dados legados vale apenas para esta primeira troca; migrations
posteriores devem preservar o banco existente.

Uma busca nos fontes do backend e do `ai-service` não encontrou consultas ou
models SQLAlchemy consumidores das tabelas `ai_interactions` e
`ai_predictions`. O `ai-service` atual expõe somente health. A ausência de
consumidores no repositório não substitui o inventário do Neon no lote 11.

## Revisão e limites

- A ordem das remoções respeita as FKs legadas conhecidas: telemetria e
  predições antes de testes, testes antes de configurações.
- O SQL gerado cria tabelas, enums, índices e FKs antes dos complementos. Assim,
  cada índice parcial, `CHECK` e trigger encontra suas tabelas e colunas.
- `citext` é criado antes das colunas `CITEXT`. A role do banco de destino precisa
  ter permissão para criar ou usar a extensão; isso será conferido no lote 11.
- O programador solicitou posteriormente o ensaio local, registrado no
  [lote 10](backend-schema-phase-2-lot10-local-migration.md). A comparação do
  SQL com o estado real do Neon e o plano de retorno pertencem ao lote 11.
  Nenhuma conclusão de aplicabilidade remota é feita neste lote.
- Antes de Neon: inventariar tabelas, índices, FKs, volumes e dependências
  externas; confirmar backup restaurável e janela sem gravações; revisar este SQL
  se o estado real divergir do baseline. Não usar `prisma db push`.

## Verificações deste lote

`prisma validate`, geração do Prisma Client, `test:unit` (23 testes), lint e
build do backend passaram com URL sintética, sem conexão com o Neon. O arquivo
foi revisado estaticamente quanto a `citext`, drops sem `CASCADE`, índices
parciais, FKs e blocos transacionais.
