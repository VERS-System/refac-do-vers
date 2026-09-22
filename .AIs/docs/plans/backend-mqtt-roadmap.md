<!-- Roadmap específico para implementar o backend, a ingestão MQTT e o tratamento de dados do VERS. -->

# Roadmap de Backend e MQTT — VERS

> A execução detalhada de cada fase está separada no
> [Roadmap executável do backend](backend-roadmap/README.md). Este documento
> permanece como fonte estratégica de escopo, arquitetura e marcos.

## 1. Objetivo

Este documento é a fonte de verdade para o desenvolvimento do backend e da
integração MQTT do VERS. O produto será uma plataforma de recepção, tratamento,
armazenamento e análise dos dados do sistema de energy harvesting.

O ESP32 é responsável por coletar e publicar as medições. O escopo deste
roadmap começa quando a mensagem chega pelo MQTT e termina na disponibilização
segura de dados e análises para o aplicativo mobile e o dashboard desktop.

## 2. Escopo

### Incluído

- backend único em NestJS para mobile e desktop;
- autenticação, autorização e gestão de sessões;
- cadastro de usuários, veículos, instalações, dispositivos e configurações;
- ciclo de vida dos testes experimentais;
- recepção de telemetria pelo HiveMQ Cloud;
- preservação do payload bruto e processamento idempotente;
- normalização, validação e classificação da qualidade das medições;
- cálculo de potência, energia, estatísticas e comparações;
- consultas REST históricas e eventos em tempo real por WebSocket;
- tratamento uniforme de erros, auditoria e observabilidade;
- PostgreSQL/Neon como fonte histórica e Redis para Pub/Sub e cache;
- documentação e testes dos contratos consumidos pelos clientes.

### Fora do escopo

- firmware e lógica de coleta do ESP32;
- dimensionamento do circuito elétrico;
- implementação das interfaces mobile e desktop;
- diagnóstico do veículo;
- substituição do alternador ou promessa de eficiência não medida;
- uso de Redis como fila persistente;
- separação prematura de MQTT e WebSocket em novos serviços executáveis.

## 3. Decisões de arquitetura

1. O MVP terá um único serviço implantável: `services/backend`.
2. REST, MQTT, processamento e WebSocket serão módulos internos independentes do
   mesmo NestJS, com contratos e testes próprios.
3. O backend será a única fonte das regras de negócio e do tratamento de erros
   consumidos pelo mobile e pelo desktop.
4. Prisma será a fonte de verdade do schema PostgreSQL; migrations pertencem ao
   backend.
5. O payload MQTT bruto será imutável. Dados corrigidos ou derivados serão
   persistidos separadamente.
6. Redis será usado somente para Pub/Sub em tempo real e cache reconstruível.
7. Tipos usados por mais de um cliente TypeScript ficarão em
   `packages/shared-types`.
8. MQTT ou WebSocket só serão extraídos para processos independentes após uma
   decisão arquitetural baseada em carga, disponibilidade ou isolamento de
   falhas.

## 4. Arquitetura do MVP

```text
ESP32
  └─ MQTT/TLS → HiveMQ Cloud
                  └─ Backend NestJS
                       ├─ MqttModule: conexão e recepção
                       ├─ IngestionModule: validação e idempotência
                       ├─ ProcessingModule: normalização e cálculos
                       ├─ Prisma → PostgreSQL/Neon
                       ├─ Redis Pub/Sub e cache
                       ├─ WebSocket → desktop/mobile autorizado
                       └─ REST /api/v1 → desktop/mobile autorizado
```

O broker autentica o dispositivo na conexão. O backend também valida se o
`deviceUid` do tópico e do payload pertence a um dispositivo ativo e autorizado.

## 5. Ciclo de vida dos dados

```text
RECEIVED → VALIDATED → PROCESSED
    │          │           ├─ TelemetrySample
    │          │           ├─ EnergySummary
    │          │           └─ evento em tempo real
    │          └─ REJECTED
    └─ DUPLICATE
```

