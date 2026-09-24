<!-- Plano compartilhado para estabilizar e implementar o core do VERS. -->

# Roadmap de implementação do core — VERS

> Para desenvolvimento do backend, ingestão MQTT, tratamento de dados e APIs,
> a fonte de verdade detalhada é o
> [Roadmap de Backend e MQTT](backend-mqtt-roadmap.md).

## 1. Objetivo

Este documento é a fonte de verdade para a evolução do core do VERS. Ele organiza
o trabalho em fases verificáveis, registra dependências entre serviços e define
quando uma etapa pode ser considerada concluída.

O roadmap não presume que arquivos existentes estejam funcionais. O repositório
contém estruturas iniciais de módulos, mas cada fase deve começar com uma
auditoria do código e dos testes já presentes.

## 2. Estado de referência em 13/08/2026

- O monorepo usa `pnpm` e mantém aplicações em `services/*` e bibliotecas em
  `packages/*`.
- O backend NestJS possui scaffolds de autenticação, dados, MQTT, WebSocket,
  papéis, tokens e APIs separadas por consumidor.
- O `AppModule` registra somente `ConfigModule` e `PrismaModule`; os módulos de
  negócio ainda não estão integrados à aplicação principal.
- O schema Prisma possui sete modelos experimentais, mas ainda não representa
  usuários, veículos, dispositivos e credenciais necessários às APIs existentes.
- Há campos ambíguos ou redundantes no schema, como `amp` e `current` em `Test`,
  além de estados modelados como texto livre.
- O backend possui o script `test`, mas ainda precisa padronizar o script
  obrigatório `test:unit`.
- Mobile possui telas iniciais com dados estáticos; dashboard e web possuem
  estruturas iniciais de integração.
- `docs/arquitetura.md`, `.AIs/docs/Api/endpoints.md` e `docs/fluxo-mqtt.md` existem,
  mas ainda não têm conteúdo.

## 3. Princípios e decisões fixadas

1. O projeto permanece em monorepo e usa `pnpm workspaces`.
2. A organização física atual em `services/` será mantida durante a estabilização.
   Uma migração para `apps/` só poderá ocorrer por decisão arquitetural separada.
3. Prisma é a fonte de verdade do banco PostgreSQL/Neon.
4. O serviço Python usa o schema definido pelo core e não mantém uma definição
   concorrente do banco.
5. Redis será usado para Pub/Sub e cache, não como fila de tarefas.
6. A IA funcionará sob demanda, sem Celery.
7. Alterações funcionais seguem TDD: teste unitário falhando, implementação
   mínima e refatoração.
8. Nenhum agente acessará arquivos `.env`; somente `.env.example` pode ser lido
   ou alterado.
9. Contratos compartilhados devem residir em `packages/shared-types` quando
   forem consumidos por mais de uma aplicação TypeScript.
10. Valores físicos devem possuir unidade explícita e significado inequívoco.

## 4. Arquitetura-alvo

```text
ESP32
  └─ MQTT/HiveMQ
       └─ gateway MQTT
            ├─ persistência validada → backend/Prisma → PostgreSQL (Neon)
            └─ eventos ao vivo → Redis Pub/Sub → WebSocket → dashboard

mobile / web / dashboard
  └─ REST + cookies JWT HttpOnly sobre HTTPS → backend
                     └─ REST interno sob demanda → ai-service/OpenAI
```

Durante a primeira entrega, MQTT e WebSocket podem continuar como módulos do
backend. A separação em processos independentes só deve ocorrer após contratos,
observabilidade e testes de integração demonstrarem essa necessidade.

## 5. Fluxo de trabalho obrigatório por fase

Cada fase deve seguir esta sequência:

1. conferir documentação, código e testes existentes;
2. registrar decisões ainda abertas;
3. escrever primeiro os testes unitários da menor entrega vertical;
4. implementar apenas o necessário para fazê-los passar;
5. executar `test:unit`, lint e build do serviço afetado;
6. atualizar contratos e documentação pública;
7. registrar o resultado em `.AIs/docs/contexts/Context_dd_mm_aaaa.md`;
8. só iniciar a fase dependente quando o critério de saída estiver atendido.

## 6. Fases do roadmap

### Fase 0 — Baseline e capacidade de validação

**Objetivo:** criar uma linha de base confiável antes das mudanças de domínio.

**Entregas:**

- auditar scaffolds e classificar cada módulo como funcional, parcial ou vazio;
- adicionar e padronizar `test:unit` nos serviços aplicáveis;
- executar testes, lint e build atuais e registrar falhas preexistentes;
- definir convenções de testes e mocks do Prisma, Redis, MQTT e APIs externas;
- preencher a visão real da arquitetura em `docs/arquitetura.md`.

