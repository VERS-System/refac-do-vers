<!-- Plano de alta segurança para evoluir o schema e criar a primeira migration versionada do VERS. -->

# Fase 2 — Schema Prisma e primeira migration versionada

## 1. Objetivo e estado

Planejar a substituição controlada do schema experimental por um modelo
relacional capaz de sustentar os contratos aprovados e as fases posteriores do
backend. Prisma continuará como fonte de verdade do PostgreSQL/Neon.

**Estado:** plano para revisão. Nenhuma alteração em `schema.prisma`, migration
ou banco está autorizada por este documento. Cada lote abaixo exige aprovação
separada do programador.

## 2. Risco principal da fase

O schema atual foi aplicado historicamente com `prisma db push`, não possui
diretório de migrations e pode existir no Neon com estrutura ou dados que não
podem ser inferidos pelo repositório. Portanto:

- não aplicar migration ao Neon antes de inventariar estrutura e dados;
- não tratar uma migration gerada a partir do vazio como segura para produção;
- não apagar ou renomear colunas sem estratégia de preservação verificável;
- não usar `prisma db push` como fluxo oficial;
- não acessar `.env`; qualquer inspeção do banco exige ambiente e autorização
  específicos, sem exposição da URL ou de outros segredos;
- preparar backup, validação e rollback antes de qualquer aplicação remota.

## 3. Escopo

- identidade, papéis e sessões revogáveis;
- veículos e vínculos entre usuários e veículos;
- instalações VERS, dispositivos e configurações versionadas;
- ciclo de vida dos testes experimentais;
- origem MQTT e telemetria normalizada;
- resumos de energia;
- solicitações de suporte e auditoria mínima;
- enums, chaves, índices, unicidade, precisão e regras de exclusão;
- estratégia de reconciliação do schema existente com a primeira migration.

## 4. Fora do escopo

- implementação de controllers, services ou autenticação NestJS;
- aplicação da migration ao Neon nesta etapa de planejamento;
- integração funcional com MQTT, ESP32, WebSocket ou IA;
- CPF, CRLV, RENAVAM ou arquivos de documentos;
- consulta ao DETRAN;
- conteúdo definitivo de conversas do Viber;
- cálculo de eficiência sem referência mecânica mensurável.

## 5. Princípios obrigatórios

1. IDs internos usam UUID e não expõem sequências do banco.
2. Prisma usa `camelCase`; PostgreSQL usa `snake_case` com `@map` e `@@map`.
3. Datas são UTC e toda tabela mutável possui `createdAt` e `updatedAt`.
4. Grandezas físicas incluem unidade no nome.
5. Dinheiro e tarifa usam `Decimal`; telemetria de alto volume usa `Double`.
6. Senhas, tokens e credenciais nunca são persistidos em texto puro.
7. Access tokens não são persistidos; somente hash de refresh session é salvo.
8. Payload MQTT bruto é imutável e separado da telemetria validada.
9. Dados inválidos não entram em agregações silenciosamente.
10. Exclusões preservam histórico experimental e auditabilidade.
11. Índices devem corresponder a consultas reais, não ser adicionados por
    suposição.
12. Fixtures e testes usam exclusivamente dados sintéticos.

## 6. Modelo relacional proposto

```text
User ──< UserRoleAssignment >── Role
  │
  ├──< RefreshSession
  ├──< AuthIdentity
  ├──< UserVehicle >── Vehicle ──< VersInstallation ──< Device
  │                           │              │
  │                           │              └──< Configuration
  │                           └──< Test >──── Configuration
  │                                  │
  │                                  ├──< TelemetrySample >── MqttMessage
  │                                  └──< EnergySummary
  ├──< SupportRequest
  └──< AuditEvent
```

O desenho final deverá impedir que um teste associe veículo, instalação e
configuração incompatíveis. Onde uma FK simples não expressar essa invariável,
o service deverá usar transação e o banco deverá receber constraint ou trigger
revisada quando justificável.

## 7. Identidade e autenticação

### `User`

