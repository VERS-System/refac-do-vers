<!-- Plano executável, em pequenos lotes, para implementar o banco da Fase 02 do VERS. -->

# Fase 02 do backend — plano completo do banco

## Objetivo e estado

**Execução em 24/09/2026:** o programador autorizou a aplicação remota. A URL
da raiz foi usada sem expor credenciais; o destino retornou `neondb`, role
`neondb_owner` e schema `public` vazio. A migration
`20260923000100_initial_schema` foi aplicada com `prisma migrate deploy`.
`prisma migrate status` confirmou que o banco está atualizado.

Substituir o schema experimental por um modelo Prisma/PostgreSQL que sustente
os contratos REST aprovados, com primeira migration versionada e validação
antes de qualquer aplicação ao Neon. Este documento detalha **apenas a Fase
02** do [roadmap do backend](backend-roadmap/README.md); controllers, regras de
API e ingestão funcional pertencem às fases seguintes.

**Estado em 24/09/2026:** Fase 02 concluída. Os 12 lotes foram executados,
incluindo migration remota, dicionário de dados e runbook no lote 12.
`schema.prisma` contém o novo modelo dos domínios aprovados, sem os
modelos experimentais de IA. O
[plano técnico](backend-schema-phase-2.md)
e o [baseline](backend-schema-phase-2-lot1-baseline.md) são fontes de detalhe.

## Regras para todos os lotes

- Um lote por vez, com diff pequeno e revisão do programador antes do próximo.
  A IA não cria commits; a tabela abaixo sugere um commit por lote.
- Antes de editar código, escrever testes que expressem comportamento ou
  invariantes observáveis; confirmar a falha inicial e então implementar.
  Não usar testes que apenas procuram texto no `schema.prisma`.
- Ao final de cada lote de código, executar `test:unit` do backend. Rodar
  `prisma validate`, geração do client, lint e build quando o lote afetar o
  schema; os testes de integração dos lotes de modelagem e o ensaio local do
  lote 10 compõem a evidência das constraints e da migration.
- Nunca ler `.env`. Fixtures são sintéticas. Prisma é dono das migrations;
  nenhum ORM paralelo altera o banco.
- Desenvolvimento e validação local não autorizam `db push`, reset, migration,
  leitura ou escrita no Neon. Qualquer ação remota exige autorização específica
  depois de mostrar SQL, inventário, backup e procedimento de restauração.
- A primeira troca pode descartar o legado fictício conforme decisão do
  programador. Todas as migrations **posteriores** preservam dados existentes.

## Lotes e entregas

| Lote | Estado | Implementação e entrega revisável | Validação principal |
| --- | --- | --- | --- |
| 01 — Baseline local | Concluído | Inventário dos sete models legados, ausência de migrations, contratos F01 e decisões do banco. | `prisma validate` local com URL fictícia; sem conexão. |
| 02 — Infraestrutura de testes | Concluído | PostgreSQL descartável em Compose separado, URL sintética obrigatória e suíte Jest de integração independente dos testes unitários. O teste de conexão foi escrito antes da configuração e falhou inicialmente pela ausência do script. Os cenários de domínio serão escritos antes de cada lote de implementação correspondente. | `test:db`: 1 teste; `test:unit`: 23 testes; lint e build passaram. Nenhum schema ou dado remoto alterado. |
| 03 — Identidade e sessões | Concluído | `User`, enum `UserStatus`, `UserRoleAssignment` com enum `USER`/`ADMIN` e `RefreshSession`. Email em `citext`; senha e refresh token têm apenas colunas de hash. Sem `Role` ou `AuthIdentity`. SQL local gerado por diff, sem migration versionada nesta etapa. | `test:db`: 4 testes incluindo unicidade case-insensitive, coexistência de papéis e rotação/revogação; `test:unit`: 23; `prisma validate`, client, lint e build passaram. |
| 04 — Veículos e vínculos | Concluído no schema | `Vehicle`, `UserVehicle` e enum `OWNER`/`DRIVER`/`ADMIN`; placa `citext` única e imutável por trigger; FKs restritivas e índice parcial de um principal por conta em SQL complementar. A transação de desvinculação, promoção do principal e remoção após o último vínculo fica para o serviço de veículos; FKs do histórico entram no lote 6. | `test:db` verifica compartilhamento, concorrência do principal, placa e proteção contra exclusão direta; `test:unit`, Prisma, lint e build passaram. |
| 05 — Instalações e configurações | Concluído no schema | `VersInstallation`, `Device` e `Configuration` versionada. FK composta impede associar ESP32 a outro veículo; índice parcial limita a um dispositivo não revogado por veículo, inclusive em `OFFLINE`/`FAULT`; trigger torna configuração imutável. | `test:db`: 11 testes; `test:unit`: 23; Prisma, lint e build passaram em banco vazio. A substituição funcional fica para o serviço. |
| 06 — Testes e snapshots | Concluído no schema | `Test` com enums de estado, terreno e resultado, condições medidas e snapshot imutável sem placa. FKs opcionais preservam o teste após exclusão de veículo, instalação, configuração e conta; `createdById` fica nulo após exclusão da conta. Trigger diferida valida compatibilidade das referências. Transições de estado ficam para o service. | `test:db`: 14 testes, inclusive exclusão e incompatibilidade; `test:unit`: 23; Prisma, lint e build passaram. |
| 07 — MQTT e telemetria | Concluído no schema | `MqttMessage` bruto e `TelemetrySample` em relação 1:N, com posição/instante no lote, qualidade, unidades, unicidade e índices. Na exclusão final, a transação deve apagar bruto antes do veículo; FKs restritivas exigem essa ordem e as amostras permanecem. | `test:db`: 17 testes, inclusive deduplicação e exclusão ordenada; `test:unit`: 23; Prisma, lint e build passaram. |
| 08 — Resumos, suporte e auditoria | Concluído no schema | `EnergySummary` por períodos, dinheiro em `Decimal`, `SupportRequest` e `AuditEvent` sem payload/metadados livres. Índices parciais evitam duplicatas; triggers apagam IDs de recursos físicos excluídos da auditoria. Validação do texto livre do suporte pertence ao service. | `test:db`: 20 testes, incluindo precisão, unicidade e exclusão; `test:unit`: 23; Prisma, lint e build passaram. |
| 09 — SQL da primeira migration | Concluído, sem aplicar | SQL inicial transacional, `citext`, 14 tabelas, 16 enums, 24 FKs e constraints complementares. Sete tabelas legadas são removidas explicitamente, sem `CASCADE`; modelos de IA experimentais saíram após busca de consumidores. [Revisão](backend-schema-phase-2-lot9-sql-review.md). | Revisão estática do SQL; `prisma validate`, client, `test:unit` (23), lint e build passaram; nenhum banco alterado. |
| 10 — Aplicação local da migration | Concluído | [Ensaio](backend-schema-phase-2-lot10-local-migration.md) do SQL versionado em PostgreSQL 16 vazio e com sete tabelas legadas sintéticas. | Duas aplicações com `COMMIT`; 14 tabelas, 16 enums, `citext`, 45 índices e sete triggers; `test:unit` (23) passou. |
| 11 — Preparação do Neon | Concluído | Inventário pela conexão PostgreSQL: `neondb`, `public` sem tabelas, enums ou views; sem histórico Prisma; `plpgsql` presente e permissões de criação confirmadas. Não havia dados a preservar. | Destino e compatibilidade estrutural confirmados sem consultar registros. |
| 12 — Aplicação remota e documentação | Concluído | `prisma migrate deploy` aplicou `20260923000100_initial_schema` ao Neon. Leitura de volta confirmou 14 tabelas de domínio, 16 enums, 45 índices, sete triggers, `citext` e histórico Prisma concluído. [Dicionário](backend-schema-phase-2-data-dictionary.md) e [runbook](backend-schema-phase-2-runbook.md) consolidados. | `migrate status` atualizado; `test:unit` 23/23, lint e build passaram na aplicação. |