**Critério de saída:** comandos de validação conhecidos, reproduzíveis e com
baseline documentado.

### Fase 1 — Domínio e schema do core

**Objetivo:** estabilizar o modelo que sustentará todas as APIs.

**Entregas:**

- revisar `Configuration`, `Test`, `Telemetry`, `EnergySummary`, `MqttMessage`,
  `AiInteraction` e `AiPrediction`;
- modelar usuários, papéis e sessões revogáveis com hash de refresh token,
  veículos e dispositivos;
- remover ou definir campos redundantes e separar medições de agregados;
- converter estados finitos em enums e definir nulabilidade, precisão e unidades;
- definir índices, unicidade, relacionamentos, deleções e retenção de telemetria;
- definir vínculo entre mensagem MQTT, dispositivo, teste e telemetria processada;
- produzir uma migration versionada e uma estratégia segura para dados existentes;
- atualizar o plano detalhado do schema e os tipos compartilhados.

**Critério de saída:** migration revisada, Prisma Client gerado, testes do acesso a
dados aprovados e dicionário de dados atualizado.

### Fase 2 — Fundação transversal do backend

**Objetivo:** estabelecer os comportamentos comuns das APIs.

**Entregas:**

- integrar ao `AppModule` apenas módulos já cobertos por testes;
- padronizar validação, respostas, paginação e tratamento de erros;
- configurar logging estruturado, correlação de requisições e auditoria;
- validar CORS com credenciais e allowlist, proteção CSRF, Helmet, rate limit e
  configuração por ambiente;
- criar health checks de aplicação, banco e Redis;
- definir versionamento e prefixo da API.

**Critério de saída:** aplicação inicializa com segurança, health checks funcionam
e erros seguem contrato único.

### Fase 3 — Identidade, autenticação e autorização

**Objetivo:** entregar uma fronteira de acesso segura para os clientes.

**Entregas:**

- cadastro, login e hash de senha;
- access token curto e refresh token rotativo/revogável exclusivamente em
  cookies `HttpOnly`, sem exposição em JSON ou ao JavaScript;
- HTTPS e cookies `Secure` em produção, com política `SameSite` definida antes
  da implementação;
- Passport JWT, guards e decorators de usuário atual;
- papéis e permissões de usuário e administrador;
- recuperação de senha e login social somente após contrato específico;
- autenticação separada e mínima para dispositivos MQTT;
- testes contra enumeração de usuários, escalada de privilégio, CSRF,
  reutilização de refresh token e exposição de tokens ao JavaScript.

**Critério de saída:** fluxos principais e casos de abuso cobertos por testes;
mobile consegue autenticar sem dados simulados.

### Fase 4 — APIs REST do domínio

**Objetivo:** expor casos de uso persistentes sem acoplar clientes ao Prisma.

**Ordem interna:**

1. configurações do sistema e dispositivos;
2. veículos e perfis;
3. ciclo de vida de testes experimentais;
4. consulta paginada de telemetria;
5. resumos energéticos e indicadores;
6. relatórios e exportações.

**Entregas:** DTOs validados, services, controllers, autorização por recurso,
paginação, filtros e documentação em `.AIs/docs/Api/endpoints.md`.

**Critério de saída:** contratos REST testados e consumíveis sem conhecimento do
schema interno.

### Fase 5 — Contrato de telemetria e MQTT

**Objetivo:** receber dados do ESP32 com rastreabilidade e idempotência.

**Entregas:**

- versionar payload, tópicos e identidade do dispositivo;
- definir timestamp, sequência, unidades e taxa/lote de amostragem;
- validar tamanho, faixa, origem e formato antes da persistência;
- armazenar mensagem bruta, evitar duplicidade e registrar motivo de rejeição;
- transformar mensagens válidas em telemetria vinculada a um teste ativo;
- definir retry, reconexão, dados fora de ordem e operação offline do ESP32;
- documentar o fluxo em `docs/fluxo-mqtt.md`.

**Critério de saída:** payloads válidos, duplicados, atrasados e inválidos cobertos
por testes; uma mensagem pode ser rastreada da origem à telemetria.

### Fase 6 — Indicadores e agregações

**Objetivo:** transformar telemetria válida em informação comparável.

**Entregas:**

- potência instantânea `P = V × I` com regra de dados ausentes;
- energia integrada no tempo em joules e/ou watt-hora;
- médias, máximos, qualidade e relação vibração–potência;
- resumos por teste, dia e mês com recomputação idempotente;
- cálculo de economia apenas com premissas e tarifa registradas;
- impedir o uso de “eficiência” sem referência mecânica mensurável.

