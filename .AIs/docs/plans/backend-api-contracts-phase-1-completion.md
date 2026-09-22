<!-- Plano para concluir os contratos REST da Fase 01 do backend VERS. -->

# Conclusão da Fase 01 — contratos REST

**Estado:** cinco lotes concluídos em 22/09/2026. Tipos, fixtures, documentação
humana e OpenAPI estão prontos para revisão do programador em pequenos commits.
Nenhum commit foi criado pela IA.

## Objetivo

Fechar os contratos públicos necessários antes do schema Prisma: instalações,
configurações, testes, telemetria, resumos e suporte. Alinhar veículos e papéis
às decisões registradas em 22/09/2026.

## Sequência TDD

1. Criar testes de compilação dos novos contratos e das restrições negativas.
2. Executar `pnpm --filter @vers/shared-types test:unit` e observar a falha por
   tipos/fixtures ainda inexistentes.
3. Implementar tipos, catálogo de erros, fixtures sintéticas e exportações.
4. Atualizar documentação humana e OpenAPI com as mesmas rotas e campos.
5. Executar testes, lint e build do pacote e as validações aplicáveis do backend.

## Lotes pequenos para revisão pelo programador

1. Corrigir papéis e exclusão de veículo nos tipos e documentos existentes.
2. Acrescentar contratos de instalações e configurações.
3. Acrescentar contratos do ciclo de vida dos testes.
4. Acrescentar consultas de telemetria e resumos.
5. Acrescentar solicitações de suporte e validar a Fase 01 completa.

Cada lote deve ficar isolado e validado antes de avançar. Os commits são feitos
pelo programador. O lote 1 não cria tipos dos domínios posteriores.

## Contratos planejados

- Instalações: listagem e detalhe autorizados, configuração versionada e
  dispositivo público sem credenciais.
- Testes: criação, consulta, listagem, início, conclusão e cancelamento; estados
  explícitos, instantes UTC, snapshot sem placa e filtros paginados.
- Telemetria: amostras classificadas, consulta por teste e intervalo UTC;
  indicadores e resumos por período com unidades.
- Suporte: abertura e acompanhamento de solicitações vinculadas ao usuário.
- Veículos: permitir exclusão do último veículo sem remover histórico e sem
  identificadores específicos nos snapshots. Papéis globais iniciais `USER` e
  `ADMIN`, com coexistência possível.

## Limites

Não implementar controllers, banco, MQTT funcional nem migrations nesta fase.
O contrato HTTP de telemetria consulta amostras já normalizadas; o envelope
MQTT por lote será finalizado com o firmware ESP32. Medidas sem fonte confiável
permanecem nulas. Todos os exemplos são fictícios.

## Critério de saída

Tipos públicos, fixtures, testes de compilação, documentação humana e OpenAPI
coerentes. `test:unit`, lint e build aprovados no pacote e no backend aplicável.
