<!-- Plano documental para retirar o diagnóstico do veículo do escopo de entrega do VERS. -->

# Remoção do diagnóstico do veículo

## Objetivo

Retirar do escopo planejado a tela e a API de diagnóstico do veículo, pois essa
funcionalidade não será entregue no prazo atual do projeto.

## Alterações

- remover a feature e seus atalhos do levantamento do aplicativo mobile;
- remover o diagnóstico do veículo das APIs e da integração dos clientes no
  roadmap geral;
- remover `DiagnosticSnapshot` da proposta de schema e do mapeamento das
  features;
- preservar registros históricos e usos técnicos de diagnóstico relacionados
  à operação, telemetria e depuração do sistema.

## Critério de conclusão

A documentação ativa não deve apresentar o diagnóstico do veículo como feature
planejada, entidade de domínio ou API a ser entregue.
