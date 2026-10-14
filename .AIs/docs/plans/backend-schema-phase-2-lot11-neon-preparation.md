<!-- Roteiro de inventário remoto e retorno para a primeira migration do VERS. -->

# Fase 02 — lote 11: preparação do Neon

## Estado

Em 24/09/2026, o programador autorizou a aplicação. A conexão PostgreSQL pela
`DATABASE_URL` da raiz apontou para `neondb`, role `neondb_owner`, schema
`public`. Antes da migration, não havia tabelas, enums, views ou histórico
Prisma; apenas `plpgsql` estava instalado. A role tinha permissão de criação
no banco e no schema. Não havia dados a preservar. O conector Neon continuou
com erro de `project_id`, então a conexão direta foi utilizada sem expor a URL.

Após esse inventário, `prisma migrate deploy` aplicou a migration versionada.
A verificação posterior encontrou 14 tabelas de domínio, 16 enums, 45 índices,
sete triggers e `citext`; `_prisma_migrations` registra a execução concluída.
`prisma migrate status` informou que o banco está atualizado. Nenhum snapshot
foi criado, pois o schema de destino estava vazio antes da aplicação.

O SQL versionado está em
`services/backend/prisma/migrations/20260923000100_initial_schema/migration.sql`.
Este documento registra o inventário e a aplicação ao Neon compartilhado.
Não copiar URLs com senha para logs nem executar `prisma db push`.

O formato de conexão está documentado em `services/backend/.env.example`:
`DATABASE_URL=postgresql://user:password@ep-seu-projeto.us-east-2.aws.neon.tech/vers?sslmode=require`.
Essa URL é apenas ilustrativa e não permite consultar o Neon real. O valor real
deve ser fornecido ao processo por um meio privado quando houver acesso, sem
exibi-lo no terminal nem registrá-lo neste documento.

## Inventário somente de leitura

Com as tabelas vazias, basta identificar banco e branch, tabelas, tipos, views,
dependências, histórico de migrations e permissões para `citext`. Não é preciso
estimar volumes nem fazer backup de registros legados. Se surgirem objetos além
dos sete legados ou dependências externas, revisar o SQL antes da aplicação;
não apagar o schema inteiro por aproximação. As consultas abaixo ficam
disponíveis para inspeção completa se o estado divergir do informado.

Executar as consultas abaixo no banco e branch exatos que receberão a migration.
Registrar somente nomes, definições estruturais e tamanhos estimados; não
consultar linhas de usuário ou payloads. Uma role de leitura basta para este
inventário. Confirmar nome do banco, branch e role por canal privado da equipe.