Campos mínimos: `id`, `email`, `passwordHash`, `displayName`, `avatarUrl`,
`status`, `emailVerifiedAt`, `createdAt`, `updatedAt` e, se aprovado,
`deletedAt`.

Regras:

- email normalizado antes da persistência e único sem distinção de caixa;
- `passwordHash` nunca aparece em DTOs, logs ou auditoria;
- exclusão de conta não pode apagar silenciosamente testes ou auditoria;
- status usa enum, não texto livre.

### Papéis

Papéis globais são `USER`, `ADMIN` e `TECHNICIAN`. A proposta preferencial é
`Role` + `UserRoleAssignment`, pois o contrato permite múltiplos papéis. Isso
evita array sem integridade relacional e permite auditoria de concessão.

`OWNER`, `DRIVER` e `ADMIN` em `UserVehicle` são relações com um veículo e não
papéis globais.

### `RefreshSession`

Campos mínimos: `id`, `userId`, `tokenHash`, `deviceLabel`, `expiresAt`,
`revokedAt`, `replacedBySessionId`, `createdAt` e `updatedAt`.

Regras:

- hash único; token bruto existe somente no cookie `HttpOnly`;
- rotação forma uma cadeia auditável sem registrar o token;
- revogação e expiração possuem índices para limpeza;
- sessões do usuário podem ser revogadas em lote;
- access token não cria linha no banco.

### `AuthIdentity`

Reservada para provedores `LOCAL` e futuramente `GOOGLE`, com unicidade em
`[provider, providerSubject]`. Login Google permanece fora do MVP e a tabela só
deve entrar na migration se houver uso imediato ou justificativa de
compatibilidade futura aprovada.

## 8. Veículos e vínculo com usuários

### `Vehicle`

Campos mínimos: `id`, `licensePlate`, `brand`, `model`, `modelYear`,
`createdAt` e `updatedAt`.

Regras:

- placa normalizada, única e imutável após criação;
- não armazenar CPF, CRLV, RENAVAM ou documento;
- não colocar `userId` diretamente em `Vehicle`;
- histórico impede exclusão física ingênua quando houver instalações ou testes.

### `UserVehicle`

Campos mínimos: `userId`, `vehicleId`, `relationship`, `isPrimary`, `createdAt`
e, se exclusão lógica for aprovada, `unlinkedAt`.

Invariantes:

- chave composta `[userId, vehicleId]`;
- primeiro vínculo da conta recebe `isPrimary = true`;
- no máximo um vínculo ativo principal por usuário;
- troca do principal ocorre em transação;
- último veículo ativo da conta não pode ser removido;
- remoção do principal promove o único restante ou exige substituto escolhido;
- substituto pertence ao mesmo usuário e não está removido.

PostgreSQL pode garantir “um principal ativo por usuário” com índice único
parcial, por exemplo sobre `user_id WHERE is_primary = true AND unlinked_at IS
NULL`. Como Prisma não representa todo índice parcial no schema, a migration
SQL deverá ser revisada manualmente e conter um teste de concorrência.

## 9. Instalações, dispositivos e configurações

### `VersInstallation`

Vincula o sistema físico ao veículo e contém modelo, número de série, status e
datas de instalação. A remoção do vínculo do usuário não apaga a instalação ou
seu histórico.

### `Device`

Identifica o ESP32 por `deviceUid` único. Credenciais MQTT não ficam em texto
puro nessa tabela. Revogação não apaga mensagens históricas.

### `Configuration`

É um snapshot imutável da montagem. Usa versão crescente por instalação e
unicidade `[installationId, version]`. Testes apontam para a configuração usada
e alterações posteriores criam nova versão.

## 10. Testes experimentais

`Test` contém contexto, estado e referências; não contém medições nem agregados.

Campos principais: `vehicleId`, `installationId`, `configurationId`,
`createdById`, `name`, `status`, `terrain`, `startedAt`, `endedAt`,
`vehicleWeightKg`, `averageEngineRpm`, `averageSpeedKph`, `inclineDegrees`,
`outcome`, `notes`, `createdAt` e `updatedAt`.

