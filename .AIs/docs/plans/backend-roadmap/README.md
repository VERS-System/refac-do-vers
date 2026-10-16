<!-- Índice operacional das fases de desenvolvimento do backend VERS. -->

# Roadmap executável do backend VERS

Este diretório separa o desenvolvimento do backend em fases detalhadas. O
[roadmap estratégico](../backend-mqtt-roadmap.md) continua definindo escopo e
arquitetura; estes documentos definem como executar cada fase.

## Ordem e estado

| Fase | Documento | Estado | Dependência principal |
| --- | --- | --- | --- |
| 00 | [Baseline](00-baseline.md) | Concluída | — |
| 01 | [Contratos da API](01-contratos-api.md) | Concluída | Fase 00 |
| 02 | [Schema e migrations](02-schema-migrations.md) | Concluída | Fase 01 |
| 03 | [APIs e rotas](03-apis-rotas.md) | Concluída | Fase 02 |
| 04 | [Autenticação e autorização](04-autenticacao-autorizacao.md) | Concluída — revisão e PR confirmados pelo programador em 06/10/2026 | Fase 03 |
| 05 | [Recursos de domínio](05-recursos-dominio.md) | Recorte executável concluído — avanço aprovado em 13/10/2026; pendências reais preservadas | Fase 04 |
| 06 | [Dados, analytics e fixtures](06-dados-analytics-fixtures.md) | Recorte local pronto para revisão — lotes 6.1–6.8 entregues; aceite e ensaio PostgreSQL pendentes | Fase 05 |
| 07 | [Ingestão MQTT](07-ingestao-mqtt.md) | Recortes 7.1–7.7 entregues para revisão; PostgreSQL e broker TLS locais ensaiados, HiveMQ/ESP32 pendentes | Fase 06 + hardware/simulador |
| 08 | [Tempo real](08-tempo-real.md) | Até 8.6 local e primeiro ensaio real 8.7 para revisão; coordenação MQTT real/integração cliente pendentes | Fase 07 |
| 09 | [Operação e entrega](09-operacao-entrega.md) | Planejada | Fases 00–08 |

```text
F00 → F01 → F02 → F03 → F04 → F05 → F06
                                      └─ Marco MQTT → F07 → F08 → F09
```

## Regras de execução

1. Cada fase exige aprovação antes de alterar código.
2. Decisões abertas são respondidas pelo programador e registradas no documento.
3. Testes são escritos e executados antes da implementação correspondente.
4. Cada etapa deve caber em uma revisão pequena; commits são feitos pelo programador.
5. Nenhuma fase aplica migrations, acessa serviços externos ou altera dados sem
   autorização específica.
6. `.env` nunca é acessado; somente `.env.example` pode ser consultado.
7. Fase concluída exige testes, lint, build, documentação e contexto diário.

## Arquitetura do MVP

O MVP mantém REST, MQTT, processamento e WebSocket como módulos internos do
`services/backend`. Prisma/PostgreSQL é a fonte histórica; Redis é Pub/Sub e
cache reconstruível. Extração para processos independentes exige decisão
arquitetural baseada em carga, disponibilidade ou isolamento de falhas.

## Fontes detalhadas

- [Contratos iniciais da Fase 1](../backend-api-contracts-phase-1.md)
- [Plano seguro da Fase 2](../backend-schema-phase-2.md)
- [Plano executável da Fase 2](../backend-schema-phase-2-execution-roadmap.md)
- [Plano executável da Fase 3](../backend-phase-3-execution-roadmap.md)
- [Plano executável da Fase 4](../backend-phase-4-execution-roadmap.md)
- [Plano executável da Fase 5](../backend-phase-5-execution-roadmap.md)
- [Plano executável da Fase 6 — em andamento](../backend-phase-6-execution-roadmap.md)
- [Fechamento local e matriz de revisão da Fase 6](../backend-phase-6-closure-13-10-2026.md)
- [Plano executável da Fase 7 — recortes locais para revisão](../backend-phase-7-execution-roadmap.md)
- [Ensaio isolado F07.7 — autorização, comandos e evidências](../backend-phase-7-rehearsal.md)
- [Plano executável da Fase 8](../backend-phase-8-execution-roadmap.md)
- [Coordenação de pausa e retomada F08.3.1](../backend-phase-8-ingestion-coordination.md)
- [Ponte de avisos pós-commit F08.3.2](../backend-phase-8-notification-bridge.md)
- [Sessão e autorização F08.4](../backend-phase-8-session-authorization.md)
- [Gateway Socket.IO F08.5](../backend-phase-8-socket-gateway.md)
- [Consistência e recuperação F08.6](../backend-phase-8-consistency.md)
- [Ensaio isolado F08.7 — seis cenários reais aprovados](../backend-phase-8-rehearsal.md)
- [Contrato incremental de tempo real v1](../../Api/realtime-contract-v1.md)
- [Contrato MQTT v1 local do simulador](../../Api/mqtt-contract-v1.md)
- [Schema v2 proposto](../schema-mobile-mqtt.md)
- [Roadmap estratégico de Backend e MQTT](../backend-mqtt-roadmap.md)