### 5.1 Recepção

- registrar tópico, QoS, flag `retained`, instante de recebimento e payload;
- limitar tamanho e profundidade do JSON antes do processamento;
- gerar um ID de correlação para acompanhar mensagem, logs e erros;
- reconhecer duplicidade por `messageId` e sequência por dispositivo.

### 5.2 Validação

- aceitar apenas versões de schema suportadas e campos permitidos;
- validar identidade e estado do dispositivo;
- validar timestamp, sequência, unidade, tipo e faixa de cada medição;
- distinguir campo ausente de valor zero;
- rejeitar valores não finitos e combinações fisicamente incoerentes;
- registrar código estruturado de rejeição sem perder o payload original.

As faixas físicas e os campos definitivos serão fechados quando o circuito e os
pontos medidos pelo ESP32 forem confirmados. Essa decisão não bloqueia o
envelope, a idempotência nem a arquitetura do pipeline.

### 5.3 Normalização

- converter timestamps aceitos para UTC;
- usar nomes com unidades explícitas, como `voltageV`, `currentA`, `powerW` e
  `energyWh`;
- calcular potência no backend a partir de tensão e corrente quando ambas
  existirem;
- preservar separadamente valores calculados e informados pelo dispositivo;
- classificar cada amostra como `VALID`, `PARTIAL`, `SUSPECT` ou `INVALID`.

### 5.4 Agregação e análise

- integrar potência no tempo para obter energia recuperada;
- calcular média, mínimo, máximo, desvio e percentis quando forem úteis;
- produzir séries por intervalo, teste, hora, dia e mês;
- contabilizar amostras válidas, ausentes, atrasadas e rejeitadas;
- comparar testes somente com configuração e contexto identificados;
- recalcular resumos de maneira idempotente;
- nunca calcular “eficiência” sem uma referência mensurável de energia de
  entrada;
- não estimar energia consumida ou economia financeira sem fonte e premissas
  registradas.

## 6. Domínios e módulos do backend

| Módulo | Responsabilidade |
| --- | --- |
| `AuthModule` | cadastro, login e sessões JWT em cookies `HttpOnly`, com rotação e revogação |
| `UsersModule` | perfil e administração autorizada de usuários |
| `VehiclesModule` | veículos e vínculos com usuários |
| `InstallationsModule` | instalações VERS e configurações físicas versionadas |
| `DevicesModule` | identidade, provisionamento, status e revogação de dispositivos |
| `TestsModule` | criação, início, encerramento e consulta de testes |
| `MqttModule` | conexão TLS, subscriptions e recepção dos envelopes MQTT |
| `IngestionModule` | idempotência, validação, rejeição e rastreabilidade |
| `TelemetryModule` | persistência e consulta das amostras tratadas |
| `AnalyticsModule` | cálculos, agregações, séries e comparações |
| `RealtimeModule` | publicação autorizada de eventos via Redis e Socket.IO |
| `SupportModule` | solicitações de revisão da instalação VERS |
| `HealthModule` | saúde da aplicação, banco, Redis e conexão MQTT |

O Viber e o `ai-service` não fazem parte do núcleo desta entrega. A integração
futura deverá consumir resultados já tratados pelo `AnalyticsModule`, sem ler
payload bruto diretamente nem duplicar regras de cálculo.

## 7. Modelo de dados mínimo

O schema definitivo será detalhado antes da migration, mas deverá separar:

- `User`, `Role` e `RefreshSession`;
- `Vehicle` e `UserVehicle`;
- `VersInstallation`, `Device` e `Configuration` versionada;
- `Test` e seu contexto experimental;
- `MqttMessage` imutável, com estado e motivo de processamento;
- `TelemetrySample` normalizada e vinculada à mensagem de origem;
- `EnergySummary` calculado por período e versão de cálculo;
- `SupportRequest`;
- `AuditEvent` mínimo, sem segredos ou payload pessoal excessivo.