Regras:

- estados e transições usam enum e lógica transacional;
- duração deriva de `startedAt` e `endedAt`;
- veículo, instalação e configuração devem ser compatíveis;
- exclusões de usuário, veículo ou instalação não apagam o teste;
- texto livre possui limite e não deve receber documentos ou segredos.

## 11. MQTT e telemetria

### `MqttMessage`

Preserva o payload bruto, identidade da mensagem, dispositivo, teste, versão do
schema, tópico, sequência, QoS, retained, timestamps, status de processamento e
motivo de rejeição.

Restrições mínimas:

- `messageId` único;
- `[deviceId, sequence]` único;
- índices `[deviceId, capturedAt]` e `[status, receivedAt]`;
- payload imutável após recepção;
- rejeição mantém rastreabilidade sem produzir telemetria válida.

### `TelemetrySample`

Armazena somente dados normalizados e classificados. Usa nomes com unidades e
referência única à mensagem de origem quando o envelope representar uma única
amostra.

Índices mínimos propostos: `[testId, capturedAt]` e
`[deviceId, capturedAt]`. Particionamento, retenção e eventual relação 1:N entre
mensagem e amostras dependem da frequência e do tamanho real dos lotes.

## 12. Resumos, suporte e auditoria

### `EnergySummary`

Usa períodos em linhas, não JSON por hora. Unicidade e índices devem considerar
instalação, teste opcional, tipo e início do período. Fórmulas recebem versão de
cálculo para permitir recomputação auditável.

`vehicleEnergyUsedWh` e economia permanecem nulos sem fonte e premissas
confiáveis. Valores financeiros usam `Decimal` com moeda e tarifa registradas.

### `SupportRequest`

Vincula solicitante, veículo e instalação opcional. O motivo é texto livre
limitado e não deve ser usado para coletar documentos pessoais.

### `AuditEvent`

Registra ator, ação, tipo e ID do recurso, resultado, request ID e timestamps.
Não registra senha, token, cookie, payload MQTT completo, documento ou cópia do
objeto alterado. Metadados seguem allowlist.

## 13. Exclusões e retenção

Estratégia inicial proposta:

| Dado | Exclusão proposta | Observação |
| --- | --- | --- |
| Sessão expirada/revogada | física após janela operacional | preservar somente auditoria mínima |
| Vínculo usuário–veículo | lógica ou remoção controlada | nunca quebrar testes/instalações |
| Veículo com histórico | `Restrict` ou arquivamento | não apagar telemetria por cascata |
| Configuração usada | `Restrict` | snapshot experimental imutável |
| Teste e telemetria | retenção a definir | preservar integridade científica |
| MQTT bruto | retenção a definir | volume e finalidade ainda desconhecidos |
| Auditoria | retenção a definir | minimizar metadados e acesso |

Nenhuma política representa conformidade jurídica definitiva. Finalidade, base
legal, retenção e atendimento a direitos dependem do responsável pelo projeto e,
quando necessário, de avaliação jurídica.

## 14. Estratégia da primeira migration

### Etapa A — Baseline sem mutação

1. confirmar se o Neon contém dados que precisam ser preservados;
2. obter inventário autorizado de tabelas, colunas, constraints, índices e
   volumes sem expor registros pessoais;
3. comparar banco, schema Prisma atual e modelo proposto;
4. registrar divergências e classificar cada mudança como aditiva, backfill,
   rename, conversão, constraint ou remoção;
5. criar plano de backup e restauração testada.

### Etapa B — Migration expand

- criar tabelas e colunas novas sem remover as antigas;
- criar enums e índices que não bloqueiem desnecessariamente;
- popular somente dados que tenham mapeamento inequívoco;
- manter código compatível durante a transição quando necessário.

### Etapa C — Validação e cutover

- validar contagens, FKs, duplicidades, nulos e amostras sintéticas;
- aplicar constraints depois do backfill;
- trocar leituras/escritas de forma observável;
- manter rollback operacional antes de remover estruturas antigas.

### Etapa D — Contract posterior

