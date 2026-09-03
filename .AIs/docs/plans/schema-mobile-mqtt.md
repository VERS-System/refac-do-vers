<!-- Proposta de modelagem do schema para as features mobile e a ingestão MQTT. -->

# Schema v2 — Mobile e MQTT

## 1. Objetivo e status

Este documento define a proposta de variáveis, entidades e relacionamentos
necessários para sustentar as features conhecidas do aplicativo mobile e a
telemetria enviada pelo ESP32 via MQTT.

**Status:** proposta para revisão. Ainda não representa uma migration aplicada.
Após aprovação das decisões abertas, esta especificação deve orientar os testes
do acesso a dados, a alteração de `schema.prisma` e a primeira migration
versionada do core.

## 2. Regras de modelagem

- Prisma continua sendo a fonte de verdade do PostgreSQL/Neon.
- TypeScript usa `camelCase`; tabelas e colunas PostgreSQL usam `snake_case` por
  meio de `@map` e `@@map`.
- IDs internos usam UUID. IDs públicos e de dispositivos nunca dependem de uma
  sequência do banco.
- Datas são persistidas como `DateTime` em UTC.
- Telemetria usa `Double` para volume e velocidade de escrita; valores
  financeiros usam `Decimal`.
- Toda grandeza física inclui a unidade no nome do campo.
- Potência é derivada de tensão e corrente no backend. O valor informado pelo
  dispositivo pode ser preservado separadamente para diagnóstico.
- Dados agregados não são misturados com a entidade do teste.
- Payload bruto MQTT é preservado para auditoria, mas não substitui a telemetria
  validada.
- CPF e documento do veículo não devem ser armazenados em texto puro. Se a
  persistência for necessária, deve existir criptografia, mascaramento e
  política de retenção antes da implementação.

## 3. Visão dos relacionamentos

```text
User ──< UserVehicle >── Vehicle ──< VersInstallation >── Device
  │                           │              │               │
  ├──< AuthIdentity           │              ├── Configuration
  ├──< RefreshSession         │              └──< Test
  ├──< AiConversation         │                     ├──< TelemetrySample
  └──< SupportRequest         │                     └──< EnergySummary
                              └──────────────────────────< SupportRequest

Device ──< MqttMessage ──0..1── TelemetrySample
```

## 4. Identidade e autenticação mobile

### `User`

| Campo Prisma | Tipo | Obrigatório | Finalidade |
| --- | --- | --- | --- |
| `id` | `String @id @default(uuid())` | Sim | Identificador interno. |
| `email` | `String @unique` | Sim | Login normalizado em minúsculas. |
| `passwordHash` | `String?` | Condicional | Hash para login local; nulo em conta exclusivamente social. |
| `displayName` | `String?` | Não | Nome exibido no perfil. |
| `avatarUrl` | `String?` | Não | Avatar do usuário. |
| `status` | `UserStatus` | Sim | `ACTIVE`, `BLOCKED` ou `PENDING_VERIFICATION`. |
| `emailVerifiedAt` | `DateTime?` | Não | Confirmação do endereço. |
| `createdAt` | `DateTime @default(now())` | Sim | Auditoria. |
| `updatedAt` | `DateTime @updatedAt` | Sim | Auditoria. |

O perfil administrativo deve vir de papéis/permissões, não de um booleano
`isAdmin` isolado.

### `AuthIdentity`

Permite login local e Google sem duplicar usuários.

| Campo Prisma | Tipo | Obrigatório | Finalidade |
| --- | --- | --- | --- |
| `id` | `String @id @default(uuid())` | Sim | Identificador. |
| `userId` | `String` | Sim | Usuário proprietário. |
| `provider` | `AuthProvider` | Sim | `LOCAL` ou `GOOGLE`. |
| `providerSubject` | `String` | Sim | Identificador opaco no provedor. |
| `createdAt` | `DateTime @default(now())` | Sim | Auditoria. |