**Critério de saída:** fórmulas documentadas e testes com séries conhecidas,
lacunas, intervalos irregulares e valores fora de faixa.

### Fase 7 — Tempo real

**Objetivo:** distribuir telemetria ao vivo sem tornar o dashboard dependente do
broker MQTT.

**Entregas:**

- eventos internos versionados;
- Redis Pub/Sub entre ingestão e gateway WebSocket;
- autenticação, autorização por canal e limites de conexão;
- snapshot inicial via REST e atualizações incrementais via Socket.IO;
- reconexão e descarte controlado de eventos obsoletos.

**Critério de saída:** dashboard recebe apenas dados autorizados e se recupera de
desconexões sem corromper a visualização.

### Fase 8 — Serviço de IA e Viber

**Objetivo:** gerar explicações e análises com dados autorizados e rastreáveis.

**Entregas:**

- contrato NestJS ↔ FastAPI e endpoints internos autenticados;
- seleção explícita de contexto e minimização de dados enviados ao modelo;
- prompts versionados, limites, timeouts e tratamento de indisponibilidade;
- persistência de interações e previsões com versão e proveniência;
- avaliação de respostas, proteção contra prompt injection e distinção clara
  entre medição, inferência e recomendação.

**Critério de saída:** respostas testadas com fixtures, falhas externas tratadas e
nenhuma chave ou dado sensível exposto aos clientes.

### Fase 9 — Integração dos clientes

**Objetivo:** substituir dados simulados por contratos estáveis.

**Ordem recomendada:** autenticação mobile, Home/energia, perfil/veículo,
Viber, dashboard REST/tempo real e web.

**Critério de saída:** fluxos críticos têm estados de carregamento, vazio, erro,
expiração de sessão e reconexão testados.

### Fase 10 — Operação, segurança e entrega

**Objetivo:** tornar a demonstração e a evolução do TCC reproduzíveis.

**Entregas:**

- testes integrados e end-to-end dos fluxos críticos;
- pipeline de lint, testes, build e verificação de migrations;
- backups, retenção, observabilidade e runbooks;
- revisão de dependências, segredos, permissões e superfície exposta;
- procedimento documentado de deploy, rollback e carga de demonstração.

**Critério de saída:** ambiente limpo pode ser construído, validado, implantado e
diagnosticado seguindo apenas a documentação versionada.

## 7. Marcos compartilhados

| Marco | Fases | Resultado demonstrável |
| --- | --- | --- |
| M1 — Base confiável | 0–2 | Backend inicializa, valida e persiste sobre schema estável |
| M2 — Core utilizável | 3–4 | Usuário autentica e opera testes/configurações via REST |
| M3 — Telemetria completa | 5–7 | ESP32 envia, backend processa e dashboard exibe ao vivo |
| M4 — Inteligência aplicada | 8–9 | Clientes consomem indicadores e Viber com dados reais |
| M5 — Entrega reproduzível | 10 | Sistema testado, observável e implantável |

## 8. Dependências entre frentes

| Frente | Pode avançar antes | Depende para integração final |
| --- | --- | --- |
| Banco/Prisma | Auditoria do schema | Fase 0 |
| Backend REST | DTOs e testes isolados | Schema estabilizado na Fase 1 |
| ESP32/MQTT | Protótipo de payload versionado | Dispositivo/teste e contrato da Fase 5 |
| Dashboard | Componentes com fixtures | REST da Fase 4 e eventos da Fase 7 |
| Mobile | Telas e estados com fixtures | Auth da Fase 3 e APIs da Fase 4 |
| AI Service | Avaliações e contrato proposto | Dados/indicadores das Fases 4 e 6 |

## 9. Registro de decisões abertas

As decisões abaixo devem ser resolvidas durante a fase indicada, sem bloquear a
preparação de testes e documentação:

| Decisão | Fase limite |
| --- | --- |
| Separar MQTT e WebSocket em serviços executáveis independentes | 5 e 7 |
| Estratégia de migrations para o banco Neon já existente | 1 |
| Retenção e particionamento de telemetria | 1 |
| Identidade e provisionamento do ESP32 | 1 e 5 |
| Unidade canônica de energia e precisão decimal | 1 e 6 |
| Provedor e contrato de login social | 3 |
| Tarifa/fonte usada para estimar economia | 6 |
| Política de retenção das conversas do Viber | 8 |

## 10. Próxima execução aprovada pelo roadmap

A próxima atividade é a **Fase 0 — Baseline e capacidade de validação**. Ao
concluí-la, a equipe deve produzir uma auditoria objetiva do backend e abrir a
Fase 1 com uma proposta detalhada de alteração do schema, antes de criar a
migration.