Remoções e renames destrutivos pertencem a uma migration posterior, após
confirmação de que nenhum consumidor ou dado depende da estrutura antiga.

## 15. Testes obrigatórios

- Prisma schema valida e client gera sem carregar `.env`;
- migration aplica em PostgreSQL isolado vazio e em cópia sanitizada do estado
  legado;
- rollback operacional é documentado e ensaiado;
- email e placa são únicos após normalização;
- dois requests concorrentes não criam dois veículos principais;
- troca e exclusão do principal são atômicas;
- último vínculo de veículo não é removido;
- usuário A não consulta ou altera vínculo do usuário B;
- refresh token bruto não é persistido;
- exclusões não removem testes, telemetria ou auditoria por cascata;
- duplicatas MQTT não duplicam telemetria ou energia;
- consultas principais utilizam os índices planejados;
- logs e erros não contêm email completo, placa, token, cookie ou payload bruto.

## 16. Pequenos commits propostos

Os commits serão realizados pelo programador, nunca pela IA.

### Commit 1 — Decisões e baseline do banco

- aprovar este plano;
- registrar estado autorizado do Neon e dados a preservar;
- fechar decisões bloqueantes da seção 17.

### Commit 2 — Testes estruturais do schema

- criar validações automatizadas de enums, relações, índices e deleções;
- confirmar falha contra o schema experimental antes da implementação.

### Commit 3 — Identidade, papéis e sessões

- adicionar enums e models de usuário, papéis e refresh sessions;
- testar hashes, unicidade e deleções.

### Commit 4 — Veículos e vínculos

- adicionar `Vehicle` e `UserVehicle`;
- implementar constraints e índice parcial do veículo principal;
- testar concorrência, troca e exclusão.

### Commit 5 — Instalações, dispositivos e configurações

- modelar o hardware e configurações imutáveis versionadas;
- testar unicidade, compatibilidade e deleções.

### Commit 6 — Testes experimentais

- substituir o modelo experimental de `Test`;
- testar estados, referências e campos derivados.

### Commit 7 — MQTT e telemetria

- separar mensagem bruta de amostra normalizada;
- testar idempotência, ordenação, origem e índices.

### Commit 8 — Resumos, suporte e auditoria

- modelar agregados versionados, solicitações e eventos mínimos;
- testar precisão e ausência de dados sensíveis.

### Commit 9 — Migration expand e reconciliação

- gerar SQL sem aplicar automaticamente ao Neon;
- revisar manualmente SQL, locks, backfill e índices parciais;
- validar em bancos isolados.

### Commit 10 — Documentação e contexto

- atualizar dicionário de dados, diagrama e runbook da migration;
- registrar comandos, resultados, riscos e pendências.

## 17. Decisões bloqueantes antes do Commit 2

1. O Neon contém dados reais ou experimentais que precisam ser preservados?
2. “Excluir veículo” remove somente `UserVehicle` da conta ou pode apagar
   fisicamente um `Vehicle` sem histórico?
3. Email case-insensitive usará `citext` no PostgreSQL ou coluna normalizada
   adicional com unicidade?
4. Papéis globais serão tabelas relacionais ou enum em associação?
5. `AuthIdentity` entra agora ou somente quando login Google for contratado?
6. Uma instalação pode ter mais de um ESP32 ativo simultaneamente?
7. Uma mensagem MQTT contém uma amostra ou um lote de amostras?
8. Qual é a retenção de sessões, MQTT bruto, telemetria, auditoria e backups?
9. Dados legados do schema atual têm mapeamento confiável para as novas
   entidades ou podem ser arquivados separadamente?

## 18. Critério de conclusão da Fase 2

- decisões bloqueantes registradas e aprovadas;
- schema revisado por domínio e coberto por testes;
- migration versionada, legível e sem destruição antecipada;
- validação aprovada em banco isolado vazio e estado legado sanitizado;
- plano de backup, restauração, rollout e rollback documentado;
- Prisma Client gerado e backend compilando;
- nenhuma conexão ou aplicação ao Neon sem autorização explícita separada.
