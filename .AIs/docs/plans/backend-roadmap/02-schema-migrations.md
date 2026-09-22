<!-- Fase 02 do roadmap executável do backend VERS. -->

# Fase 02 — Schema Prisma e migrations

## Objetivo

Criar um modelo íntegro e uma primeira migration versionada sem destruir o
estado legado do Neon.

## Fonte detalhada

O plano técnico completo é
[backend-schema-phase-2.md](../backend-schema-phase-2.md). As decisões de
modelagem foram registradas em 22/09/2026. A implementação ainda depende dos
contratos restantes da Fase 01; nenhuma alteração em `schema.prisma` ou no
Neon foi realizada por este registro.

## Etapa A — Inventário e decisões

- confirmar o estado do Neon compartilhado de desenvolvimento; o legado
  fictício pode ser descartado na primeira troca, mas migrations seguintes
  preservam os dados;
- inventariar schema e índices do Neon em ambiente autorizado;
- detalhar a exclusão de veículo com remoção de identificadores e preservação
  dos snapshots dos testes;
- aplicar `citext`, papéis associados, um ESP32 ativo por veículo e mensagens
  MQTT com lotes de amostras;
- definir backup, restauração e rollback.

## Etapa B — Testes estruturais

- testar models, enums, relações e deleções esperadas;
- testar unicidade de email e placa;
- testar um único veículo principal por usuário quando houver vínculos ativos;
- testar ausência de senha/token puro, de placa no histórico e de cascatas que
  apaguem testes ou telemetria.

## Etapa C — Modelagem por domínio

1. usuários, papéis e sessões;
2. veículos e `UserVehicle`;
3. instalações, dispositivos e configurações;
4. testes experimentais;
5. MQTT e telemetria;
6. resumos, suporte e auditoria.

## Etapa D — Primeira migration versionada

- gerar SQL sem aplicar ao Neon;
- revisar remoção do legado autorizada para a primeira troca, `citext`, locks,
  constraints e índices parciais;
- validar em PostgreSQL isolado vazio;
- ensaiar contra estado representativo do legado fictício.

## Etapa E — Cutover e contract posterior

- aplicar constraints depois de validar os dados;
- trocar consumidores de forma observável;
- remover estruturas antigas somente em migration posterior;
- ensaiar rollback antes do deploy.

## Saída

Schema revisado, migration segura e Prisma Client gerado, sem aplicação remota
automática.
