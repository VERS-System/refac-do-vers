<!-- Runbook da primeira migration e das futuras evoluções do banco VERS. -->

# Runbook do banco — Fase 02

## Estado verificado em 24/09/2026

A migration `20260923000100_initial_schema` foi aplicada com `prisma migrate
deploy` ao banco `neondb`, schema `public`, após inventário que encontrou destino
vazio e nenhuma migration anterior. A leitura posterior confirmou 14 tabelas de
domínio, 16 enums, 45 índices, sete triggers, `citext` e registro concluído em
`_prisma_migrations`. `prisma migrate status` indicou banco atualizado.
`test:unit` passou com 23 testes; lint e build passaram. O ensaio local da
migration em banco vazio e legado sintético está no registro do lote 10. Não
houve snapshot anterior porque não existiam dados no destino.

## Responsabilidades e preparação

Prisma é dono do schema e das migrations. O serviço Python não cria nem altera
estrutura. Nunca usar `prisma db push` no banco compartilhado. Nunca ler nem
registrar arquivos `.env`; a URL real deve ser fornecida ao processo por canal
privado e não aparecer em logs ou documentação. Confirmar banco, branch, schema
e role antes de qualquer operação. Este runbook não autoriza novas operações
remotas; cada aplicação futura requer decisão específica do programador.

Para uma migration futura, registrar no plano da mudança: objetos afetados,
compatibilidade com clientes, transformação e preservação de dados, locks,
tempo de execução, teste de restauração e critério de retorno. Inspecionar o
estado real sem consultar dados pessoais desnecessários. Criar ponto de retorno
do branch ou backup, registrar seu identificador fora do repositório e validar
quem pode restaurá-lo. Migrations posteriores à inicial preservam dados.

## Validação local antes da aplicação

1. Revisar `schema.prisma`, SQL versionado e SQL complementar de constraints.
   Conferir alterações destrutivas, índices, FKs, extensões e contratos de API.
2. Executar `pnpm --filter @vers/backend prisma:validate` e
   `pnpm --filter @vers/backend prisma:generate` com uma URL PostgreSQL sintética
   fornecida ao processo. Nenhum comando deve depender de um arquivo `.env`.
3. Executar `pnpm --filter @vers/backend test:unit`,
   `pnpm --filter @vers/backend lint` e `pnpm --filter @vers/backend build`.
4. Para constraints e migração, subir o PostgreSQL descartável com
   `docker compose -f docker-compose.test-db.yml up -d --wait` e executar
   `pnpm --filter @vers/backend test:db`. Ensaiar o SQL versionado em cópia
   local representativa quando a evolução envolver dados existentes.
5. Comparar estrutura e histórico do destino com as premissas do SQL. Se houver
   divergência, interromper e revisar migration e plano; não usar `CASCADE`,
   `db push` ou reset como atalho.

O teste `test:db` usa banco sintético local e delta de schema; sozinho não
prova que o SQL versionado funciona. O ensaio do arquivo da migration é uma
verificação separada, conforme o lote 10.

## Aplicação e conferência

1. Registrar autorização, destino exato, janela de aplicação e ponto de retorno.
   Suspender gravações incompatíveis com a mudança.
2. Executar `pnpm --filter @vers/backend prisma:migrate:deploy` com URL real
   fornecida privadamente ao processo. Não imprimir a URL.
3. Executar `prisma migrate status` no mesmo destino e verificar
   `_prisma_migrations`, objetos esperados, índices, triggers e extensões.
4. Rodar smoke tests dos fluxos afetados, observar erros e registrar horário,
   versão, resultados e operador no contexto da entrega.
5. Reabrir gravações apenas após conferir compatibilidade dos consumidores.

## Falha e retorno

Se a aplicação falhar, interromper gravações e preservar logs sem segredos.
Comparar o estado de `_prisma_migrations` e do catálogo com o estado esperado;
não repetir cegamente um SQL parcialmente executado. Falha transacional da
primeira migration deve ser investigada antes de qualquer nova tentativa.

Se houver corrupção, perda de dados ou incompatibilidade que não possa ser
corrigida de forma preservadora, restaurar o branch ou backup previamente
identificado com o operador autorizado. A restauração devolve o banco inteiro
ao instante do ponto de retorno e descarta escritas posteriores; reconciliar
essas escritas antes de retomar o serviço. Após restaurar, verificar schema,
histórico Prisma, contagens e fluxos críticos. Uma migration reversa isolada
não recupera dados descartados. A aplicação inicial ao destino vazio não teve
snapshot prévio, portanto esse procedimento vale para mudanças futuras.

## Referências

- [Dicionário de dados](backend-schema-phase-2-data-dictionary.md)
- [Plano executável da Fase 02](backend-schema-phase-2-execution-roadmap.md)
- [Ensaio local do lote 10](backend-schema-phase-2-lot10-local-migration.md)
- [Inventário e aplicação remota](backend-schema-phase-2-lot11-neon-preparation.md)