Restrição: `@@unique([provider, providerSubject])`.

### `RefreshSession`

| Campo Prisma | Tipo | Obrigatório | Finalidade |
| --- | --- | --- | --- |
| `id` | `String @id @default(uuid())` | Sim | Sessão autenticada. |
| `userId` | `String` | Sim | Usuário. |
| `tokenHash` | `String @unique` | Sim | Hash do refresh token; nunca o token puro. |
| `deviceLabel` | `String?` | Não | Identificação amigável do aparelho. |
| `expiresAt` | `DateTime` | Sim | Expiração. |
| `revokedAt` | `DateTime?` | Não | Revogação/rotação. |
| `createdAt` | `DateTime @default(now())` | Sim | Auditoria. |

Índice: `@@index([userId, expiresAt])`.

## 5. Veículo e instalação VERS

### `Vehicle`

| Campo Prisma | Tipo | Obrigatório | Finalidade |
| --- | --- | --- | --- |
| `id` | `String @id @default(uuid())` | Sim | Identificador. |
| `licensePlate` | `String @unique` | Sim | Placa normalizada, sem espaços ou hífen. |
| `brand` | `String?` | Não | Marca exibida no mobile. |
| `model` | `String?` | Não | Modelo exibido no mobile. |
| `modelYear` | `Int?` | Não | Ano do modelo, se disponível. |
| `createdAt` | `DateTime @default(now())` | Sim | Auditoria. |
| `updatedAt` | `DateTime @updatedAt` | Sim | Auditoria. |

### `UserVehicle`

Relaciona usuários e veículos sem presumir que um veículo só possa ter um
usuário associado.

| Campo Prisma | Tipo | Obrigatório | Finalidade |
| --- | --- | --- | --- |
| `userId` | `String` | Sim | Usuário. |
| `vehicleId` | `String` | Sim | Veículo. |
| `relationship` | `VehicleRelationship` | Sim | `OWNER`, `DRIVER` ou `ADMIN`. |
| `isPrimary` | `Boolean @default(false)` | Sim | Veículo principal no mobile. |
| `createdAt` | `DateTime @default(now())` | Sim | Auditoria. |

Chave: `@@id([userId, vehicleId])`.

### `VersInstallation`

Representa o sistema físico instalado no veículo e evita misturar o modelo do
produto com uma configuração específica de teste.

| Campo Prisma | Tipo | Obrigatório | Finalidade |
| --- | --- | --- | --- |
| `id` | `String @id @default(uuid())` | Sim | Instalação. |
| `vehicleId` | `String` | Sim | Veículo atendido. |
| `systemModel` | `String` | Sim | Modelo do sistema VERS exibido no mobile. |
| `serialNumber` | `String @unique` | Sim | Número de série. |
| `installedAt` | `DateTime?` | Não | Data da instalação. |
| `status` | `InstallationStatus` | Sim | `ACTIVE`, `MAINTENANCE`, `INACTIVE` ou `FAULT`. |
| `createdAt` | `DateTime @default(now())` | Sim | Auditoria. |
| `updatedAt` | `DateTime @updatedAt` | Sim | Auditoria. |

Índice: `@@index([vehicleId, status])`.

### `Device`

Identifica o ESP32 que publica no broker.

| Campo Prisma | Tipo | Obrigatório | Finalidade |
| --- | --- | --- | --- |
| `id` | `String @id @default(uuid())` | Sim | ID interno. |
| `installationId` | `String` | Sim | Instalação vinculada. |
| `deviceUid` | `String @unique` | Sim | Identidade pública usada no tópico MQTT. |
| `name` | `String?` | Não | Nome operacional. |
| `firmwareVersion` | `String?` | Não | Última versão informada. |
| `status` | `DeviceStatus` | Sim | `PROVISIONING`, `ONLINE`, `OFFLINE`, `REVOKED` ou `FAULT`. |
| `lastSeenAt` | `DateTime?` | Não | Última mensagem válida. |
| `createdAt` | `DateTime @default(now())` | Sim | Auditoria. |
| `updatedAt` | `DateTime @updatedAt` | Sim | Auditoria. |

