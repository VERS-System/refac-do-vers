<!-- Fase 09 do roadmap executável do backend VERS. -->

# Fase 09 — Operação, segurança e entrega

> **Decisão de 19/10/2026:** CI/CD e GitHub Actions fora do escopo por decisão
> do programador. Workflow proposto removido; verificações continuam locais e
> entrega permanece manual. [Histórico da decisão](../backend-phase-9-ci-quality.md).
> Integração, migrations, auditorias e operação continuam pendentes.

## Objetivo

Tornar o backend reproduzível, implantável, observável e recuperável.

## Etapa A — Testes ponta a ponta

[Recorte integrado do backend](../backend-phase-9-integrated-flow.md) aprovado
em 19/10/2026: login HTTP/CSRF/cookies, MQTT/TLS, persistência, aviso Socket.IO,
série/resumo REST, duplicata e recusa após retirada do vínculo. Continuação com
3/3 cenários aprovados também cria veículo e planeja/inicia/encerra teste pela
API, validando snapshots, CSRF e transições repetidas; recebe telemetria após
encerramento no mesmo teste. Conta ativa, instalação/configuração/dispositivo
continuam fixtures; cliente Electron e operação contínua permanecem pendentes.
Não equivale ao fechamento desta etapa.

- usuário cria sessão, veículo, instalação e teste;
- dispositivo autorizado envia telemetria;
- backend persiste, calcula e publica atualização;
- REST retorna série e resumo coerentes;
- duplicata não duplica energia;
- usuário sem vínculo não acessa dados.

## Etapa B — Validação local

Executar pelo programador ou pela IA no ambiente autorizado, sem GitHub Actions
ou pipeline de CI/CD obrigatório.

- instalação com lockfile congelado;
- `test:unit`, integração, lint e build;
- Prisma validate, generate e verificação de migrations;
- OpenAPI e shared types alinhados;
- secret scanning e auditoria de dependências.

## Etapa C — Entrega manual e migrations

[Ensaio local de migration e recuperação](../backend-phase-9-backup-rehearsal.md)
aprovado em 19/10/2026: deploy repetível, dump/restore e comparação completa de
schema/dados sintéticos. Guarda de backups e recuperação remota seguem pendentes.

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

Primeiro recorte: [início local e demonstração simulada](../backend-phase-9-local-start.md),
com [guia de comandos do backend](../../../../services/backend/README.md).

- instalação local e configuração por `.env.example`;
- deploy, rollback, restauração e diagnóstico;
- carga de demonstração exclusivamente sintética;
- matriz de versões e dependências externas;
- limitações conhecidas e decisões futuras.

## Critério final

Um ambiente limpo pode ser construído, testado, migrado, implantado,
monitorado e recuperado apenas com artefatos versionados e documentação.
