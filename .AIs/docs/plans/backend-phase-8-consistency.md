<!-- Define o recorte de consistência F08.6 sem introduzir consumidor sem integração. -->
# F08.6 — Consistência e recuperação por REST

> Atualização de 19/10/2026: a pendência histórica de aviso de recálculo TEST
> abaixo foi tratada no [lote independente](backend-phase-8-test-summary-notification.md).
> Encerramento REST continua sem recálculo imediato; consumidor frontend segue
> pendente. Ensaio F08.7 foi executado em 16/10, conforme contexto desse dia.

## Escopo autorizado — 15/10/2026

Pedido de desenvolvimento após F08.5 autoriza este próximo recorte do backend.
O contrato v1 já escolhe invalidação por recurso e reconciliação pelo REST.
Conferidos gateway, testes, roadmap e contexto; árvore Git inicialmente limpa.
Não criar cliente abstrato ou integrar dashboard/mobile neste lote.

Arquivos: este plano, realtime.gateway.spec.ts, Api/realtime-contract-v1.md,
backend-phase-8-execution-roadmap.md, backend-roadmap/README.md, docs/README.md
e contexts/Context_15_10_2026.md. Código executável só muda se uma regressão
demonstrar quebra do contrato existente; nesse caso registrar a causa aqui.

## Verificação e entrega

1. Acrescentar testes de contrato ao gateway existente: duplicatas e horário
   anterior não descartam invalidações; reconexão só entrega após nova assinatura.
2. Documentar cenários de snapshot/aviso concorrente, perda, reconexão e troca
   de recurso, com resultados esperados e limites das evidências.
3. Executar testes unitários, lint, build e git diff --check. Como não há nova
   funcionalidade prevista, os testes podem passar sem alteração de produção;
   não inventar RED nem mudar código apenas para produzir implementação.
4. Atualizar índices e contexto. Sem mudança de runtime não há rebuild Docker.

## Critérios e limites

ACK antecede snapshot; aviso durante consulta exige nova busca ao concluir.
Duplicatas não são deltas, occurredAt não é cursor e leitura tardia invalida
também filtros históricos. Reconexão exige subscribe/ACK e snapshot novos.
Consulta antiga não deve sobrescrever tela de outro recurso ou sessão.

Os testes deste lote verificam comportamento do gateway com sockets sintéticos.
Não demonstram o consumidor REST do frontend, SQL/Redis/Socket.IO reais ou
snapshot atômico entre páginas. F08.7 exige autorização própria do ambiente.
Recálculo de TEST sem mensagem MQTT permanece sem aviso; o cliente precisa
refazer REST após a mutação e ao reabrir/reconectar, sem prometer atualização
espontânea a outros observadores. Implementação dessa origem é pendência.

## Evidências

Dois testes novos passaram no gateway existente, sem alteração de produção.
Verificação dirigida: 20 testes. Suíte completa: 46 suítes/942 testes aprovados.
Lint e build aprovados. Não houve ciclo RED/GREEN: este recorte fixa cobertura
de comportamento existente, sem funcionalidade nova. Docker não reconstruído.
Contrato, índices e contexto atualizados; diff --check aprovado.
Recorte documental e de testes entregue para revisão; integração do consumidor
e ensaio real permanecem pendentes, sem declarar a fase inteira concluída.