Credenciais do broker não pertencem a esta tabela em texto puro.

### `Configuration`

A configuração existente passa a ser uma versão imutável da montagem usada no
teste.

| Campo Prisma | Tipo | Obrigatório | Finalidade |
| --- | --- | --- | --- |
| `id` | `String @id @default(uuid())` | Sim | Configuração. |
| `installationId` | `String` | Sim | Instalação. |
| `name` | `String` | Sim | Nome amigável. |
| `version` | `Int` | Sim | Versão crescente por instalação. |
| `activePiezoCount` | `Int` | Sim | Quantidade de piezos ativos. |
| `piezoAssociation` | `PiezoAssociation` | Sim | `SERIES`, `PARALLEL` ou `MIXED`. |
| `installationPoint` | `String` | Sim | Local mecânico documentado. |
| `storageType` | `StorageType` | Sim | `BATTERY`, `SUPERCAPACITOR`, `CAPACITOR` ou `NONE`. |
| `notes` | `String?` | Não | Observações da montagem. |
| `createdAt` | `DateTime @default(now())` | Sim | Auditoria. |

Restrições: `@@unique([installationId, version])` e
`@@index([installationId, createdAt])`.

## 6. Testes e dados exibidos no mobile

### `Test`

| Campo Prisma | Tipo | Obrigatório | Finalidade |
| --- | --- | --- | --- |
| `id` | `String @id @default(uuid())` | Sim | Teste experimental. |
| `vehicleId` | `String` | Sim | Veículo testado. |
| `installationId` | `String` | Sim | Sistema VERS usado. |
| `configurationId` | `String` | Sim | Configuração imutável usada. |
| `createdById` | `String` | Sim | Operador responsável. |
| `name` | `String` | Sim | Nome do teste. |
| `status` | `TestStatus` | Sim | `PLANNED`, `RUNNING`, `COMPLETED`, `FAILED` ou `CANCELLED`. |
| `terrain` | `TerrainType` | Sim | `HIGHWAY`, `CITY`, `OFFROAD`, `MIXED` ou `OTHER`. |
| `startedAt` | `DateTime?` | Não | Início real. |
| `endedAt` | `DateTime?` | Não | Fim real. |
| `vehicleWeightKg` | `Double?` | Não | Peso total durante o teste. |
| `averageEngineRpm` | `Double?` | Não | RPM médio. |
| `averageSpeedKph` | `Double?` | Não | Velocidade média. |
| `inclineDegrees` | `Double?` | Não | Inclinação de referência. |
| `outcome` | `TestOutcome?` | Não | `SATISFACTORY`, `UNSATISFACTORY` ou `INCONCLUSIVE`. |
| `notes` | `String?` | Não | Intercorrências. |
| `createdAt` | `DateTime @default(now())` | Sim | Auditoria. |
| `updatedAt` | `DateTime @updatedAt` | Sim | Auditoria. |

`duration`, potência, corrente, energia e bateria não ficam em `Test`: duração é
derivada dos instantes, medições ficam em `TelemetrySample` e agregados ficam em
`EnergySummary`.

### `EnergySummary`

Atende Home, tela de bateria, gráficos por hora, calendário e economia.