```sql
-- Identifica o destino sem revelar credenciais.
SELECT current_database() AS database_name, current_user AS role_name,
       current_schema() AS schema_name, version() AS postgres_version;

-- Mostra tabelas, volumes e estimativa do catálogo, sem ler seus registros.
SELECT n.nspname AS schema_name, c.relname AS table_name,
       c.reltuples::bigint AS estimated_rows,
       pg_total_relation_size(c.oid) AS total_bytes
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')
ORDER BY c.relname;

-- Mostra tipos, extensões, índices e constraints existentes.
SELECT extname, extversion FROM pg_extension ORDER BY extname;
SELECT table_name, ordinal_position, column_name, data_type, udt_name,
       is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' ORDER BY table_name, ordinal_position;
SELECT t.typname FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
WHERE n.nspname = 'public' AND t.typtype = 'e' ORDER BY t.typname;
SELECT tablename, indexname, indexdef FROM pg_indexes
WHERE schemaname = 'public' ORDER BY tablename, indexname;
SELECT conrelid::regclass::text AS table_name, conname, contype,
       pg_get_constraintdef(oid) AS definition
FROM pg_constraint WHERE connamespace = 'public'::regnamespace
ORDER BY table_name, conname;

-- Aponta views e views materializadas que podem depender do legado.
SELECT schemaname, viewname, definition FROM pg_views
WHERE schemaname = 'public' ORDER BY viewname;
SELECT schemaname, matviewname, definition FROM pg_matviews
WHERE schemaname = 'public' ORDER BY matviewname;

-- Lista triggers, rotinas, políticas e publicações que exigem revisão.
SELECT c.relname AS table_name, t.tgname AS trigger_name
FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND NOT t.tgisinternal
ORDER BY table_name, trigger_name;
SELECT p.proname AS routine_name, pg_get_function_identity_arguments(p.oid) AS arguments
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' ORDER BY routine_name, arguments;
SELECT schemaname, tablename, policyname FROM pg_policies
WHERE schemaname = 'public' ORDER BY tablename, policyname;
SELECT pubname FROM pg_publication ORDER BY pubname;
SELECT pubname, schemaname, tablename FROM pg_publication_tables
WHERE schemaname = 'public' ORDER BY pubname, tablename;

-- Lista objetos com dependência normal das sete tabelas legadas.
WITH legacy AS (
  SELECT c.oid, c.relname FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname IN (
    'telemetries', 'ai_predictions', 'tests', 'configurations',
    'energy_summaries', 'mqtt_messages', 'ai_interactions'
  )
)
SELECT legacy.relname AS legacy_table,
       pg_describe_object(d.classid, d.objid, d.objsubid) AS dependent_object,
       d.deptype AS dependency_type
FROM pg_depend d JOIN legacy ON legacy.oid = d.refobjid
WHERE d.deptype = 'n'
ORDER BY legacy_table, dependent_object;

-- Confere a tabela de controle do Prisma sem selecionar seus registros.
SELECT to_regclass('public._prisma_migrations') AS prisma_migrations_table;

-- Confere a permissão requerida para criar a extensão citext, se necessário.
SELECT has_database_privilege(current_user, current_database(), 'CREATE')
       AS can_create_extension_in_database,
       has_schema_privilege(current_user, 'public', 'CREATE')
       AS can_create_in_public;
```

Se `_prisma_migrations` existir, consultar apenas `migration_name`,
`finished_at` e `rolled_back_at` para verificar se houve aplicação anterior;
não executar essa consulta se a tabela não existir. A consulta opcional é:

```sql
SELECT migration_name, finished_at, rolled_back_at
FROM public._prisma_migrations ORDER BY started_at;
```

Comparar os resultados com
as sete tabelas legadas que o SQL remove e com os 16 nomes de enums que cria.
Confirmar também dependências externas sobre as tabelas legadas. Qualquer objeto inesperado
interrompe a preparação para revisão do SQL; não usar `CASCADE` para contorná-lo.

## Backup e retorno antes da aplicação

1. Confirmar com a equipe uma janela sem gravações e o destino exato.
2. Criar um ponto de retorno do banco/branch imediatamente antes da aplicação,
   usando o mecanismo de backup disponível para a equipe. Registrar o identificador
   e a hora em canal privado, sem credenciais ou dados de registros no repositório.
3. Confirmar quem pode restaurar, o procedimento e o tempo esperado. O retorno
   deverá restaurar o estado anterior inteiro: o SQL descarta sete tabelas do
   legado, portanto uma migration reversa isolada não recupera seus dados.
4. Conferir que o backup pertence ao destino inventariado e que a equipe aceita
   descartar dados escritos após o ponto de retorno caso precise restaurá-lo.
5. Antes da aplicação, comparar o inventário remoto com a lista de `DROP TABLE`,
   os enums, índices e constraints do SQL. Registrar divergências e ajustar a
   migration versionada antes de qualquer execução.

## Critério para avançar

O lote 11 só estará concluído com inventário remoto registrado sem dados
sensíveis, dependências reconciliadas, permissões conferidas e plano de retorno
revisado. A aplicação no Neon é o lote 12, separado.