Índices obrigatórios devem cobrir dispositivo e sequência, dispositivo e
instante, teste e instante, instalação e período, além das chaves de
idempotência. A retenção dos payloads brutos e da telemetria deverá ser definida
antes da implantação em produção.

## 8. Contrato MQTT inicial

### Tópicos

```text
vers/v1/devices/{deviceUid}/telemetry
vers/v1/devices/{deviceUid}/status
vers/v1/devices/{deviceUid}/events
```

- `telemetry`: lotes ou amostras de medição;
- `status`: conectividade, firmware e estado dos sensores;
- `events`: início/fim de teste e eventos operacionais relevantes.

### Envelope obrigatório

```json
{
  "schemaVersion": 1,
  "messageId": "uuid",
  "deviceUid": "vers-esp32-001",
  "sequence": 1042,
  "capturedAt": "2026-09-03T18:30:00.000Z",
  "testId": "uuid-ou-null",
  "measurements": {}
}
```

Os campos de `measurements`, suas unidades, faixas e frequência serão definidos
em um dicionário de dados específico após o levantamento final do hardware.
Campos indisponíveis serão omitidos ou `null`, nunca convertidos em zero.

### Confiabilidade

- TLS obrigatório entre dispositivo, broker e backend;
- credencial individual e revogável por dispositivo;
- princípio de menor privilégio nos tópicos do broker;
- QoS definido por tipo de evento, sem presumir exatamente uma entrega;
- idempotência obrigatória no consumidor;
- mensagens fora de ordem preservadas e sinalizadas;
- retained message permitido apenas onde seu significado for seguro;
- reconexão não poderá duplicar agregados.

## 9. APIs REST planejadas

Todas as rotas usam `/api/v1`, DTOs allowlist, respostas paginadas quando
aplicável e autorização por recurso.

### Autenticação

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `POST /auth/logout-all`

Login, cadastro e refresh não retornam tokens no JSON. Access e refresh tokens
são definidos exclusivamente por cabeçalhos `Set-Cookie` com `HttpOnly`; refresh
e logout recebem a sessão pelos cookies e não aceitam token no body.

Recuperação de senha e login Google ficam fora do MVP inicial e exigem contrato
específico antes da implementação.

### Usuário e veículos

- `GET /users/me`
- `PATCH /users/me`
- `GET /vehicles`
- `POST /vehicles`
- `GET /vehicles/:vehicleId`
- `PATCH /vehicles/:vehicleId`

### Instalações, dispositivos e configurações

- `GET /installations`
- `GET /installations/:installationId`
- `POST /installations/:installationId/configurations`
- `GET /installations/:installationId/configurations`
- `POST /installations/:installationId/devices`
- `PATCH /devices/:deviceId/status`

Provisionamento e revogação de dispositivos serão rotas administrativas.

### Testes

- `POST /tests`
- `POST /tests/:testId/start`
- `POST /tests/:testId/finish`
- `GET /tests`
- `GET /tests/:testId`

As transições de estado serão explícitas e protegidas contra concorrência.

### Telemetria e análises

- `GET /tests/:testId/telemetry`
- `GET /tests/:testId/summary`
- `GET /tests/:testId/series`
- `GET /installations/:installationId/latest`
- `GET /installations/:installationId/summaries`
- `GET /analytics/tests/compare`
- `GET /analytics/data-quality`

Consultas exigirão intervalo limitado, paginação ou resolução agregada para
evitar exportações acidentais e sobrecarga do banco.

### Suporte e operação

- `POST /support-requests`
- `GET /support-requests`
- `PATCH /support-requests/:requestId/status`
- `GET /health/live`
- `GET /health/ready`

## 10. Contrato de respostas e erros

Sucesso:

```json
{
  "data": {},
  "meta": {},
  "requestId": "uuid"
}
```

Erro:

```json
{
  "error": {
    "code": "TELEMETRY_INVALID_RANGE",
    "message": "Não foi possível processar a solicitação.",
    "details": []
  },
  "requestId": "uuid",
  "timestamp": "2026-09-03T18:30:00.000Z"
}
```