| Campo Prisma | Tipo | Obrigatório | Finalidade |
| --- | --- | --- | --- |
| `id` | `String @id @default(uuid())` | Sim | Resumo. |
| `installationId` | `String` | Sim | Instalação resumida. |
| `testId` | `String?` | Não | Presente quando o resumo pertence a um teste. |
| `periodType` | `SummaryPeriod` | Sim | `TEST`, `HOUR`, `DAY` ou `MONTH`. |
| `periodStart` | `DateTime` | Sim | Início inclusivo em UTC. |
| `periodEnd` | `DateTime` | Sim | Fim exclusivo em UTC. |
| `recoveredEnergyWh` | `Double` | Sim | Energia recuperada no período. |
| `vehicleEnergyUsedWh` | `Double?` | Não | Energia consumida, somente se houver fonte confiável. |
| `averagePowerW` | `Double?` | Não | Potência média válida. |
| `peakPowerW` | `Double?` | Não | Pico de potência válido. |
| `moneySaved` | `Decimal? @db.Decimal(12, 4)` | Não | Economia estimada. |
| `currencyCode` | `String? @db.VarChar(3)` | Não | Ex.: `BRL`. |
| `energyTariffPerKwh` | `Decimal? @db.Decimal(12, 6)` | Não | Premissa usada no cálculo. |
| `sampleCount` | `Int` | Sim | Quantidade de amostras válidas. |
| `quality` | `SummaryQuality` | Sim | `GOOD`, `PARTIAL` ou `INVALID`. |
| `calculatedAt` | `DateTime @default(now())` | Sim | Versão temporal do cálculo. |

Restrição: `@@unique([installationId, testId, periodType, periodStart])`.
Índice: `@@index([installationId, periodType, periodStart])`.

O gráfico por hora deve consultar linhas `HOUR`, não um objeto JSON
`energyPerHour`. Isso permite filtragem, recomputação e índices adequados.

### `SupportRequest`

| Campo Prisma | Tipo | Obrigatório | Finalidade |
| --- | --- | --- | --- |
| `id` | `String @id @default(uuid())` | Sim | Solicitação de revisão. |
| `userId` | `String` | Sim | Solicitante. |
| `vehicleId` | `String` | Sim | Veículo. |
| `installationId` | `String?` | Não | Sistema relacionado. |
| `reason` | `String` | Sim | Motivo informado. |
| `status` | `SupportStatus` | Sim | `OPEN`, `IN_REVIEW`, `SCHEDULED`, `RESOLVED` ou `CANCELLED`. |
| `createdAt` | `DateTime @default(now())` | Sim | Abertura. |
| `updatedAt` | `DateTime @updatedAt` | Sim | Atualização. |

## 7. Ingestão MQTT

### Tópicos propostos

```text
vers/v1/devices/{deviceUid}/telemetry
vers/v1/devices/{deviceUid}/status
vers/v1/devices/{deviceUid}/events
```

- `telemetry`: amostras periódicas; QoS 0 ou 1 conforme o lote e a capacidade do
  protótipo.
- `status`: conexão, firmware e saúde; QoS 1 e mensagem retida quando adequado.
- `events`: início/fim de teste e falhas importantes; QoS 1.

O `deviceUid` do tópico deve coincidir com o payload e com um dispositivo ativo.

### Payload de telemetria v1

```json
{
  "schemaVersion": 1,
  "messageId": "uuid",
  "deviceId": "vers-esp32-001",
  "sequence": 1042,
  "capturedAt": "2026-08-13T15:30:10.125Z",
  "testId": "uuid-ou-null",
  "samplePeriodMs": 100,
  "measurements": {
    "voltageV": 3.72,
    "currentA": 0.018,
    "devicePowerW": 0.06696,
    "accumulatedEnergyWh": 0.0142,
    "accelerationXMs2": 0.12,
    "accelerationYMs2": 0.31,
    "accelerationZMs2": 9.74,
    "vibrationRmsMs2": 0.28,
    "temperatureC": 31.4,
    "activePiezoCount": 8
  },
  "sensors": {
    "ina219": "OK",
    "mpu6050": "OK"
  }
}
```

Campos de medição indisponíveis devem ser omitidos ou enviados como `null`,
nunca como zero artificial. O backend valida faixas e calcula `powerW` a partir
de `voltageV × currentA`.

