<!-- Fase 09 do roadmap executável do backend VERS. -->

# Fase 09 — Operação, segurança e entrega

## Objetivo

Tornar o backend reproduzível, implantável, observável e recuperável.

## Etapa A — Testes ponta a ponta

- usuário cria sessão, veículo, instalação e teste;
- dispositivo autorizado envia telemetria;
- backend persiste, calcula e publica atualização;
- REST retorna série e resumo coerentes;
- duplicata não duplica energia;
- usuário sem vínculo não acessa dados.

## Etapa B — CI

- instalação com lockfile congelado;
- `test:unit`, integração, lint e build;
- Prisma validate, generate e verificação de migrations;
- OpenAPI e shared types alinhados;
- secret scanning e auditoria de dependências.

## Etapa C — Deploy e migrations

- imagem Docker reproduzível e sem segredos;
- migrations aplicadas por etapa controlada;
- backup e restauração testados;
- rollout, smoke test e rollback documentados;
- nenhuma aplicação automática destrutiva no Neon.

## Etapa D — Observabilidade

- logs estruturados e redaction;
- métricas REST, MQTT, banco, Redis e WebSocket;
- latência entre captura, recepção e processamento;
- alertas para indisponibilidade, rejeição e atraso anormais;
- IDs de correlação ponta a ponta.

## Etapa E — Dados e privacidade

- políticas executáveis de retenção e descarte;
- acesso mínimo a banco, logs e backups;
- exportação/correção/eliminação quando aplicáveis;
- runbook de incidente sem exposição de dados;
- decisões jurídicas registradas pelo responsável, não inferidas pelo código.

## Etapa F — Runbooks e demonstração

- instalação local e configuração por `.env.example`;
- deploy, rollback, restauração e diagnóstico;
- carga de demonstração exclusivamente sintética;
- matriz de versões e dependências externas;
- limitações conhecidas e decisões futuras.

## Critério final

Um ambiente limpo pode ser construído, testado, migrado, implantado,
monitorado e recuperado apenas com artefatos versionados e documentação.
