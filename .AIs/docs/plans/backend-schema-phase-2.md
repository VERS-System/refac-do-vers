<!-- Plano de alta segurança para evoluir o schema e criar a primeira migration versionada do VERS. -->

# Fase 2 — Schema Prisma e primeira migration versionada

## 1. Objetivo e estado

Planejar a substituição controlada do schema experimental por um modelo
relacional capaz de sustentar os contratos aprovados e as fases posteriores do
backend. Prisma continuará como fonte de verdade do PostgreSQL/Neon.

**Estado:** contratos da Fase 1 concluídos; baseline local da Fase 2 registrado
em [backend-schema-phase-2-lot1-baseline.md](backend-schema-phase-2-lot1-baseline.md).
Este documento não autoriza aplicação de migration nem acesso ao Neon.

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
User ──< UserRoleAssignment (papel enum)
  │
  ├──< RefreshSession
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

- email normalizado antes da persistência e único sem distinção de caixa usando
  a extensão PostgreSQL `citext`;
- `passwordHash` nunca aparece em DTOs, logs ou auditoria;
- exclusão de conta não pode apagar silenciosamente testes ou auditoria;
- status usa enum, não texto livre.

### Papéis

Papéis globais iniciais são `USER` e `ADMIN`. Usar associação relacional
`UserRoleAssignment` para permitir os dois papéis ao mesmo usuário. `ADMIN` é
um papel do usuário. `TECHNICIAN` não entra no escopo atual; só será criado se
houver uma função operacional definida. O papel é enum na associação; não criar
uma tabela `Role` separada neste MVP.

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
`[provider, providerSubject]`. Login Google e a entrada de `AuthIdentity` na
migration ficam em espera até decisão específica; não incluir por antecipação.

## 8. Veículos e vínculo com usuários

### `Vehicle`

Campos mínimos: `id`, `licensePlate`, `brand`, `model`, `modelYear`,
`createdAt` e `updatedAt`.

Regras:

- placa normalizada, única e imutável após criação;
- não armazenar CPF, CRLV, RENAVAM ou documento;
- não colocar `userId` diretamente em `Vehicle`;
- a exclusão solicitada remove primeiro o vínculo da conta atual; se outras
  contas ainda estiverem vinculadas, o veículo e seus identificadores
  permanecem para elas;
- após a remoção do último vínculo ativo, remover o veículo, a placa e demais
  identificadores específicos, inclusive da instalação ativa; testes e
  medições permanecem;
- dados históricos necessários são copiados para um snapshot do teste antes da
  exclusão, sem placa ou outro identificador específico.

### `UserVehicle`

Campos mínimos: `userId`, `vehicleId`, `relationship`, `isPrimary`, `createdAt`
e, se exclusão lógica for aprovada, `unlinkedAt`.

Invariantes:

- chave composta `[userId, vehicleId]`;
- primeiro vínculo da conta recebe `isPrimary = true`;
- no máximo um vínculo ativo principal por usuário;
- troca do principal ocorre em transação;
- o usuário pode remover seu último veículo ativo; testes anteriores permanecem;
- remover o registro `Vehicle` somente quando não restar vínculo ativo com
  nenhuma conta; contagem, desvinculação e remoção ocorrem em transação;
- remoção do principal promove o único restante ou exige escolha entre vários;
- substituto pertence ao mesmo usuário e não está removido.

PostgreSQL pode garantir “um principal ativo por usuário” com índice único
parcial, por exemplo sobre `user_id WHERE is_primary = true AND unlinked_at IS
NULL`. Como Prisma não representa todo índice parcial no schema, a migration
SQL deverá ser revisada manualmente e conter um teste de concorrência.

## 9. Instalações, dispositivos e configurações

### `VersInstallation`

Vincula o sistema físico ao veículo e contém modelo, número de série, status e
datas de instalação. Existe no máximo um ESP32 ativo por veículo. Desvincular
uma conta não apaga a instalação usada pelas demais. A remoção física do
veículo após o último vínculo encerra a instalação ativa e remove seus dados
identificadores sem apagar o snapshot da montagem usado pelos testes.

