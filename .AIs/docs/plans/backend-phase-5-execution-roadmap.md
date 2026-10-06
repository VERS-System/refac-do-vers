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
