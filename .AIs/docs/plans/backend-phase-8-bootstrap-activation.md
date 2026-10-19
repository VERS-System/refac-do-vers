<!-- Planeja início opt-in do coordenador existente no bootstrap do backend. -->
# F08 — Ativação controlada no bootstrap

## Escopo autorizado em 19/10/2026

Programador autorizou continuidade após aviso de recálculo TEST. Reutilizar
MQTT_ENABLED, já booleano validado com padrão false: false mantém REST e
transporte passivo; true inicia RealtimeIngestionService depois de app.listen.
Não criar segundo flag, serviço ou endpoint administrativo. Coordenador mantém
pausa por Redis, recuperação, backoff e encerramento existentes.

Arquivos: src/main.ts/spec.ts, .env.example raiz e backend, contrato MQTT,
roadmap/índices e contexto. Sem schema, dependência, dados ou destino novo.

## Verificação

TDD: padrão/desabilitado não resolve coordenador; habilitado só inicia após
listen resolver; falha de listen ou de início fecha aplicação e retorna erro
seguro; falha de fechamento não expõe causa original. Servidor não fica ativo
com inicialização síncrona parcialmente falha. Falhas assíncronas posteriores
continuam sob tratamento do coordenador, não bloqueiam REST.

Executar test:unit, lint, build e TypeScript noEmit incluindo testes. Não alterar
configuração real nem iniciar consumidores externos. Não executar Docker neste
lote sem avisar antes: programador informou outro sistema rodando em paralelo.
Primeiro validar localmente; qualquer ensaio real terá alvos isolados definidos.

## Limites

Habilitar MQTT_ENABLED passa a autorizar início efetivo do pipeline no próximo
bootstrap. A opção continua false nos exemplos e não é alterada no ambiente.
Tempo real acompanha a ativação da ingestão; este lote não cria modo independente
de WebSocket. Frontends e demonstração completa continuam separados.

## Evidências e entrega

RED: cinco casos novos falharam por ausência de ativação e de fechamento seguro.
GREEN: 46 suítes/961 testes aprovados, cinco novos no bootstrap. Cobertura usa
NestFactory/aplicação/coordenador simulados; não inicia HTTP, banco ou broker.
Lint, build e TypeScript noEmit incluindo testes aprovados. Scripts executados
via npm.cmd, com dependências existentes e sem instalação.

Exemplos raiz/backend preservam false e descrevem mudança de comportamento de
true. Contrato MQTT, roadmap, índices, infraestrutura e contexto atualizados.
Nenhum Docker consultado/executado após aviso do programador. Rebuild da imagem
e ensaio real do bootstrap permanecem pendentes antes de usar em container;
programador avisado dessa necessidade. Sem .env, destino externo, migration,
escrita de banco, frontend, commit ou push. F08 não encerrada.

Continuação: [preparação do ensaio do bootstrap real](backend-phase-8-bootstrap-rehearsal.md)
usa executável compilado e bancada existente. Execução aguarda autorização
específica para Docker e dados sintéticos; não depende de rebuild da imagem.

Execução autorizada e concluída em 19/10: dois cenários reais do bootstrap
aprovados conforme plano acima, incluindo fluxo TLS até resumo REST. Bancada
parada e dados removidos. A imagem de implantação não foi reconstruída neste
ensaio; somente executável dist local. Integração dos clientes permanece aberta.
