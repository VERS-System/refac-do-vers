<!-- Planeja aviso pós-commit de recálculo TEST independente do MQTT. -->
# F08 — Aviso de recálculo TEST sem MQTT

## Escopo autorizado em 19/10/2026

Programador autorizou o próximo lote. EnergySummaryService.recomputeTest é
chamado diretamente pela recuperação e pelos testes; dentro de recomputeMessage
recebe a transação MQTT, cujo commit já tem evento próprio. Não alterar os
chamadores para emitir antes do commit nem iniciar consumidores automaticamente.

Arquivos: energy-summary.service.ts/spec.ts, realtime-notification.service.ts/
spec.ts, realtime.module.ts, test/realtime/realtime-rehearsal.e2e-spec.ts,
contrato de tempo real, índices e planos F08/simulação e contexto diário.

## Implementação e verificação

1. TDD: evento somente após a transação própria resolver; rollback não emite;
   transação fornecida pelo caller não emite; remoção de resumo também invalida;
   listener com erro não altera resultado nem bloqueia os seguintes.
2. Serviço de resumos expõe EventEmitter interno passivo, com evento versionado
   summary.test-recomputed e IDs do teste/instalação reconsultados sob lock.
   Evento significa recálculo confirmado, não necessariamente valor diferente.
3. Ponte existente assina evento no start explícito e remove no shutdown.
   Valida metadata, publica data.updated para teste e instalação não nula,
   contém erros e aguarda tarefas. Gateway mantém autorização por destinatário.
4. Reutilizar DataModule para injetar a mesma instância em RealtimeModule;
   atualizar construções manuais. Sem novas dependências/schema/rotas.
5. Executar test:unit, lint, build e verificação de tipos dos testes; rebuild
   somente backend quando Docker disponível. Nenhum ensaio em banco externo.

## Limites

Encerramento REST não passa a recalcular automaticamente: recuperação existente
continua sendo responsável pelo recálculo. Não criar scheduler ou autostart.
Evento pode ser perdido após commit, durante parada ou queda Redis; recuperação
é REST, sem outbox/replay. Recálculo dentro de transação fornecida continua sob
responsabilidade do caller pós-commit (MQTT já cobre esse caminho).

## Evidências locais

RED: suíte de resumos falhou por ausência de events em EnergySummaryService.
GREEN: 46 suítes/956 testes aprovados, 14 novos cobrindo commit adiado,
rollback após escrita, transação externa, teste em execução, remoção sem delta,
listener sync/async/once, IDs atuais e instalação nula, validação do evento,
falha Redis e shutdown. Dois serviços reais testados em suas respectivas
suítes com persistência/transporte simulados; não alegar novo ensaio SQL/rede.

Lint, build, TypeScript noEmit incluindo testes e git diff --check aprovados.
pnpm.ps1 bloqueado pela política PowerShell; pnpm.cmd tentou auto-instalação e
abortou sem TTY. Scripts existentes executados via npm.cmd, sem instalar ou
atualizar dependências. Lockfile e manifests preservados.

Docker consultado fora do sandbox após bloqueio de acesso ao pipe. Somente
containers ExecutivoX ativos; nenhum VERS em execução. Rebuild isolado da imagem
vers-backend:summary-notification concluído, imagem
2ab6e37ab6188b5e77998c406f41554a68e9eca34443f20a35aa4530ea4f2af0.
Compilação dentro do Docker aprovada; cópia/exportação demoradas, sem erro.
Stack VERS mantida parada, sem smoke de runtime ou reinício de outros serviços.
