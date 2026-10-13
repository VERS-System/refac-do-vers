<!-- Dicionário do schema inicial versionado do backend VERS. -->

# Dicionário de dados — schema inicial VERS

Fonte de verdade: `services/backend/prisma/schema.prisma` e migration
`20260923000100_initial_schema/migration.sql`. Os nomes Prisma usam camelCase;
as tabelas e colunas PostgreSQL usam snake_case. Este documento descreve o
schema entregue na Fase 02, não contratos de API nem regras já implementadas
em services. Datas são armazenadas como `timestamp(3)` pelo Prisma; os serviços
devem tratar instantes em UTC. IDs são UUID. `?` indica coluna opcional.

## Identidade e veículos

| Tabela | Chave e campos de negócio | Relações e restrições principais |
| --- | --- | --- |
| `users` | `id`; `email` citext; `password_hash`; `display_name?`, `avatar_url?`, `status`, `email_verified_at?` | Email único sem distinção de caixa. Status: `ACTIVE`, `BLOCKED`, `PENDING_VERIFICATION`. `created_at`, `updated_at`. |
| `user_role_assignments` | PK (`user_id`, `role`); `created_at` | FK para `users` com cascade. Papéis `USER` e `ADMIN` podem coexistir. |
| `refresh_sessions` | `id`; `user_id`; `token_hash`; `device_label?`, `expires_at`, `revoked_at?`, `replaced_by_session_id?` | Hash único; substituição autorreferente. Exclusão do usuário remove sessões. `created_at`, `updated_at`. Não armazena access token. |
| `vehicles` | `id`; `license_plate` citext; `brand?`, `model?`, `model_year?` | Placa única e imutável por trigger. `created_at`, `updated_at`. |
| `user_vehicles` | PK (`user_id`, `vehicle_id`); `relationship`, `is_primary` | Vínculos `OWNER`, `DRIVER`, `ADMIN`. FKs restritivas. Índice único parcial permite no máximo um principal por usuário. `created_at`, `updated_at`. |

## Montagem e ensaios

| Tabela | Chave e campos de negócio | Relações e restrições principais |
| --- | --- | --- |
| `vers_installations` | `id`; `vehicle_id`, `system_model`, `serial_number?`, `status`, `installed_at?` | Serial único; FK para veículo. Estados `ACTIVE`, `MAINTENANCE`, `INACTIVE`, `FAULT`. `created_at`, `updated_at`. |
| `devices` | `id`; `installation_id`, `vehicle_id`, `device_uid`, `name?`, `firmware_version?`, `status`, `last_seen_at?`, `revoked_at?` | UID único; FK composta exige instalação do mesmo veículo. Índice parcial admite um dispositivo não revogado por veículo, inclusive `OFFLINE` e `FAULT`. `created_at`, `updated_at`. |
| `configurations` | `id`; `installation_id`, `name`, `version`, `active_piezo_count`, `piezo_association`, `installation_point`, `storage_type`, `notes?` | (`installation_id`, `version`) único; trigger impede alteração do snapshot. `created_at`. Associação: `SERIES`, `PARALLEL`, `MIXED`; armazenamento: `BATTERY`, `SUPERCAPACITOR`, `CAPACITOR`, `NONE`. |
| `tests` | `id`; `vehicle_id?`, `installation_id?`, `configuration_id?`, `created_by_id?`, `name`, `status`, `terrain`, `started_at?`, `ended_at?`, `outcome?`, `notes?` | FKs opcionais tornam-se nulas quando recursos são excluídos. Trigger diferida confere compatibilidade enquanto presentes. `created_at`, `updated_at`. |

`tests` guarda ainda `snapshot_vehicle_model?`, `snapshot_test_location`,
`snapshot_active_piezo_count` e `snapshot_configuration_version`: são o
contexto histórico sem placa. Condições opcionais são `vehicle_weight_kg`,
`average_engine_rpm`, `average_speed_kph` e `incline_degrees`. Estados:
`PLANNED`, `RUNNING`, `COMPLETED`, `FAILED`, `CANCELLED`; terreno: `HIGHWAY`,
`CITY`, `OFFROAD`, `MIXED`, `OTHER`; resultado: `SATISFACTORY`,
`UNSATISFACTORY`, `INCONCLUSIVE`. Transições e autorização cabem ao service.

## Aquisição e indicadores

