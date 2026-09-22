<!-- Fase 02 do roadmap executável do backend VERS. -->

# Fase 02 — Schema Prisma e migrations

## Objetivo

Criar um modelo íntegro e uma primeira migration versionada sem destruir o
estado legado do Neon.

## Fonte detalhada

O plano técnico completo é
[backend-schema-phase-2.md](../backend-schema-phase-2.md). Nenhuma alteração em
`schema.prisma` começa antes da aprovação das decisões bloqueantes desse plano.

## Etapa A — Inventário e decisões

- confirmar dados que precisam ser preservados;
- inventariar schema e índices do Neon em ambiente autorizado;
- decidir exclusão lógica, retenção e normalização;
- fechar cardinalidades de dispositivo e mensagens MQTT;
- definir backup, restauração e rollback.

## Etapa B — Testes estruturais

- testar models, enums, relações e deleções esperadas;
- testar unicidade de email e placa;
- testar um único veículo principal por usuário;
- testar ausência de senha/token puro e cascatas destrutivas.

## Etapa C — Modelagem por domínio

1. usuários, papéis e sessões;
2. veículos e `UserVehicle`;
3. instalações, dispositivos e configurações;
4. testes experimentais;
5. MQTT e telemetria;
6. resumos, suporte e auditoria.

## Etapa D — Migration expand

- gerar SQL sem aplicar ao Neon;
- revisar locks, casts, backfill e índices parciais;
- validar em PostgreSQL isolado vazio;
- validar contra cópia sanitizada do estado legado.

## Etapa E — Cutover e contract posterior

- aplicar constraints depois do backfill;
- trocar consumidores de forma observável;
- remover estruturas antigas somente em migration posterior;
- ensaiar rollback antes do deploy.

## Saída

Schema revisado, migration segura e Prisma Client gerado, sem aplicação remota
automática.
