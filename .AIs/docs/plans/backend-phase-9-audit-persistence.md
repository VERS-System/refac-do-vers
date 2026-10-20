<!-- Planeja corrigir incompatibilidade entre códigos da auditoria e restrição SQL. -->
# F09 — Persistência real da auditoria

## Escopo e diagnóstico

Continuidade NXT autorizada. AuditWriterService persiste auth.login/session,
mas audit_events_codes_valid permite somente códigos maiúsculos. Reproduzir
primeiro com assert de login HTTP e teste PostgreSQL usando gravador real.
Falha de auditoria continua sem bloquear autenticação conforme decisão F04.

Criar migration nova, sem editar a inicial, aceitando códigos legados maiúsculos
e códigos atuais da allowlist da aplicação. Preservar limpeza de identificadores
nos gatilhos para tipos atuais e legados. Sincronizar summaries-support.sql usado
na preparação de testes. Sem novas tabelas, colunas, dependências ou endpoints.

Arquivos: migration nova, manual-constraints/summaries-support.sql, teste DB
novo, assert na suíte bootstrap, este plano, roadmap/runbook e contexto. Não
alterar código de autenticação sem falha adicional demonstrada. Preservar staging
do programador; não commit/push.

## Verificação e operação

RED real antes da migration. GREEN PostgreSQL: códigos atuais/legados aceitos,
códigos inválidos recusados, gatilhos limpam referências nos dois formatos.
Login HTTP deve produzir uma linha mínima correlacionada sem dados sensíveis.
Executar unitários, lint, build e tipos. Bancada local já autorizada, com aviso
prévio Docker, inventário/portas e limpeza por IDs; preservar demais sistemas.
Conferir histórico Prisma antes de deploy. Se bancada tiver schema sem histórico,
não inventar baseline: testar migration em PostgreSQL descartável separado ou
aplicar SQL de ensaio explicitamente e registrar limite. Neon não autorizado.

Migration relaxa somente restrição de códigos e troca funções de limpeza; não
reescreve eventos. Reversão exigiria tratar códigos novos antes de restaurar
restrição antiga. Guarda/retencão de auditoria não entra neste recorte.

## Impacto operacional

ALTER TABLE valida eventos existentes e exige lock de tabela; duração depende
do volume e não foi medida em produção. Deploy remoto exige janela e ponto de
retorno conforme runbook. Não remover eventos para reverter: preferir correção
adiante ou restauração autorizada se necessário. A migration inicial permanece
imutável. O gravador e o contrato HTTP não mudam; serviços que já gravam códigos
maiúsculos continuam compatíveis. Falha de gravação continua sem bloquear auth.

## Resultado local — 19/10/2026

RED PostgreSQL: gravador real e primeiro evento atual recusados por
audit_events_codes_valid; 2 falhas/2 casos de rejeição aprovados. Após aplicar
SQL novo somente no vers_test da bancada, GREEN 4/4, e regressão relacionada
audit/summaries-support/identity: 3 suítes/10 testes aprovados. Testes cobrem
persistência mínima, recusa de códigos livres e limpeza de user/vehicle atuais
e USER/VEHICLE legados com ator preservado até exclusão da conta.

Migration `20261020000100_audit_application_codes` criada sem mudar a inicial.
Banco temporário f09_audit_migration_20261020 criado na bancada, vazio: migrate
deploy aplicou ambas as migrations, repetição sem pendências, histórico e
constraint conferidos. Prisma confirmou ausência de carregamento de arquivos
de ambiente. Banco temporário descartado ao fim. Bancada vers_test sem histórico
recebeu SQL de ensaio, sem resolver/baseline artificial do Prisma.

Assert de login HTTP valida exatamente um evento auth.login/session/SUCCESS
correlacionado, com actorId/resourceId nulos, antes da limpeza. Primeira tentativa
real: 3/4 aprovados, último filho encerrou durante build paralelo sobre dist;
causa provável é corrida de execução, não diagnosticada pelo stdio ignorado.
Build concluído antes de repetir: 4/4 cenários reais aprovados em 77,533 s,
incluindo recuperação de 60 s sem novo MQTT. Sem nova alteração de aplicação.

46 suítes/962 testes unitários, lint, build, TypeScript e diff --check aprovados.
SQL final: zero nas 12 tabelas de bancada usadas. Banco temporário removido,
bancada parada e volumes preservados. Sem .env, Neon, dependências ou commit/push.

Limites: não validada guarda/retencão de auditoria, todas as mutações de auth
contra SQL real, auditoria de domínio ou implantação remota. A correção precisa
ser aplicada por migration no ambiente de uso; autenticação seguirá funcionando
sem auditoria persistida em bancos que conservarem apenas a constraint antiga.
