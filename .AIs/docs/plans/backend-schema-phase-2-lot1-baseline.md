<!-- Inventário local e plano do primeiro lote da Fase 02 do backend VERS. -->

# Fase 02 — lote 1: baseline local do schema

## Objetivo e limite

Conferir o estado versionado do banco antes de escrever testes estruturais ou
alterar `schema.prisma`. Este lote é somente de documentação e validação local.
Nenhuma conexão com Neon, migration ou dado remoto foi modificada.

## Estado verificado em 22/09/2026

- `services/backend/prisma/schema.prisma` contém sete modelos experimentais:
  `Configuration`, `Test`, `Telemetry`, `EnergySummary`, `MqttMessage`,
  `AiInteraction` e `AiPrediction`.
- `services/backend/prisma/migrations/` existe e está vazio. Não há baseline
  versionado da estrutura possivelmente criada antes por `prisma db push`.
- O schema local passa em `pnpm --filter @vers/backend prisma:validate` com uma
  URL PostgreSQL fictícia fornecida somente ao processo. Nenhum arquivo `.env`
  foi lido e a validação não acessou o banco.
- O schema atual não possui `User`, `Vehicle`, `UserVehicle`, instalação,
  dispositivo ou refresh session. Usa strings livres para terreno/estado,
  mistura medições e agregados em `Test`, guarda energia por hora em JSON e
  representa processamento MQTT com booleano. Não implementa o contrato de
  lotes nem a exclusão de veículo com snapshot histórico.
- Os contratos da Fase 01 estão concluídos em `packages/shared-types` e
  `.AIs/docs/Api/`. Eles são a referência pública da nova modelagem.

## Decisões já fechadas para o schema novo

- Neon compartilhado de desenvolvimento, com dados fictícios de baixa
  sensibilidade. O legado pode ser descartado **somente na primeira troca**;
  migrations seguintes preservam dados.
- Email sem distinção de caixa por `citext`.
- Papéis globais `USER` e `ADMIN` associados ao usuário. A modelagem inicial
  usa `UserRoleAssignment` com enum de papel; não precisa de tabela `Role`
  separada nem de `TECHNICIAN`.
- `AuthIdentity` e login Google ficam adiados.
- No máximo um ESP32 ativo por veículo. Mensagem MQTT de telemetria contém
  várias amostras, com frequência e tamanho do lote definidos no firmware.
- O histórico do teste preserva modelo, local informado, quantidade de piezos
  e condições experimentais sem placa ou outro identificador específico.
  Peso durante o teste é informado ou medido.
- Não há rotina de limpeza periódica automática no MVP.

## Cardinalidade e exclusão decididas

`UserVehicle` permite mais de uma conta por veículo. Ao excluir pela conta
atual, remover somente seu vínculo. O registro `Vehicle` e seus identificadores
continuam disponíveis às demais contas vinculadas. Se a transação remover o
último vínculo ativo, remover também o veículo e seus identificadores. O
histórico experimental permanece com snapshot sem placa. A verificação da
contagem de vínculos, remoção e eventual promoção de principal precisam ser
atômicas e cobertas por teste de concorrência.

## Próximos lotes revisáveis

1. Testes estruturais das invariantes e dos contratos da Fase 01, inicialmente
   falhando contra o schema experimental.
2. Identidade, papéis e sessões.
3. Veículos, vínculos e exclusão com preservação do histórico.
4. Instalações, dispositivos e configurações versionadas.
5. Testes experimentais e snapshots.
6. Mensagens MQTT e telemetria em relação 1:N.
7. Resumos, suporte e auditoria.
8. SQL da primeira migration gerado e revisado em banco isolado.

Cada lote terá testes antes da implementação, validação própria e revisão do
programador antes do seguinte. Os commits serão feitos pelo programador.

## Antes de qualquer aplicação ao Neon

Inventariar estrutura, índices e volumes do banco compartilhado sem expor
registros; combinar janela sem gravações da equipe; preparar backup e ensaiar
restauração; escolher e ensaiar o procedimento da primeira troca em PostgreSQL
isolado. Descarte do legado foi autorizado como decisão de produto, mas não
autoriza executar comandos remotos nesta etapa. Uma migration posterior nunca
deve repetir o descarte inicial.
