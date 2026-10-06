<!-- Organiza a F05 em lotes revisáveis, começando pelo perfil autenticado. -->
# F05 — Recursos de domínio

F04 revisada e PR realizado, conforme confirmação do programador em 06/10/2026.
F05 autorizada para iniciar; um lote por vez, com TDD e revisão entre entregas.

## Lotes

1. Perfil: GET/PATCH /users/me; projeção pública, campos permitidos, auth e CSRF.
2. Veículos: cadastro/listagem/detalhe; vínculo e primeiro principal.
3. Veículos: atualização, promoção e desvinculação transacionais, histórico preservado.
4. Instalações/configurações: leituras autorizadas dos contratos existentes.
5. Testes: planejamento, listagem e detalhe com snapshot e autorização.
6. Testes: início/finalização/cancelamento com concorrência e horários do servidor.
7. Suporte: criação e consultas próprias, limites do contrato.
8. Regressão e conferência dos contratos, documentação e revisão final.

Provisionamento e mutações administrativas dependem de contrato e decisões
operacionais antes de implementação. Não antecipar endpoints sem contrato.

## Lote 1 — plano

Arquivos: modules/users (DTO, controller, service, module e teste HTTP),
app.module.ts; contratos REST/OpenAPI, índice do backend e contexto diário.
Reutilizar guards, decorador CurrentUser, Prisma e envelope existentes.
GET seleciona apenas campos públicos e serializa datas UTC.
PATCH rejeita extras, body vazio, tipos inválidos, nome acima de 120 caracteres
e URI inválida; null limpa o campo e ausência mantém o valor.
Não buscar avatar remotamente. Não permitir alterar email, status ou papéis.
Selecionar/atualizar apenas a conta autenticada; USER_NOT_FOUND para ausência
após autenticação; falha de banco permanece erro público genérico.

Testes HTTP antes do código: leitura sem segredos, atualização parcial/null,
auth ausente/revogada, CSRF, validação e falha de banco. Baseline e GREEN por
test:unit, lint/build e diff --check, com dependências sintéticas sem .env.
Sem novas dependências, migration, Docker ou serviços externos.

## Lote 1 — entregue em 06/10/2026

13 testes HTTP falharam primeiro por rotas inexistentes; após implementação,
23 suítes/152 testes passaram, assim como lint e build. O DTO usa URL nativo
para validar URI absoluta, pois a versão instalada do class-validator não
exporta IsRFC3986. Autenticação/CSRF e persistência são exercitados com JWT
real e Prisma simulado; nenhum banco externo foi usado.
pnpm abortou sua checagem de dependências sem TTY; scripts npm.cmd equivalentes
passaram sem reinstalação. Lote 2 segue após revisão do programador.

## Lote 2 — plano autorizado pela continuação

GET/POST /vehicles e GET /vehicles/{vehicleId}. Novos arquivos em modules/vehicles:
DTO, service, controller, module e teste HTTP; registro em app.module.ts.
Atualizar contratos, índice e contexto após validação. Sem migration ou dependência.
Normalizar placa para maiúsculas sem espaços/hífen, validar padrão brasileiro,
marca/modelo e ano conforme OpenAPI; rejeitar null, extras e IDs do cliente.
Consultar UserVehicle da própria conta junto aos campos públicos do veículo,
sem checagem separada que permita corrida; ausência e recurso alheio usam 404.
Paginação 1/20, máximo 100, ordem createdAt decrescente e id como desempate.
Cadastro cria veículo e vínculo OWNER na mesma transação. Bloquear a linha da
conta antes de contar vínculos para serializar primeiros cadastros concorrentes;
somente o primeiro fica principal. Placa duplicada usa o conflito contratado.
Testes HTTP antes da implementação: guards/CSRF, payloads, projeção, vínculo,
paginação, primeiro/próximos, falhas e ordem transacional com Prisma simulado.
Baseline e GREEN com test:unit, lint/build e diff --check. Concorrência real
em PostgreSQL permanece ensaio separado; não confundir doubles com prova SQL.

### Lote 2 entregue — 06/10/2026

