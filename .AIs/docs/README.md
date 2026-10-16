<!-- Guia de navegação e convenções para a documentação técnica do VERS. -->

# Documentação técnica — VERS

Este diretório concentra a documentação do **VERS (Vibration Energy Recovery System)**, um projeto acadêmico para estudar a recuperação de uma parcela da energia mecânica das vibrações veiculares por meio de materiais piezoelétricos.

## Documentos principais

| Documento                                                         | Finalidade                                                               |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------ |
| [01 — Visão geral](01_visao-geral-vers.md)                        | Contexto, objetivo, escopo e funcionamento do projeto.                   |
| [02 — Arquitetura](02_arquitetura-do-sistema.md)                  | Componentes físicos, fluxo de energia, telemetria e fronteiras técnicas. |
| [03 — Dados e indicadores](03_dados-e-indicadores.md)             | Informações de testes, métricas e modelo conceitual de armazenamento.    |
| [04 — Infraestrutura](04-infraestrutura.md)                       | Docker, variáveis de ambiente, core backend e fluxo de dados.           |
| [Contratos REST](Api/endpoints.md)                                 | Rotas, regras de acesso, estados e erros da API.                        |
| [OpenAPI 3.1](Api/openapi.yaml)                                     | Especificação dos contratos REST.                                       |
| [Roadmap MQTT/ESP32](plans/mqtt-esp-roadmap/README.md)            | Firmware, sensores, contrato MQTT, conectividade e testes do ESP32.     |
| [Roadmap do dashboard web](plans/desktop-roadmap/README.md)       | Telas, navegação, estados visuais e entrega do dashboard Vite.          |
| [Migração do dashboard web](plans/dashboard-vite-sem-electron-26-09-2026.md) | Plano e verificação da retirada do empacotamento nativo. |
| [Roadmap do core](plans/core-roadmap.md)                          | Fases, dependências, critérios de aceite e ordem de implementação.      |
| [Roadmap do frontend desktop](plans/desktop-frontend-roadmap.md)  | Fases para implementar em React as telas desktop desenhadas no Stitch.  |
| [Roadmap de Backend e MQTT](plans/backend-mqtt-roadmap.md)        | Fonte de verdade para ingestão, tratamento, APIs e segurança do backend. |
| [Baseline do backend](plans/backend-baseline-03-09-2026.md)       | Estado verificado antes da implementação das APIs.                       |
| [Schema v2 — Mobile e MQTT](plans/schema-mobile-mqtt.md)          | Variáveis, entidades, payload e decisões abertas do novo schema.       |
| [Fase 2 — Schema e migration](plans/backend-schema-phase-2.md)    | Plano seguro do banco, reconciliação, testes e pequenos commits.       |
| [Fase 2 — baseline local](plans/backend-schema-phase-2-lot1-baseline.md) | Inventário do schema versionado e próximos lotes revisáveis. |
| [Fase 2 — plano executável](plans/backend-schema-phase-2-execution-roadmap.md) | Doze lotes de modelagem, migration e validação do banco. |
| [Dicionário de dados](plans/backend-schema-phase-2-data-dictionary.md) | Tabelas, campos, unidades e restrições do schema inicial. |
| [Runbook do banco](plans/backend-schema-phase-2-runbook.md) | Validação, aplicação e retorno de migrations. |
| [Fase 3 — plano executável](plans/backend-phase-3-execution-roadmap.md) | Nove lotes da fundação REST, validação, observabilidade e saúde. |
| [Plano da issue LUC-28](plans/LUC-28-backend-f03-fundacao-apis-rotas.md) | Escopo e execução do pull da fundação REST. |
| [Revisão do pull da Fase 3](problems/backend-f03-review-24-09-2026.md) | Aderência aos lotes e problemas identificados. |
| [Roadmap executável do backend](plans/backend-roadmap/README.md)  | Fases detalhadas do backend, dependências, etapas e critérios de saída. |
| [Fechamento local da F06](plans/backend-phase-6-closure-13-10-2026.md) | Matriz de evidências, ensaio de 10 mil amostras e pendências reais para revisão. |
| [Ensaio isolado F07.7](plans/backend-phase-7-rehearsal.md) | Autorização, isolamento e resultados reais de ingestão com PostgreSQL e broker TLS locais. |
| [Plano executável F08](plans/backend-phase-8-execution-roadmap.md) | Lotes de eventos internos, Redis, autorização e Socket.IO. |
| [Contrato de tempo real v1](Api/realtime-contract-v1.md) | Evento interno pós-commit e limites de entrega/recuperação. |
| [Roadmap de telas do mobile](plans/mobile-roadmap/README.md)      | Tasks por tela, navegação, estados visuais e encaixe com o backend.     |

## Organização

- `contexts/`: registros resumidos de cada sessão de trabalho com IA.
- `plans/`: planos aprovados para evolução do projeto.
- `problems/`: problemas identificados, causas, impactos e soluções.

## Convenções

- Informações confirmadas pelo escopo do TCC são descritas como requisitos ou definições do projeto.
- Decisões ainda não validadas em protótipo são identificadas como **propostas** ou **a validar**.
- Novos documentos devem ser escritos em português e vinculados a partir deste guia ou do índice principal.
