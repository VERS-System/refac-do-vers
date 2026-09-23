<!-- Plano executável, em pequenos lotes, para implementar o banco da Fase 02 do VERS. -->

# Fase 02 do backend — plano completo do banco

## Objetivo e estado

Substituir o schema experimental por um modelo Prisma/PostgreSQL que sustente
os contratos REST aprovados, com primeira migration versionada e validação
antes de qualquer aplicação ao Neon. Este documento detalha **apenas a Fase
02** do [roadmap do backend](backend-roadmap/README.md); controllers, regras de
API e ingestão funcional pertencem às fases seguintes.

**Estado em 22/09/2026:** lotes 1 a 7 concluídos. `schema.prisma` ainda mantém
modelos legados de resumos e IA; já contém identidade, veículos, instalações,
testes, MQTT e telemetria remodelados. Ainda não há migration
versionada nem alteração no Neon. O [plano técnico](backend-schema-phase-2.md)
e o [baseline](backend-schema-phase-2-lot1-baseline.md) são fontes de detalhe.

## Regras para todos os lotes

- Um lote por vez, com diff pequeno e revisão do programador antes do próximo.
  A IA não cria commits; a tabela abaixo sugere um commit por lote.
- Antes de editar código, escrever testes que expressem comportamento ou
  invariantes observáveis; confirmar a falha inicial e então implementar.
  Não usar testes que apenas procuram texto no `schema.prisma`.
- Ao final de cada lote de código, executar `test:unit` do backend. Rodar
  `prisma validate`, geração do client, lint e build quando o lote afetar o
  schema; usar testes de integração em PostgreSQL isolado para constraints.
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
| 08 — Resumos, suporte e auditoria | Planejado | `EnergySummary` por períodos, valores monetários `Decimal`, `SupportRequest` e `AuditEvent` mínimo. Campos sem fonte confiável ficam nulos. | Precisão decimal, resumos sem duplicidade, nenhuma placa/token/payload completo na auditoria. |
| 09 — SQL da primeira migration | Planejado | Gerar migration versionada, revisar `citext`, índices parciais, FKs, locks e remoção do legado. Verificar consumidores dos models de IA legados antes de retirá-los. **Gerar SQL sem aplicá-lo ao Neon.** | Revisão do SQL e `prisma validate`/client; nenhum comando remoto. |
| 10 — Ensaio isolado | Planejado | Aplicar a migration em PostgreSQL descartável vazio e em cópia sintética representativa do legado; testar constraints, consultas e rollback operacional. | Testes de integração, `test:unit`, lint e build; resultados e limitações registrados. |
| 11 — Preparação do Neon | Planejado | Inventariar estrutura/índices/volumes do Neon em acesso autorizado, combinar janela sem gravações, preparar backup e ensaiar restauração. Ajustar SQL se houver divergências. | Checklist de contagens, backup restaurável e plano de retorno revisado. Nenhuma aplicação ainda. |
| 12 — Aplicação remota e documentação | Planejado, separada | Após autorização específica, aplicar a primeira migration no Neon compartilhado, verificar contagens/constraints/client e registrar a versão. Atualizar dicionário de dados, runbook e contexto. | Leitura de volta do estado aplicado, smoke test, `test:unit`, lint e build. |

Os lotes 02 a 10 produzem código e evidência revisáveis sem tocar no banco
compartilhado. O lote 11 exige acesso remoto de leitura; o 12, escrita remota.
Se o estado real do Neon divergir do legado previsto, revisar o procedimento de
troca antes do lote 12. Não executar `prisma db push` como atalho.

Para repetir os testes de integração locais, executar
`docker compose -f docker-compose.test-db.yml up -d --wait` e depois
`pnpm --filter @vers/backend test:db`. A preparação cria `citext` e aplica ao
banco sintético apenas o delta gerado entre ele e `schema.prisma`. Essa operação
não produz migration versionada e usa URL fixa em `127.0.0.1:55432/vers_test`.
O SQL complementar em `services/backend/prisma/manual-constraints/vehicles.sql`
e nos arquivos `installations.sql`, `tests.sql` e `telemetry.sql` do mesmo diretório é aplicado
somente nesse ensaio local e deve ser incorporado e revisado na
primeira migration do lote 9.

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
invariantes cobertas por testes significativos, validação em banco isolado e
procedimento do Neon documentado. A fase só será marcada como concluída após
aplicação remota autorizada e verificação, ou ficará explicitamente como
"pronta para aplicação" se a equipe optar por adiar o Neon.
