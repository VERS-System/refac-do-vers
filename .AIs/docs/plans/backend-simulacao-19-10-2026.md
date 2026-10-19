<!-- Registra a decisão de continuidade do backend com dados exclusivamente simulados. -->
# Continuidade do backend com simulação — 19/10/2026

## Decisão do programador

Em 19/10/2026, o programador informou o cancelamento da integração com o
sistema elétrico e definiu que os dados serão simulados. ESP32, sensores,
calibração física e integração elétrica deixam de ser requisitos de entrega.
As referências anteriores a essas integrações ficam como histórico.

## Impacto nas fases

- F06: cálculos continuam operando sobre dados sintéticos, sem alegar medição
  física, eficiência comprovada ou economia real. O ensaio F07 de 14/10 já
  executou 9 suítes/33 testes PostgreSQL, incluindo concorrência e rollback;
  isso corrige o status antigo da F06. Tarifa e aceite final seguem separados.
- F07: o simulador MQTT existente passa a representar a origem das leituras.
  Preservar validação, TLS, identidade, idempotência e persistência. ESP32 deixa
  de ser bloqueio; HiveMQ externo não é necessário para comprovar o caminho
  local já ensaiado. A escolha do broker de implantação permanece aberta.
- F08: preservar os ensaios locais de MQTT/TLS, PostgreSQL, Redis e Socket.IO
  registrados em 16/10. Integração dos clientes, recuperação REST e limites
  conhecidos continuam pendentes; a mudança não encerra a fase automaticamente.
- F09: demonstração usa exclusivamente dados sintéticos. CI, configuração,
  observabilidade, backup/restauração e runbooks continuam necessários.

## Próximo recorte

Conferência inicial confirmou os 33 testes PostgreSQL no fechamento F07.7,
sem necessidade de repetir o ensaio apenas pelo status antigo da F06.
Na F08 permanece integração dos clientes. Aviso de recálculo TEST sem MQTT
implementado no [lote de 19/10](backend-phase-8-test-summary-notification.md),
preservando emissão pós-commit, autorização por recurso e falha de notificação
sem desfazer persistência. Ativação operacional ainda precisa de recorte próprio.
Depois preparar operação
reproduzível do simulador e backend para demonstração, reutilizando os scripts
existentes. Qualquer alteração funcional terá plano específico, TDD e validação
de test:unit, lint e build. Nenhuma autorização de serviços externos ou escrita
em banco é inferida desta decisão de escopo.

## Limites

Dados e resultados devem ser apresentados como simulados. Não remover código
de hardware nem reestruturar serviços como efeito desta decisão documental.
Os planos detalhados anteriores devem ser lidos com esta atualização de escopo.