### `Device`

Identifica o ESP32 por `deviceUid` único. Credenciais MQTT não ficam em texto
puro nessa tabela. Revogação não apaga mensagens históricas.

Para a unicidade por veículo, um dispositivo ainda não revogado ocupa a vaga
mesmo em `OFFLINE` ou `FAULT`. A revogação registra `revokedAt` junto com o
estado `REVOKED`; só então outro ESP32 pode ocupar a vaga. A FK composta de
`Device` liga `installationId` e `vehicleId` à mesma instalação.

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
- o teste mantém snapshot do modelo do veículo, local informado onde ocorreu,
  quantidade de piezos e condições experimentais; placa e identificadores
  específicos não entram nesse snapshot;
- `vehicleWeightKg` representa o peso no teste, informado ou medido; não pode
  ser deduzido apenas do modelo, pois carga e ocupantes variam;
- exclusões de usuário, veículo ou instalação não apagam o teste;
- ao excluir a conta criadora, `createdById` passa a `null`, sem remover o teste;
- texto livre possui limite e não deve receber documentos ou segredos.

## 11. MQTT e telemetria

### `MqttMessage`

Preserva o payload recebido, identidade da mensagem, dispositivo, teste, versão
do schema, tópico, sequência, QoS, retained, timestamps, status de processamento
e motivo de rejeição. O contrato do ESP32 não deve enviar placa nem outro
identificador específico do veículo no tópico ou payload.

Restrições mínimas:

- `messageId` único;
- `[deviceId, sequence]` único;
- índices `[deviceId, capturedAt]` e `[status, receivedAt]`;
- payload imutável após recepção;
- rejeição mantém rastreabilidade sem produzir telemetria válida.

Ao remover o último vínculo de um veículo, a transação de exclusão apaga antes
as mensagens MQTT brutas dos seus dispositivos, pois tópico/payload podem conter
`deviceUid`. A FK restritiva impede apagar o veículo antes dessa etapa. Amostras
normalizadas e testes permanecem; FKs para mensagem, dispositivo e instalação
passam a `null`. A revogação do ESP32, sem exclusão do veículo, não apaga o bruto.

### `TelemetrySample`

Armazena somente dados normalizados e classificados. Uma mensagem MQTT de
telemetria transporta um lote de amostras; a relação `MqttMessage` →
`TelemetrySample` é 1:N, e cada amostra guarda sua posição ou instante no lote.

Índices mínimos propostos: `[testId, capturedAt]` e
`[deviceId, capturedAt]`. Frequência, duração do período e tamanho do lote serão
definidos durante o desenvolvimento do ESP32, sem bloquear esta cardinalidade.

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

Estratégia decidida para o desenvolvimento:

| Dado | Exclusão proposta | Observação |
| --- | --- | --- |
| Sessão expirada/revogada | sem limpeza periódica automática | expiração e revogação continuam valendo para autenticação |
| Vínculo usuário–veículo | remover na exclusão solicitada | outras contas vinculadas mantêm acesso ao veículo |
| Veículo sem vínculos ativos | remover placa e dados identificadores | testes usam snapshots sem placa; nenhuma cascata apaga telemetria |
| Configuração usada | `Restrict` | snapshot experimental imutável |
| Teste e telemetria | sem limpeza periódica automática | preservar integridade científica |
| MQTT bruto | sem limpeza periódica automática | não incluir identificadores do veículo no payload |
| Auditoria | sem limpeza periódica automática | não incluir placa nem outros identificadores do veículo |
| Backups | sem limpeza periódica automática definida no produto | operação do provedor e restauração serão verificadas antes da migration |

Uma limpeza futura será decisão explícita da equipe, não rotina do MVP. A
exclusão solicitada de veículo continua obrigatória; seu fluxo deve verificar
payloads, auditoria e referências antes de afirmar que os identificadores foram
removidos. Os campos e relacionamentos necessários para essa operação serão
detalhados nos testes estruturais e na migration.

Nenhuma política representa conformidade jurídica definitiva. Finalidade, base
legal, retenção e atendimento a direitos dependem do responsável pelo projeto e,
quando necessário, de avaliação jurídica.