### `MqttMessage`

Preserva o envelope recebido e o resultado do processamento.

| Campo Prisma | Tipo | Obrigatório | Finalidade |
| --- | --- | --- | --- |
| `id` | `String @id @default(uuid())` | Sim | Registro interno. |
| `messageId` | `String @unique` | Sim | Idempotência fornecida pelo ESP32. |
| `deviceId` | `String` | Sim | Dispositivo validado. |
| `testId` | `String?` | Não | Teste declarado/resolvido. |
| `schemaVersion` | `Int` | Sim | Versão do contrato. |
| `topic` | `String` | Sim | Tópico recebido. |
| `sequence` | `BigInt` | Sim | Ordenação por dispositivo. |
| `qos` | `Int` | Sim | QoS recebido. |
| `retained` | `Boolean` | Sim | Flag MQTT. |
| `payload` | `Json` | Sim | Conteúdo bruto. |
| `capturedAt` | `DateTime` | Sim | Instante no ESP32. |
| `receivedAt` | `DateTime @default(now())` | Sim | Instante no gateway. |
| `status` | `MqttProcessingStatus` | Sim | `RECEIVED`, `PROCESSED`, `REJECTED` ou `DUPLICATE`. |
| `rejectionCode` | `String?` | Não | Motivo estruturado da rejeição. |
| `processedAt` | `DateTime?` | Não | Final do processamento. |

Restrições e índices:

- `@@unique([deviceId, sequence])`;
- `@@index([deviceId, capturedAt])`;
- `@@index([status, receivedAt])`.

### `TelemetrySample`

É a leitura validada usada por consultas e indicadores.

| Campo Prisma | Tipo | Obrigatório | Finalidade |
| --- | --- | --- | --- |
| `id` | `String @id @default(uuid())` | Sim | Amostra. |
| `mqttMessageId` | `String @unique` | Sim | Rastreabilidade 1:1 com a mensagem v1. |
| `deviceId` | `String` | Sim | Dispositivo de origem. |
| `testId` | `String?` | Não | Teste ativo; pode ser nulo em calibração/idle. |
| `capturedAt` | `DateTime` | Sim | Momento da amostra. |
| `samplePeriodMs` | `Int?` | Não | Intervalo declarado. |
| `voltageV` | `Double?` | Não | Tensão condicionada. |
| `currentA` | `Double?` | Não | Corrente medida. |
| `powerW` | `Double?` | Não | Potência calculada no backend. |
| `devicePowerW` | `Double?` | Não | Potência informada pelo ESP32 para comparação. |
| `accumulatedEnergyWh` | `Double?` | Não | Contador acumulado do dispositivo. |
| `accelerationXMs2` | `Double?` | Não | Aceleração X em m/s². |
| `accelerationYMs2` | `Double?` | Não | Aceleração Y em m/s². |
| `accelerationZMs2` | `Double?` | Não | Aceleração Z em m/s². |
| `vibrationRmsMs2` | `Double?` | Não | RMS de vibração na janela. |
| `temperatureC` | `Double?` | Não | Temperatura do sensor/ponto definido. |
| `activePiezoCount` | `Int?` | Não | Estado reportado pela montagem. |
| `quality` | `TelemetryQuality` | Sim | `VALID`, `PARTIAL`, `SUSPECT` ou `INVALID`. |
| `sensorStatus` | `Json?` | Não | Estado estruturado dos sensores. |
| `createdAt` | `DateTime @default(now())` | Sim | Persistência. |

Índices:

- `@@index([testId, capturedAt])`;
- `@@index([deviceId, capturedAt])`.

Dados inválidos permanecem no payload bruto, mas não entram silenciosamente nas
agregações. A política de retenção/particionamento será definida com dados reais
de frequência e duração dos testes.

## 8. Mapeamento feature → fonte de dados

