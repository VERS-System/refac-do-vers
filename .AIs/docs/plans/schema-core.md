# Schema do Core — VERS

> **Status em 13/08/2026:** este é o plano inicial que originou o schema
> experimental já aplicado. Ele não representa o contrato final. A revisão de
> usuários, veículos, dispositivos, autenticação, enums, índices, precisão e
> retenção ocorrerá na Fase 1 do [roadmap do core](core-roadmap.md). Em caso de
> divergência sobre próximos passos, o roadmap é a fonte de verdade.

## Entidades

### Test
| Campo | Tipo | Descrição |
|---|---|---|
| id | UUID | Identificador único |
| name | String | Nome do teste |
| configuration_id | UUID → Configuration | FK para configuração usada |
| satisfatory | Boolean | Se o teste foi satisfatório |
| terrain | Enum | highway / city / offroad / mixed / other |
| rpm | Float | RPM médio do motor |
| watts | Float | Potência em watts |
| amp | Float | Amperagem |
| current | Float | Corrente |
| battery_used | Float | Bateria gasta |
| battery_generated | Float | Bateria gerada |
| num_piezos | Int | Quantidade de piezos ativos |
| start_time | DateTime | Início do teste |
| end_time | DateTime | Fim do teste |
| duration | Int | Duração em segundos |
| weight | Float | Peso do veículo |
| avg_speed | Float | Velocidade média |
| incline | Float | Inclinação do terreno |
| notes | String | Observações |
| status | Enum | planned / running / completed / failed |
| created_at | DateTime | Data de criação |

### Configuration
| Campo | Tipo | Descrição |
|---|---|---|
| id | UUID | Identificador único |
| name | String | Nome da configuração |
| piezo_association | Enum | series / parallel |
| installation_point | String | Ponto de instalação |
| storage_type | String | Tipo de armazenamento |
| firmware_version | String | Versão do firmware |
| description | String | Descrição livre |
| created_at | DateTime | Data de criação |

### Telemetry
| Campo | Tipo | Descrição |
|---|---|---|
| id | UUID | Identificador único |
| test_id | UUID → Test | FK para o teste |
| timestamp | DateTime | Momento da leitura |
| voltage | Float | Tensão (V) |
| current | Float | Corrente (A) |
| power | Float | Potência (W) |
| energy_accumulated | Float | Energia acumulada (J/Wh) |
| acceleration_x | Float | Aceleração eixo X |
| acceleration_y | Float | Aceleração eixo Y |
| acceleration_z | Float | Aceleração eixo Z |
| temperature | Float | Temperatura |
| sensor_status | String | Estado do sensor |
| quality | String | Qualidade da leitura |
| created_at | DateTime | Data de criação |

### EnergySummary
| Campo | Tipo | Descrição |
|---|---|---|
| id | UUID | Identificador único |
| date | DateTime | Data do resumo |
| period | Enum | daily / monthly |
| battery_recovered | Float | Bateria recuperada |
| battery_used | Float | Bateria gasta |
| energy_per_hour | JSON | Energia por hora do dia |
| money_economy | Float | Economia financeira estimada |
| created_at | DateTime | Data de criação |

### MqttMessage
| Campo | Tipo | Descrição |
|---|---|---|
| id | UUID | Identificador único |
| topic | String | Tópico MQTT |
| payload | JSON | Dados brutos recebidos |
| timestamp | DateTime | Momento da mensagem |
| processed | Boolean | Se já foi processado |
| created_at | DateTime | Data de criação |

### AiInteraction
| Campo | Tipo | Descrição |
|---|---|---|
| id | UUID | Identificador único |
| session_id | String | ID da sessão do chat |
| question | String | Pergunta do usuário |
| answer | Text | Resposta do Viber |
| context | JSON | Contexto adicional |
| created_at | DateTime | Data de criação |

### AiPrediction
| Campo | Tipo | Descrição |
|---|---|---|
| id | UUID | Identificador único |
| test_id | UUID → Test | FK para o teste |
| prediction_type | Enum | anomaly / trend / forecast |
| prediction_data | JSON | Dados da previsão |
| created_at | DateTime | Data de criação |

---

## Fluxo de dados

```
ESP32 → MQTT (HiveMQ)
         ↓
Backend (subscriber) → MqttMessage (raw)
         ↓
Processador → Telemetry + EnergySummary
         ↓
      ┌──────────────────────┐
      │ Dashboard (Socket.IO) │  ← tempo real
      │ AI Service (previsões) │  ← AiPrediction
      │ Mobile / Web (REST)   │  ← consultas
      └──────────────────────┘
```

## Relacionamentos

```
Configuration ──< Test >── Telemetry
                     │
                     ├── AiPrediction
                     │
                     └── MqttMessage (via processamento)

EnergySummary (independente, gerado por agregacao)
AiInteraction (independente, chat)
```
