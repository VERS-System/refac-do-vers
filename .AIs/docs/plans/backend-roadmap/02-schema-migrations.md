<!-- Fase 02 do roadmap executável do backend VERS. -->

# Fase 02 — Schema Prisma e migrations

## Objetivo

Criar um modelo íntegro e uma primeira migration versionada sem destruir o
estado legado do Neon.

## Fonte detalhada

O plano técnico completo é
[backend-schema-phase-2.md](../backend-schema-phase-2.md). O
[baseline local do lote 1](../backend-schema-phase-2-lot1-baseline.md) foi
registrado em 22/09/2026, após a conclusão dos contratos da Fase 01. Nenhuma
alteração em `schema.prisma` ou no Neon foi realizada por esse inventário.

O [plano executável completo](../backend-schema-phase-2-execution-roadmap.md)
divide a Fase 02 em 11 lotes, com implementação e validação de cada entrega.

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
- comparar com o inventário real do Neon antes da aplicação; o programador
  dispensou um novo ensaio local da migration.

## Etapa E — Cutover e contract posterior

- aplicar constraints depois de validar os dados;
- trocar consumidores de forma observável;
- remover as sete tabelas legadas conhecidas na primeira migration, como
  autorizado; migrations seguintes preservam os dados existentes;
- preparar backup e procedimento de retorno antes da aplicação.

## Saída

Schema revisado, migration segura e Prisma Client gerado, sem aplicação remota
automática.