| Feature mobile | Fonte principal | Campos/resultado |
| --- | --- | --- |
| Cadastro/login | `User`, `AuthIdentity`, `RefreshSession` | email, senha hash, provedor, sessão |
| Perfil/admin | `User` + papéis | nome, avatar, permissões |
| Informações do carro | `Vehicle`, `UserVehicle` | placa, marca, modelo, vínculo |
| Cadastro de carro | fluxo de verificação + `Vehicle` | documento/CPF transitórios, placa persistida |
| Informações VERS | `VersInstallation`, `Configuration`, `Device` | modelo, status, piezos, firmware |
| Battery usage | `EnergySummary` | energia usada somente se fonte confiável |
| Battery recovered | `EnergySummary` | `recoveredEnergyWh` por período |
| Today/gráfico horário | `EnergySummary(HOUR)` | série ordenada por `periodStart` |
| Calendário | `EnergySummary(DAY)` | dias com dados e energia recuperada |
| Money economy | `EnergySummary` | energia, tarifa, moeda e valor calculado |
| Revisão do sistema | `SupportRequest` | motivo, status e instalação |
| Telemetria atual | `TelemetrySample` | última leitura válida por instalação |

Chat/Viber exigirá `AiConversation` e `AiMessage`, mas seus campos detalhados
serão fechados com o contrato do ai-service na Fase 8. Até lá, o modelo legado
`AiInteraction` não deve orientar a migration definitiva.

## 9. Campos legados a substituir

| Campo/modelo atual | Tratamento proposto |
| --- | --- |
| `Test.satisfatory` | substituir por `Test.outcome` enum e corrigir a grafia |
| `Test.watts` | remover; derivar/agregar de telemetria |
| `Test.amp` e `Test.current` | remover ambos do teste; usar `TelemetrySample.currentA` |
| `Test.batteryUsed` | mover para `EnergySummary.vehicleEnergyUsedWh` |
| `Test.batteryGenerated` | mover para `EnergySummary.recoveredEnergyWh` |
| `Test.numPiezos` | usar snapshot `Configuration.activePiezoCount` |
| `Test.duration` | derivar de `startedAt` e `endedAt` |
| strings de status/terreno | substituir por enums Prisma |
| `Telemetry.energyAccumulated` | renomear com unidade para `accumulatedEnergyWh` |
| `EnergySummary.energyPerHour` JSON | substituir por linhas com período `HOUR` |
| `MqttMessage.processed` boolean | substituir por status de processamento |

## 10. Decisões abertas antes da migration

1. O valor “Battery Used” vem de qual sensor ou integração? Sem uma fonte
   confiável, ele deve permanecer ausente em vez de estimado.
2. O campo “documento do carro” representa CRLV, RENAVAM ou upload de arquivo?
3. O CPF será apenas enviado a um serviço de verificação ou precisa ser
   persistido? A recomendação é não persistir sem necessidade jurídica clara.
4. Uma instalação pode possuir mais de um ESP32 ativo simultaneamente?
5. A energia acumulada enviada pelo ESP32 reinicia ao ligar, ao iniciar um teste
   ou nunca? Essa regra altera o cálculo de deltas.
6. Qual frequência de amostragem e tamanho de lote serão usados no protótipo?
7. `temperatureC` mede o circuito, o ambiente ou outro ponto físico?
8. A contagem de piezos ativos é configurada pelo operador ou detectada pelo
   hardware?
9. O dashboard precisa persistir toda vibração bruta ou apenas RMS/janelas?

## 11. Próximo passo técnico

Após responder às decisões que afetam cardinalidade e significado dos dados:

1. escrever testes unitários para normalização, validação e idempotência;
2. atualizar `schema.prisma` com enums, models e índices aprovados;
3. gerar e revisar a migration sem aplicá-la automaticamente ao Neon;
4. definir DTOs em `packages/shared-types` para REST e MQTT;
5. executar `test:unit`, validação Prisma, lint e build.