Implementados cadastro, listagem e detalhe no módulo vehicles e registrados no
AppModule. DTO preserva tipos originais apesar da coerção global; projeção
restrita aos campos públicos e vínculo próprio, inclusive para ADMIN.
Listagem usa snapshot RepeatableRead; cadastro bloqueia a conta antes da
contagem e cria veículo/vínculo atomicamente. Sem migration/dependência.
TDD: baseline 152 testes; RED das rotas; GREEN 24 suítes/183 testes.
Lint, build e diff --check aprovados. Concorrência real em PostgreSQL pendente.
Próximo lote: atualização, promoção do principal e desvinculação de veículos.

## Lote 3 — plano

Alterar controller/service/testes de vehicles; criar DTO de atualização e query
de exclusão. Atualizar contratos, índice e contexto. Sem dependências/migration.
PATCH aceita brand/model/modelYear nullable e isPrimary boolean; preserva tipos,
rejeita vazio/extras e só true promove (false mantém o principal existente).
Mutações bloqueiam conta e veículo, nessa ordem, antes de consultar vínculo.
Promoção desmarca anterior antes de marcar destino na mesma transação.
DELETE valida substituto próprio/distinto; principal com um candidato promove
automaticamente, com vários exige substituto. Sem outros vínculos remove veículo
com cascatas/SetNull existentes, preservando testes e telemetria. FK MQTT bruta
RESTRICT e trigger imutável impedem a cascata; programador autorizou apagar
mensagens brutas no último vínculo, preservando testes, amostras e resumos.
Limpeza dos envelopes e exclusão física ficam na mesma transação.
TDD HTTP com doubles: payloads, auth/CSRF, vínculo, ordem, principal, candidatos,
compartilhamento e falhas sem escrita parcial. test:unit, lint/build, diff --check.
Ensaio de concorrência e cascatas em PostgreSQL real permanece pendente.

### Lote 3 entregue — 06/10/2026

PATCH/DELETE registrados com guards, CSRF e DTOs estritos. Conta e veículo
bloqueados nessa ordem; promoção desmarca anterior antes do destino. Exclusão
valida substituto antes de escrever e preserva veículo compartilhado.
Último vínculo remove envelopes MQTT antes do veículo na mesma transação,
conforme autorização explícita; FKs existentes preservam histórico normalizado.
TDD: 29 novos casos RED antes das rotas; GREEN final 24 suítes/214 testes,
incluindo limpeza MQTT, falha dessa limpeza e query extra. Lint/build aprovados.
Doubles verificam chamadas/ordem; rollback, cascatas e concorrência reais não
foram exercitados contra PostgreSQL nesta entrega. Próximo: lote 4, leituras
de instalações/configurações. Sem alteração de schema/dependências.

## Lote 4 — plano

Criar modules/installations (DTOs, service, controller, module, teste HTTP),
registrar AppModule e atualizar contratos/índice/contexto. Reutilizar guards,
paginação, envelopes e tipos públicos; nenhuma migration/dependência.
GET lista/detalhe de instalações e GET lista/detalhe de configurações.
Filtrar vínculo UserVehicle na própria consulta, inclusive ADMIN; UUID/status
e extras validados. Listagem de instalações por createdAt desc/id asc, filtros
opcionais vehicleId/status; configuração por version desc/id asc. Página 1/20,
máximo 100. Listas usam RepeatableRead para linhas/contagem/autorização.
Configuração de outra instalação retorna CONFIGURATION_NOT_FOUND; listagem de
configurações exige instalação acessível, senão INSTALLATION_NOT_FOUND.
Selecionar só campos públicos; dispositivo não revogado (revokedAt null e
status diferente de REVOKED), ou null; datas UTC. Sem serial/deviceUid/tópicos.
TDD HTTP antes da implementação, auth/revogação, acesso, filtros/paginação,
projeção, ausência e falhas; test:unit, lint/build e diff --check.

### Lote 4 entregue — 06/10/2026

Quatro leituras registradas via InstallationsModule no AppModule. Consultas
filtram vínculo próprio, inclusive ADMIN, e projetam só os campos contratados.
Listagens consistentes com RepeatableRead; instalação ausente não vira lista
de configurações vazia. Dispositivo público não inclui UID/serial/credenciais.
TDD: 22 casos RED antes das rotas; GREEN 25 suítes/236 testes no backend.
Lint, build e diff --check aprovados; sem banco externo, schema ou dependências.
Próximo lote: planejamento, listagem e detalhe de testes experimentais.