Regras:

- códigos estáveis e documentados, independentes do texto apresentado no front;
- nenhum stack trace, segredo, token ou detalhe interno em produção;
- erros de autenticação não confirmam a existência do usuário;
- falhas externas têm timeout, classificação e resposta controlada;
- logs usam o mesmo `requestId` ou `correlationId` da operação;
- validações de MQTT possuem códigos próprios para auditoria e métricas.

## 11. Segurança e privacidade

### REST e WebSocket

- JWT próprio com access token curto e refresh token rotativo e revogável;
- access e refresh tokens exclusivamente em cookies `HttpOnly`, sem acesso por
  JavaScript e sem inclusão no corpo JSON;
- HTTPS obrigatório e cookies `Secure` em produção;
- CORS com credenciais restrito à allowlist, proteção CSRF e política `SameSite`
  definida conforme os domínios finais dos clientes;
- hash seguro de senha e de refresh token; somente o hash da sessão é persistido;
- rotas públicas, autenticadas e administrativas explicitamente classificadas;
- autorização por papel e por propriedade do veículo/instalação/teste;
- validação global, rejeição de campos extras e proteção contra mass assignment;
- rate limit por rota e identidade, CORS allowlist e Helmet por ambiente;
- limites de paginação, intervalos, payload e conexões WebSocket;
- canais WebSocket autorizados por instalação e usuário;
- nenhuma chave, credencial ou segredo entregue aos clientes.

### MQTT

- TLS, credencial por dispositivo e ACL limitada ao próprio `deviceUid`;
- validação cruzada de tópico, payload, dispositivo e teste ativo;
- proteção contra replay por `messageId`, sequência e política temporal;
- rotação e revogação de credenciais sem apagar o histórico do dispositivo;
- payloads inválidos nunca geram silenciosamente telemetria válida.

### Dados e LGPD

- separar dados de identidade da telemetria sempre que possível;
- coletar somente dados necessários à finalidade experimental;
- não persistir CPF ou documento de veículo no MVP sem necessidade aprovada,
  fluxo definido, proteção e retenção;
- nunca registrar senha, token, credencial MQTT ou documento completo em logs;
- usar dados sintéticos em desenvolvimento e testes;
- definir acesso, retenção e descarte para dados brutos, tratados, agregados,
  cache, logs e backups;
- suportar exportação, correção e eliminação quando aplicáveis, sem expor dados
  de terceiros;
- decisões de finalidade e base legal dependem do responsável pelo projeto e,
  quando necessário, de avaliação jurídica; este roadmap define controles
  técnicos, não declara conformidade jurídica.

## 12. Observabilidade e operação

- logs estruturados com redaction e IDs de correlação;
- métricas de mensagens recebidas, válidas, rejeitadas e duplicadas;
- atraso entre `capturedAt`, `receivedAt` e `processedAt`;
- taxa de processamento e falhas por versão de payload e dispositivo;
- métricas de conexão com MQTT, Redis, banco e WebSocket;
- alertas para indisponibilidade, backlog interno, rejeições anormais e falhas de
  agregação;
- health checks separados de vida e prontidão;
- backup, restauração e migrations com procedimento documentado.

## 13. Estratégia de testes

Toda entrega funcional seguirá TDD e deverá passar em `test:unit`, lint e build.

### Testes unitários

- DTOs, regras de estado e autorização;
- validação de envelopes e medições;
- idempotência, ordenação e códigos de rejeição;
- potência, integração de energia e estatísticas;
- agregações com lacunas, intervalos irregulares e valores inválidos;
- filtros de erro, redaction e autorização de canais.

### Testes de integração

- NestJS com Prisma em banco isolado;
- entrada MQTT até persistência de mensagem e telemetria;
- publicação Redis até entrega WebSocket;
- autenticação, refresh por cookie, revogação, CSRF e acesso por recurso;
- ausência de tokens nos corpos JSON e indisponibilidade dos cookies ao
  JavaScript;