Os lotes 02 a 10 produziram código e evidência sem tocar no banco
compartilhado. O lote 11 exige acesso remoto de leitura; o 12, escrita remota.
Se o estado real do Neon divergir do legado previsto, revisar o procedimento de
troca antes do lote 12. Não executar `prisma db push` como atalho.

Para repetir os testes de integração locais, executar
`docker compose -f docker-compose.test-db.yml up -d --wait` e depois
`pnpm --filter @vers/backend test:db`. A preparação cria `citext` e aplica ao
banco sintético apenas o delta gerado entre ele e `schema.prisma`. Essa operação
não produz migration versionada e usa URL fixa em `127.0.0.1:55432/vers_test`.
O SQL complementar em `services/backend/prisma/manual-constraints/vehicles.sql`
e nos arquivos `installations.sql`, `tests.sql`, `telemetry.sql` e
`summaries-support.sql` do mesmo diretório já foi incorporado à primeira
migration no lote 9. A suíte local acima foi usada na modelagem; a migration
versionada foi aplicada separadamente em PostgreSQL temporário no lote 10.

## Decisões do domínio já incorporadas

- Um veículo pode pertencer a várias contas. `DELETE /vehicles/{id}` remove o
  vínculo da conta atual; só a remoção do último vínculo apaga veículo e placa.
  A transação protege a contagem de vínculos e a troca do principal.
- Testes e telemetria sobrevivem à remoção física; o histórico usa snapshot
  sem placa nem identificadores específicos. Peso do teste é informado ou
  medido no momento, e o local é informado pelo operador.
- O bruto MQTT ligado ao ESP32 é apagado antes da exclusão física do veículo;
  as amostras normalizadas persistem sem referências ao dispositivo removido.
- Email usa `citext`; `ADMIN` e `USER` são papéis associados e simultâneos.
  `TECHNICIAN`, login Google e `AuthIdentity` ficam fora deste MVP.
- Mensagem MQTT contém lote de amostras. Frequência e tamanho serão decididos
  com o ESP32; o schema preserva a cardinalidade 1:N.
- Não haverá limpeza periódica automática de sessões, payload MQTT,
  telemetria, auditoria ou backups no MVP.

## Saída da Fase 02

Schema Prisma revisado, migration legível e versionada, client gerado,
invariantes cobertas pelos testes já executados, inventário do Neon e
procedimento de aplicação documentado. A fase só será marcada como concluída após
aplicação remota autorizada e verificação, ou ficará explicitamente como
"pronta para aplicação" se a equipe optar por adiar o Neon.