| Tabela | Chave e campos de negócio | Relações e restrições principais |
| --- | --- | --- |
| `mqtt_messages` | `id`; `message_id`, `device_id?`, `test_id?`, `schema_version`, `topic`, `payload` JSON, `sequence` bigint, `qos`, `retained`, `captured_at`, `received_at`, `processed_at?`, `status`, `rejection_reason?` | `message_id` e (`device_id`, `sequence`) únicos. FK de dispositivo restritiva: bruto deve ser apagado antes da exclusão física do veículo. `created_at`, `updated_at`. Status: `RECEIVED`, `PROCESSED`, `REJECTED`. |
| `telemetry_samples` | `id`; `message_id?`, `sample_index`, `test_id?`, `device_id?`, `installation_id?`, `captured_at`, `quality` | Uma mensagem pode ter várias amostras; (`message_id`, `sample_index`) único. FKs ficam nulas na exclusão das origens. `created_at`. Qualidade: `VALID`, `PARTIAL`, `SUSPECT`, `INVALID`. |
| `energy_summaries` | `id`; `installation_id?`, `test_id?`, `period_type`, `period_start`, `period_end`, `recovered_energy_wh`, `vehicle_energy_used_wh?`, `average_power_w?`, `peak_power_w?`, `money_saved?`, `currency_code?`, `energy_tariff_per_kwh?`, `sample_count`, `quality`, `calculation_version`, `calculated_at` | Índices parciais impedem duplicidade de período com vínculo presente. Dinheiro é decimal (18,6), tarifa decimal (18,8). FKs opcionais. `created_at`. |

`telemetry_samples` possui medidas opcionais `voltage_v`, `current_a`,
`power_w`, `device_power_w`, `accumulated_energy_wh`, `acceleration_x_ms2`,
`acceleration_y_ms2`, `acceleration_z_ms2`, `vibration_rms_ms2`,
`temperature_c` e `active_piezo_count`. A ausência de sensor é `NULL`, não
zero. Potência e energia enviadas pelo dispositivo não substituem os cálculos
oficiais do backend. Em `energy_summaries`, períodos são `TEST`, `HOUR`, `DAY`,
`MONTH` e qualidade `GOOD`, `PARTIAL`, `INVALID`. Economia e consumo do veículo
permanecem nulos sem fonte e premissas aprovadas.

## Suporte e auditoria

### Unicidade dos resumos — conferência F06 em 13/10/2026

Os índices únicos parciais da migration incluem calculation_version. Para teste,
a chave é (test_id, period_type, period_start, calculation_version) quando test_id
está presente. Para instalação sem teste, a chave usa installation_id no lugar
de test_id, exigindo installation_id presente e test_id nulo. Ambos IDs nulos
ficam fora desses índices; não garantem recomputação desse histórico.
@@index no Prisma não substitui as constraints SQL complementares. Detalhes e
limites de concorrência no plano F06; nenhuma migration foi criada nesta conferência.

| Tabela | Chave e campos de negócio | Relações e restrições principais |
| --- | --- | --- |
| `support_requests` | `id`; `requester_id?`, `vehicle_id?`, `installation_id?`, `reason` limitado a 1000 caracteres, `status` | FKs tornam-se nulas na exclusão; `created_at`, `updated_at`. Estados `OPEN`, `IN_REVIEW`, `SCHEDULED`, `RESOLVED`, `CANCELLED`. Conteúdo de `reason` requer validação no service. |
| `audit_events` | `id`; `actor_id?`, `action`, `resource_type`, `resource_id?`, `result`, `request_id?`, `created_at` | `SUCCESS` ou `FAILURE`. Sem coluna de payload ou metadados livres; triggers limpam referências a recursos físicos excluídos. |

## Limites e preservação

- São 14 tabelas de domínio e 16 enums; `_prisma_migrations` é controle do
  Prisma. A migration inclui `citext`, índices parciais, checks e triggers que
  não são representados integralmente no `schema.prisma`.
- Desvincular uma conta não remove veículo compartilhado. Na remoção do último
  vínculo, o service deve apagar mensagens brutas do dispositivo antes do
  veículo, preservar `tests`, `telemetry_samples` e `energy_summaries`, e conferir
  que identificadores não permaneceram em texto livre.
- O banco garante unicidade, FKs e constraints documentadas; transições de
  estados, acesso por usuário, validação do payload, cálculos e transações de
  desvinculação serão implementados nas fases seguintes.
- Não há limpeza automática periódica no MVP. `AuthIdentity`, modelos de IA e
  documentos pessoais não integram esta migration.
