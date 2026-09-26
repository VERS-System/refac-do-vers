<!-- Plano e registro do ensaio da primeira migration em PostgreSQL local descartável. -->

# Fase 02 — lote 10: aplicação local da migration

## Objetivo

Aplicar o SQL versionado da primeira migration em PostgreSQL 16 isolado no
Docker, usando apenas credenciais fixas de teste e dados sintéticos. Este ensaio
foi solicitado pelo programador após a decisão anterior de dispensá-lo.

## Procedimento

1. Criar um contêiner temporário sem volume persistente e sem usar Compose ou
   arquivos `.env`, com porta ligada somente a `127.0.0.1`.
2. Aplicar o arquivo `services/backend/prisma/migrations/20260923000100_initial_schema/migration.sql`
   em banco vazio por `psql` com `ON_ERROR_STOP`.
3. Conferir tabelas, enums, extensão `citext`, índices e triggers criados.
4. Em outro banco temporário, criar apenas o legado sintético necessário para
   verificar que os sete `DROP TABLE` conhecidos funcionam sem `CASCADE`; aplicar
   o mesmo SQL versionado e conferir o estado resultante.
5. Executar os testes unitários do backend, registrar limites e remover o
   contêiner temporário após as verificações.

Nenhum passo acessa o Neon. A aplicação remota continua separada e depende do
inventário real e do procedimento de retorno.

## Resultados em 23/09/2026

O SQL foi aplicado com `psql -v ON_ERROR_STOP=1` em dois bancos PostgreSQL 16
temporários, `vers_test` vazio e `vers_legacy_test` com as sete tabelas legadas e
um registro fictício por tabela. As duas execuções terminaram com `COMMIT` e
código de saída zero. O segundo cenário removeu as sete tabelas sem `CASCADE`.

Em ambos os bancos, a inspeção confirmou 14 tabelas, 16 enums, sete triggers
não internos, 45 índices e a extensão `citext`. No banco com legado,
`telemetries`, `ai_predictions` e `ai_interactions` não existem após a aplicação;
`tests`, `configurations`, `energy_summaries` e `mqtt_messages` foram recriadas.
O `test:unit` do backend passou: sete suítes e 23 testes.

Este ensaio aplicou o SQL diretamente via `psql`; não criou registro em
`_prisma_migrations` e não prova que o estado real do Neon corresponda ao legado
sintético. Não houve conexão com o Neon nem aplicação remota.