- migrations, índices e concorrência nas chaves idempotentes.

### Testes end-to-end

- usuário autorizado cria e inicia um teste;
- dispositivo autorizado envia telemetria;
- backend trata, armazena e publica a atualização;
- REST retorna série e resumo coerentes;
- duplicata não duplica telemetria nem energia;
- usuário sem vínculo não acessa os dados;
- payload inválido permanece auditável sem contaminar análises.

## 14. Fases de execução

As APIs dos aplicativos têm prioridade sobre a integração MQTT. Até o hardware
estar disponível, o backend será desenvolvido e validado com dados sintéticos e
fixtures versionadas. Isso permite entregar autenticação, cadastros, testes,
consultas e análises sem depender do ESP32 ou do broker.

### Fase 0 — Baseline real

**Estado:** concluída em 03/09/2026. Resultado registrado em
[Baseline do backend](backend-baseline-03-09-2026.md). Testes, lint, build,
pnpm e geração do Prisma Client possuem baseline reproduzível.

**Entregas:** auditar scaffolds, classificar código funcional/parcial/vazio,
executar testes, lint e build, documentar falhas preexistentes e fechar
convenções de testes.

**Saída:** baseline reproduzível e nenhuma suposição de que scaffold já funciona.

### Fase 1 — Contratos das APIs dos aplicativos

**Entregas:** transformar as necessidades do mobile e do desktop em recursos,
casos de uso, DTOs, permissões, estados, paginação, respostas e catálogo de
erros. Produzir o contrato OpenAPI e os tipos compartilhados antes dos
controllers.

**Saída:** frontend consegue trabalhar com contratos e fixtures estáveis sem
depender do MQTT.

### Fase 2 — Schema e migration

**Entregas:** modelar primeiro identidade, veículos, instalações, configurações,
testes, telemetria, resumos e auditoria necessários às APIs. Reservar a
identidade do dispositivo e a rastreabilidade de origem sem fechar ainda todos
os campos físicos do MQTT. Definir índices, deleções, retenção e estratégia para
o banco Neon existente.

**Saída:** migration revisada, Prisma Client gerado e testes do acesso a dados.

### Fase 3 — Fundação segura da API

**Entregas:** integrar módulos essenciais ao `AppModule`, padronizar validação,
erros, logging, correlação, auditoria, health checks, paginação e OpenAPI.

**Saída:** API inicializa com contrato uniforme e dependências monitoradas.

### Fase 4 — Autenticação e autorização

**Entregas:** cadastro, login, cookies JWT `HttpOnly`, refresh, logout, sessões,
proteção CSRF, papéis, propriedade de recursos e proteção WebSocket. Definir
separadamente a identidade MQTT.

**Saída:** acessos legítimos e casos de abuso cobertos por testes.

### Fase 5 — Recursos experimentais

**Entregas:** APIs de veículos, instalações, configurações, dispositivos e ciclo
de vida dos testes, com transições e autorização.

**Saída:** um teste pode ser preparado e ativado antes da telemetria chegar.

### Fase 6 — APIs de dados e análises com fixtures

**Entregas:** implementar consultas de telemetria, séries, resumos, qualidade e
comparação entre testes. Criar um mecanismo restrito a desenvolvimento/teste
para carregar dados sintéticos representativos, sem expor uma rota de ingestão
manual em produção.

**Saída:** mobile e desktop podem integrar e validar todos os fluxos principais
com dados tratados, mesmo sem ESP32 ou MQTT disponíveis.

### Marco de prontidão MQTT

A integração MQTT só começa depois que existir pelo menos uma fonte de teste
executável: ESP32 publicando ou simulador MQTT explicitamente aprovado. Antes do
marco, é permitido desenhar o envelope e escrever testes unitários com fixtures,
mas a integração não será declarada funcional.

O marco exige:

- lista inicial de medições e unidades;
- exemplo real ou aprovado de payload;
- identidade de dispositivo e tópico;
- frequência ou intervalo aproximado de publicação;
- broker/ambiente de teste disponível;
- critério para iniciar e encerrar um teste.

### Fase 7 — Contrato e ingestão MQTT confiável

**Entregas:** fechar o dicionário de medições e o contrato versionado; implementar
conexão HiveMQ, subscriptions, autenticação do dispositivo, persistência bruta,
validação, idempotência, ordenação e telemetria normalizada.

**Saída:** mensagens válidas, duplicadas, atrasadas e inválidas são rastreáveis.

### Fase 8 — Integração do MQTT ao tratamento e tempo real

**Entregas:** alimentar com a telemetria MQTT o mesmo pipeline de potência,
energia, qualidade, séries, resumos e comparações já validado por fixtures;
publicar atualizações por Redis Pub/Sub e canais Socket.IO autorizados.

**Saída:** dados reais percorrem o pipeline sem alterar os contratos já
consumidos pelos aplicativos e chegam em tempo real somente a usuários
autorizados.

### Fase 9 — Operação e entrega

**Entregas:** testes E2E, pipeline CI, migrations de deploy, Docker, métricas,
alertas, backup/restauração, retenção, documentação e runbook.

**Saída:** ambiente limpo pode ser construído, testado, implantado e operado
somente com a documentação versionada.

## 15. Ordem e dependências

```text
F0 → F1 → F2 → F3 → F4 → F5 → F6
                                  └─ Marco MQTT → F7 → F8 → F9
```

- Frontend pode trabalhar com contratos e fixtures após a Fase 1.
- Mobile e desktop podem integrar as APIs completas ao final da Fase 6.
- O contrato preliminar do ESP32 pode ser discutido em paralelo, mas não bloqueia
  as Fases 1 a 6.
- A ingestão MQTT depende do marco de prontidão e de dispositivo e teste
  modelados nas Fases 2 e 5.
- O MQTT reutiliza o pipeline analítico validado com fixtures; não cria uma
  segunda implementação dos cálculos.
- Tempo real distribui resultados do pipeline; não substitui persistência.

## 16. Marcos de entrega

| Marco | Fases | Resultado demonstrável |
| --- | --- | --- |
| A — Contrato para o frontend | 0–1 | Mobile e desktop recebem OpenAPI, tipos, erros e fixtures |
| B — Backend dos aplicativos | 2–6 | Autenticação, cadastros, testes, dados e análises funcionam sem MQTT |
| C — Hardware integrado | 7–8 | Dados reais entram por MQTT e aparecem nas mesmas APIs e no tempo real |
| D — Entrega operacional | 9 | Backend testado, observável, implantável e documentado |

## 17. Critério de conclusão do backend

O backend estará pronto quando for possível demonstrar, de ponta a ponta, que:

1. um usuário autorizado inicia um teste de uma instalação permitida;
2. um dispositivo autenticado publica uma mensagem versionada;
3. o backend preserva, valida e trata a mensagem uma única vez;
4. potência, energia e qualidade são calculadas de forma reproduzível;
5. mobile e desktop consultam séries e resumos pelo mesmo contrato;
6. atualizações ao vivo chegam somente aos usuários autorizados;
7. falhas, duplicatas e dados inválidos são visíveis e não contaminam análises;
8. testes, lint, build, migrations, observabilidade e procedimentos operacionais
   estão aprovados.

## 18. Decisões pendentes que não bloqueiam o início

- campos e pontos elétricos definitivos medidos pelo ESP32;
- frequência, lote e retenção da telemetria;
- regra de reinício do contador de energia do dispositivo;
- QoS final por tópico;
- uma ou mais placas ESP32 por instalação;
- fonte de energia consumida e premissas de economia;
- necessidade e prazo de retenção de CPF/documentos;
- critérios objetivos para extrair MQTT/WebSocket do backend único.

Essas decisões devem ser fechadas até a fase que as utiliza e registradas no
dicionário de dados ou em decisão arquitetural própria.