## 14. Estratégia da primeira migration

### Etapa A — Baseline sem mutação

1. confirmar o estado do Neon compartilhado de desenvolvimento, usado somente
   com dados fictícios de baixa sensibilidade; a equipe autorizou descartar os
   dados legados na primeira troca de schema;
2. obter inventário autorizado de tabelas, colunas, constraints, índices e
   volumes sem expor registros pessoais;
3. comparar banco, schema Prisma atual e modelo proposto;
4. registrar divergências e o procedimento de recriação inicial; depois da
   primeira troca, migrations devem preservar os dados existentes;
5. criar plano de backup e restauração testada.

### Etapa B — Primeira migration

- criar o schema novo e sua migration versionada em banco isolado;
- revisar explicitamente a remoção do legado autorizada somente para a
  primeira troca, sem presumir que o Neon já esteja vazio;
- validar a extensão `citext`, constraints e índices antes de aplicar;
- migrations posteriores usam evolução preservadora de dados.

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
- migration aplica em PostgreSQL isolado vazio e em ensaio que represente o
  estado legado a ser substituído;
- rollback operacional é documentado e ensaiado;
- email e placa são únicos após normalização;
- dois requests concorrentes não criam dois veículos principais;
- troca e exclusão do principal são atômicas;
- último vínculo de veículo pode ser removido sem apagar testes;
- usuário A não consulta ou altera vínculo do usuário B;
- refresh token bruto não é persistido;
- desvincular uma conta preserva o veículo para outras contas; a remoção do
  último vínculo apaga seus identificadores e preserva testes e telemetria;
  payload MQTT e auditoria não retêm placa;
- duas desvinculações concorrentes não deixam veículo órfão nem apagam um
  veículo ainda vinculado a outra conta;
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

## 17. Decisões registradas em 22/09/2026

1. Neon será o banco compartilhado de desenvolvimento, com dados fictícios de
   baixa sensibilidade. O legado pode ser descartado na primeira troca de
   schema; migrations seguintes devem preservar os dados existentes.
2. A exclusão solicitada remove o vínculo da conta atual, mesmo se for seu
   último veículo. Se houver outras contas vinculadas, o veículo e a placa
   permanecem para elas. Após o último vínculo, o veículo e seus identificadores
   são removidos. Testes e telemetria permanecem com snapshot do modelo, local
   informado, quantidade de piezos e condições experimentais, sem placa.
3. Email sem distinção de caixa usará `citext`.
4. Papéis globais usam associação relacional; `USER` e `ADMIN` podem coexistir
   no mesmo usuário. `TECHNICIAN` não integra o escopo atual.
5. `AuthIdentity` e login Google ficam em espera para discussão posterior.
6. Um veículo possui no máximo um ESP32 ativo.
7. Cada mensagem MQTT de telemetria transporta um lote de amostras. Frequência
   e tamanho serão escolhidos no desenvolvimento do firmware ESP32.
8. Não haverá limpeza periódica automática de sessões, MQTT bruto, telemetria,
   auditoria ou backups no MVP. Remoções futuras serão decididas pela equipe.
9. Peso do veículo no teste deve ser informado ou medido no momento; o modelo
   isolado não determina o peso real com carga e ocupantes.

Os contratos da Fase 1 estão concluídos. Ainda é necessário detalhar o fluxo
transacional de desvinculação e preservação de histórico e ensaiar a primeira
migration antes de
qualquer aplicação no Neon. As decisões de firmware sobre amostragem e energia
acumulada não bloqueiam o schema inicial quando representadas de forma
compatível com lotes.

## 18. Critério de conclusão da Fase 2

- decisões bloqueantes registradas e aprovadas;
- schema revisado por domínio e coberto por testes;
- migration versionada, legível e sem destruição antecipada;
- validação aprovada em banco isolado vazio e estado legado sanitizado;
- plano de backup, restauração, rollout e rollback documentado;
- Prisma Client gerado e backend compilando;
- nenhuma conexão ou aplicação ao Neon sem autorização explícita separada.
