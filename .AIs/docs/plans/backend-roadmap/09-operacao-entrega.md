<!-- Fase 09 do roadmap executável do backend VERS. -->

# Fase 09 — Operação, segurança e entrega

> **20/10/2026 — concluída no recorte de demonstração local sintética escolhido
> pelo programador.** [Matriz de fechamento e limites](../backend-phase-9-closure-20-10-2026.md).
> 969 testes, audit produção backend zero, imagem/smoke e recuperação local
> verificados. Os itens de produção abaixo permanecem requisitos futuros;
> este fechamento não declara sua implementação nem integração Electron/API.

> **Decisão de 19/10/2026:** CI/CD e GitHub Actions fora do escopo por decisão
> do programador. Workflow proposto removido; verificações continuam locais e
> entrega permanece manual. [Histórico da decisão](../backend-phase-9-ci-quality.md).
> O histórico abaixo detalha as evidências acumuladas antes do fechamento local.

## Objetivo

Tornar o backend reproduzível, implantável, observável e recuperável.

Neste fechamento, o alvo é a demonstração local assistida com dados sintéticos.
As listas A–F preservam o escopo original; a matriz final define os limites
efetivamente aceitos para esse alvo, incluindo operação manual e fixtures.

## Etapa A — Testes ponta a ponta

[Recorte integrado do backend](../backend-phase-9-integrated-flow.md) aprovado
em 19/10/2026: login HTTP/CSRF/cookies, MQTT/TLS, persistência, aviso Socket.IO,
série/resumo REST, duplicata e recusa após retirada do vínculo. Continuação com
3/3 cenários aprovados também cria veículo e planeja/inicia/encerra teste pela
API, validando snapshots, CSRF e transições repetidas; recebe telemetria após
encerramento no mesmo teste. Conta ativa, instalação/configuração/dispositivo
continuam fixtures. Nova continuação com 4/4 cenários aprovados também recebe
lote durante RUNNING, encerra por HTTP e aguarda varredura real de 60 s criar
resumo e aviso Socket.IO sem novo MQTT. Cliente Electron e transmissão contínua
prolongada permanecem pendentes. Não equivale ao fechamento desta etapa.

- usuário cria sessão, veículo, instalação e teste;
- dispositivo autorizado envia telemetria;
- backend persiste, calcula e publica atualização;
- REST retorna série e resumo coerentes;
- duplicata não duplica energia;
- usuário sem vínculo não acessa dados.

## Etapa B — Validação local

[Validação de contratos/Prisma/dependências](../backend-phase-9-local-validation.md):
shared-types, Prisma validate/generate e build aprovados; 32 operações e 242
referências OpenAPI conferidas. Auditoria de produção reportou 34 advisories em
caminhos do backend (9 pacotes), ainda sem correção/alcance de exploração
validados. Secret scanning dedicado e instalação limpa congelada pendentes.

Em 20/10, [atualização isolada Joi](../backend-phase-9-joi-update.md) para 18.2.9
removeu seus quatro avisos, mantendo 30 nos caminhos do backend. Install
congelado sem scripts, 962 unitários, lint/build/tipos aprovados. Instalação
limpa e imagem rebuildada não comprovadas; demais pacotes permanecem pendentes.

Ainda em 20/10, [patches transitivos HTTP/Socket.IO](../backend-phase-9-http-socket-dependencies.md)
removeram quatro avisos de engine.io/proxy-addr/qs sem atualizar pais ou criar
overrides. Backend ficou com 26 avisos; 964 unitários, lint/build/tipos e oito
cenários reais passaram. Demais pacotes, imagem de uso e operação pendentes.

[Transitivas restantes — primeiro lote](../backend-phase-9-transitive-dependencies-20-10-2026.md):
ip-address10.7.4 e brace-expansion1.1.21 dentro das faixas dos pais reduziram
26→18 avisos backend.964 unitários, lint/build/tipos e imagem Linux nova
aprovados, sem deploy. Após o programador fechar Electron, instalação congelada
geral e binários restaurados; tipos dashboard/mobile aprovados. Tar, deepmerge-ts e Multer
permanecem pendentes, sem alegar auditoria aprovada ou encerramento da F09.

[Nest11/Multer — 20/10](../backend-phase-9-nest-multer-20-10-2026.md): seis
pacotes Nest alinhados11.2.7, Multer2.4.0, Express/Socket.IO preservados.
Audit18→13, zero avisos Multer;964 unitários, lint/build/tipos, instalação
congelada, imagem Linux nova e oito cenários reais aprovados. Bancada limpa e
parada, sem deploy. Restam tar12 e deepmerge-ts1; auditoria não aprovada.

[bcrypt6 — 20/10](../backend-phase-9-bcrypt-tar-20-10-2026.md): removida a
cadeia node-pre-gyp do backend; audit13→1, apenas deepmerge-ts/Prisma alto.
967 unitários, lint/build/tipos, dois cenários HTTP reais e três testes de
hash legado no runtime Linux aprovados. Imagem nova construída, sem deploy.
Bancada limpa/parada; custo e hashes existentes preservados. Aviso restante e
critérios operacionais ainda impedem declarar fechamento integral da F09.

[Prisma/deepmerge — 20/10](../backend-phase-9-prisma-deepmerge-20-10-2026.md):
override restrito ao config6.19.3 corrige o merger8.0.0 sem migrar ORM. RED por
RangeError e GREEN2/2 comprovados;969 unitários, lint/tipos/build e Prisma
validate/generate aprovados. Audit produção backend1→0. Smoke da imagem final
e migrations/backup/restore atuais fecham o recorte local conforme matriz.

[Auditoria persistida de auth](../backend-phase-9-audit-persistence.md) validada
localmente: identificada incompatibilidade de códigos com a constraint SQL,
migration posterior preparada e ensaiada com deploy repetível em banco vazio.
Login HTTP verifica gravação real; 10 testes SQL relacionados aprovados.
Continuação com dois cenários HTTP aprovados cobre cadastro duplicado, login
recusado, refresh, logout e logout-all com eventos SQL mínimos, rotação e
revogação reais. Aplicação remota, cadastro novo, casos adicionais de falha e
retenção continuam pendentes.

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

Para a demonstração local assistida, construção limpa, testes, migrations,
smoke, diagnóstico e recuperação possuem evidências e documentação versionada.
Implantação de produção continua dependente das decisões e implementações
fora desse recorte listadas na matriz de fechamento.
