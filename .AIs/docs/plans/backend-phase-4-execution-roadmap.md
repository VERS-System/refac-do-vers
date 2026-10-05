<!-- Plano executável da Fase 04 do backend VERS: autenticação e autorização. -->

# Fase 04 do backend — autenticação e autorização

## Objetivo e estado

**Lotes 01–08 implementados; lote 08 em revisão do programador.** A F03 concluiu a fundação HTTP; health, `/auth/csrf`, `/auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout` e `/auth/logout-all` estão
registrados. Implementar as rotas `/auth/*` contratadas, sessões em cookies
e proteção das rotas que forem entregues nas fases seguintes. Cada lote produz
um diff pequeno, testes antes do código e revisão do programador. A IA não faz
commits, acessa `.env`, Neon ou serviços externos sem autorização específica.

## Baseline e contratos

- Fontes públicas: [`endpoints.md`](../Api/endpoints.md),
  [`openapi.yaml`](../Api/openapi.yaml) e `packages/shared-types`.
- Fontes internas: `services/backend/prisma/schema.prisma`, `AppModule`,
  configuração de CORS, rate limit, auditoria e envelopes da F03.
- No baseline anterior à F04, `AuthModule`, controller, service e guards tinham zero bytes;
  `auth.config.ts` contém apenas `JWT_SECRET` e `JWT_EXPIRATION=7d`.
- O schema já contém `User`, papéis globais e `RefreshSession` com hash,
  expiração, revogação e encadeamento. `User` nasce como
  `PENDING_VERIFICATION`; o cadastro agora retorna `202` sem sessão.
- Dependências de JWT, Passport e bcrypt já estão instaladas. Reutilizar o que
  houver; não adicionar bibliotecas sem necessidade comprovada.

### Inventário do lote 01 — 26/09/2026

| Contrato ou base | Estado observado |
| --- | --- |
| `POST /auth/register`, `/login`, `/refresh`, `/logout`, `/logout-all` | Todos documentados em OpenAPI e `endpoints.md`; nenhum registrado no `AppModule`. |
| AuthModule, controller, service, DTOs e estratégia local | Arquivos de zero bytes; sem comportamento a reaproveitar. |
| Guards JWT, papéis e WebSocket | Arquivos de zero bytes; sem proteção ativa. |
| Configuração JWT | `auth.config.ts` mapeia um único segredo e expiração; `env.config.ts` valida segredo mínimo de 16 caracteres e aceita duração, padrão `7d`. |
| CORS e infraestrutura HTTP | CORS allowlist com credenciais e headers de segurança ativos da F03; não há mecanismo CSRF. |
| Persistência | `User` com email `citext`, hash de senha, status `PENDING_VERIFICATION`, papéis; `RefreshSession` com hash único, expiração, revogação e substituição. |
| Tipos compartilhados | Códigos de erro e tipos de auth/perfil já declarados; confrontar com qualquer alteração do contrato antes de implementar. |

**Validação local:** `pnpm --filter @vers/backend {test:unit,lint,build}` não
iniciou devido à política de execução de `pnpm.ps1` no PowerShell.
`npm.cmd run test:unit` no serviço passou (15 suítes, 55 testes), assim como
`npm.cmd run lint` e `npm.cmd run build`. Sem Neon, Redis ou `.env` lidos.

**Decisões do programador já recebidas:** produção ainda sem domínios/origens
definidos, com abertura a sugestões; conta `PENDING_VERIFICATION` não fará login
nem acessará rotas autenticadas até ativação futura. O cadastro retorna `202`
sem body nem sessão tanto para email novo quanto para email existente. Os
contratos públicos foram atualizados; uma conta recém-cadastrada não poderá
fazer login até existir ativação. Para desenvolvimento, foi aprovada a política
provisória de cookies `HttpOnly`, `Secure` sob HTTPS, host-only,
`SameSite=Lax`, com validação de `Origin` e token CSRF nas mutações. Access JWT
dura 15 minutos e refresh JWT sete dias, com segredos distintos configuráveis.
Foi aprovada `GET /auth/csrf` para emitir token e cookie vinculado antes das
mutações. O dashboard deixa de usar Electron e passa a ser cliente web Vite com
Tailwind; a migração é planejada separadamente.

## Decisões do programador antes de ativar auth

1. Produção ainda sem endereço definido. No desenvolvimento, a API usa
   `localhost:3000` e o frontend pode usar sua própria porta local, já
   autorizada pelo programador; CORS permite apenas as origens configuradas.
   Cookies são host-only e usam os paths aprovados no lote 02. O mobile terá
   integração própria antes de enviar mutações.
2. Aprovado `Origin` + token CSRF nas mutações. Definir emissão/renovação do
   token, aplicação em `refresh`, `logout`, `logout-all` e clientes nativos.
   A integração nativa fica para antes de ativar mutações mobile. Após login,
   o token CSRF deverá ser vinculado à sessão autenticada.
3. Vida útil de 15 minutos para access e sete dias para refresh, com chaves
   distintas, aprovadas. Os segredos permanecem no ambiente sem rotação
   planejada nesta fase; a política de troca será decidida quando necessária.
4. Conta `PENDING_VERIFICATION`: não faz login nem acessa rotas autenticadas
   até ativação futura, por decisão do programador em 29/09/2026.
5. Cadastro indistinguível `202` sem sessão aprovado e refletido nos
   contratos. Login: após 8 erros, espera de 15 minutos; após mais 4 erros,
   espera de 1 hora; após mais 2 erros, bloqueio de 24 horas com liberação
   automática. Login correto zera a contagem. A resposta pública permanece
   genérica. Decisão aprovada pelo programador em 29/09/2026; implementar
   e testar no lote 04.

**Pendências para produção:** origens e domínios finais. Antes de ligar
mutações autenticadas, vincular o token CSRF à sessão; antes das mutações
mobile, integrar seus cookies e mecanismo de origem.

**Saída do lote 01:** baseline, matriz contrato × implementação e decisões para
iniciar o lote 02 registrados. Política de bloqueio de login permanece para o
lote 04; o acesso de `PENDING_VERIFICATION` foi fechado em 29/09/2026.

**Decisão do lote 02 — 29/09/2026:** o programador aprovou o access cookie em
`/`, o refresh cookie em `/api/v1/auth` e o token CSRF aleatório em cookie
host-only, comparado com `X-CSRF-Token`; `GET /auth/csrf` renova o token. A
guarda global exige `Origin` da allowlist e o par cookie/header em toda mutação
HTTP. Essa política vale para o web; o envio de `Origin` pelo mobile será
definido antes de integrar mutações nativas.

**Execução do lote 02:** testes escritos antes da implementação falharam com
configuração antiga, CORS sem header, rota ausente e helper de cookie ausente.
Depois, `npm.cmd run test:unit` passou (16 suítes, 58 testes), assim como lint
e build. Segredos distintos e durações são validados no startup; os JWTs ainda
não são emitidos porque login/refresh pertencem aos lotes seguintes.

**Revisão do lote 02 e execução do lote 03 — 29/09/2026:** testes RED expuseram
duração JWT zero aceita e refresh cookie preso a `/api/v1/auth` mesmo com
`API_PREFIX` configurável. Ambos foram corrigidos. O cadastro foi criado com
DTO allowlist, email normalizado, hash bcrypt, `USER` e estado
`PENDING_VERIFICATION` na mesma operação Prisma. Conflito único de email
(`P2002`) responde como cadastro novo, inclusive em tentativas simultâneas;
outras falhas continuam como erro interno genérico. Resposta HTTP `202` não
contém body nem cookie de sessão. Testes HTTP cobrem payload inválido, campo
extra e duplicidade. `npm.cmd run test:unit`: 17 suítes/63 testes; lint e
build passaram. O lote 04 precisa implementar a política de tentativas
aprovada antes de ativar login.

**Decisões adicionais de 29/09/2026:** ainda não há endereço de produção.
O programador quer o sistema de segurança funcionando localmente, com a API
em `localhost:3000` e o frontend em sua própria porta; sua origem continua na
allowlist CORS.
Domínios de produção serão definidos quando houver hospedagem. A integração
de cookies e CSRF do app mobile fica para antes de ativar suas mutações; o
cliente nativo não deve ser enviado à API atual sem essa adaptação. Os segredos
de assinatura permanecem separados no ambiente; não haverá rotação planejada
agora. Uma futura troca poderá exigir novo login, a decidir nessa ocasião.
Conta `PENDING_VERIFICATION` não faz login nem acessa rotas autenticadas até
ser ativada em fase futura; a ativação não integra a F04. A progressão do
bloqueio de login foi aprovada nos três estágios descritos acima.

Registrar as respostas neste plano e refletir qualquer mudança de contrato em
`endpoints.md` e `openapi.yaml` antes do lote afetado. Nenhuma política acima
será inferida por um valor padrão de biblioteca.

## Lotes

| Lote | Entrega | Teste mínimo antes da implementação |
| --- | --- | --- |
| 01 — Baseline e decisões | Confirmar scaffolds, schema, contratos, comandos locais e decisões acima. | `test:unit`, lint, build; inventário de divergências. |
| 02 — Configuração e cookies | Validar segredos, expirações e opções aprovadas; emissor/limpeza de cookies e `GET /auth/csrf`. | Configuração inválida falha no início; atributos de cookie e limpeza são simétricos; Origin/CSRF validados. |
| 03 — Cadastro | DTO allowlist, email normalizado, senha validada, hash bcrypt, criação de `USER` pendente. | Payload extra/senha inválida, corrida de email duplicado, hash persistido e `202` indistinguível sem sessão. |
| 04 — Login | Validar credenciais e estado da conta; criar sessão e emitir cookies. | Email ausente e senha errada têm resposta genérica equivalente; conta bloqueada e rate limit; nenhum token no body/log. |
| 05 — Refresh | Verificar cookie, hash e estado da sessão; rotacionar de forma atômica e encadear substituição. | Expirado/revogado, duas chamadas concorrentes, replay e revogação da cadeia comprometida. |
| 06 — Logout | Revogar sessão atual ou todas as sessões do usuário; expirar cookies com os mesmos atributos. | Repetição, sessão alheia, `logout-all`, refresh posterior negado e resposta `204` sem body. |
| 07 — Guards e autorização | Access JWT por cookie, papel global e helper de autorização por vínculo de recurso para as F05–F06. | Público/autenticado/admin, token inválido, usuário bloqueado, recurso alheio com `404`; nenhuma rota de domínio vazia. |
| 08 — Fechamento | Conferir OpenAPI × rotas, auditoria allowlist, CSRF e regressão. Preparar proteção WS para a F08 sem publicar canal fictício. | HTTP de ponta a ponta com dependências sintéticas; `test:unit`, lint e build. |

### 01 — Baseline e decisões

**Escopo:** inventariar `AppModule`, scaffolds de auth/guards, configuração,
schema e operações de auth no OpenAPI. Registrar os resultados dos comandos de
baseline e as cinco decisões pendentes acima. Não alterar comportamento.

**Arquivos previstos:** este plano e contexto diário; contratos apenas se a
decisão alterar o comportamento publicado.

**Saída:** matriz contrato × implementação e decisões suficientes para codificar
cookies, CSRF, duração e estados de conta. Revisão do programador antes do lote
02.

### 02 — Configuração e cookies

**Escopo:** validar segredos distintos e durações aprovadas no startup, criar
uma única rotina de emissão/limpeza de cookies com os atributos aprovados e
`GET /auth/csrf` para fornecer token e cookie vinculado. Validar `Origin` e
token CSRF nas mutações; expor o header CSRF na allowlist CORS.

**Arquivos previstos:** `src/config/auth.config.ts`, `src/config/env.config.ts`,
`src/modules/auth/` e respectivos testes; `.env.example` se surgirem variáveis.

**RED → GREEN:** configuração ausente/inválida; cookies com atributos e paths
corretos; limpeza simétrica; origem/CSRF aceito e negado. Sem rota de auth
registrada ainda. **Saída:** infraestrutura testada sem credencial no JSON/log.

### 03 — Cadastro

**Escopo:** validar DTO e email, aplicar a regra de senha, gravar hash e papel
`USER` com estado pendente. Capturar conflito de unicidade do banco, inclusive
corrida concorrente, sem revelar se a conta já existe.

**Arquivos previstos:** `src/modules/auth/{auth.module,auth.controller,auth.service}.ts`,
`src/modules/auth/dto/register.dto.ts`, `src/app.module.ts` e testes.

**RED → GREEN:** payload válido/inválido, campo extra, email com caixa distinta,
duplicidade concorrente, hash no banco, `202` sem body nem cookies de sessão.
**Saída:**
`/auth/register` foi ligado, além de `/auth/csrf` do lote anterior, e
documentado como implementado.

### 04 — Login

**Escopo:** verificar senha e status segundo a decisão do lote 01; criar sessão
e cookies. Reutilizar os componentes dos lotes anteriores. Não criar estratégia Local
se o service existente cobrir o fluxo com menos código.

**Execução planejada:** usar Redis, já exigido pelo readiness, para guardar
contagem e prazo de espera por email normalizado com chave HMAC (sem email em
claro). `INCR` mantém a contagem atômica; falha de Redis impede login. Aplicar
8/15 min, 12/1 h e 14/24 h, com expiração da contagem após 48 h sem erros
antes do terceiro estágio; no terceiro, a contagem expira junto do bloqueio.
Consultar bloqueio antes de comparar senha; email ausente e senha errada terão
resposta pública equivalente. Persistir `RefreshSession` com hash SHA-256 do
refresh JWT e emitir access/refresh apenas em cookies após a gravação da sessão.
Conta pendente ou `BLOCKED` recebe erro genérico sem sessão. Testar esses
fluxos com Prisma e Redis simulados, depois regressão completa.

**Execução em 29/09/2026:** login lê conta por email normalizado, compara
senha com bcrypt (hash sintético para email ausente), recusa conta não ativa e
persiste `RefreshSession` com hash do refresh JWT antes de emitir os cookies.
Access e refresh são assinados com segredos e durações separados; o JSON traz
apenas o perfil público. Redis aplica a contagem por email em chave HMAC,
esperas de 15 min/1 h/24 h e falha fechada quando indisponível. O CSRF é
renovado por `GET /auth/csrf` e vinculado ao cookie de sessão após login;
cookies duplicados são recusados. Testes RED precederam a implementação.
`npm.cmd run test:unit` passou (18 suítes/73 testes), lint e build passaram.
Prisma e Redis foram simulados; não houve teste contra dependências reais.

**Arquivos previstos:** `src/modules/auth/auth.service.ts`,
`src/modules/auth/auth.controller.ts`, `src/modules/auth/dto/login.dto.ts` e
testes.

**RED → GREEN:** credencial correta, email inexistente, senha errada, conta
bloqueada, limite de tentativas e vazamento em logs/resposta. **Saída:**
`/auth/login` responde `200` com perfil e cookies ou erro público aprovado.

### 05 — Refresh e replay

**Escopo:** validar JWT do refresh cookie e hash persistido; trocar a sessão
em transação com condição de estado/expiração, marcando a anterior revogada e
ligando a substituta. Replay segue a política de revogação da cadeia do roadmap.

**Arquivos previstos:** `src/modules/auth/auth.service.ts`,
`src/modules/auth/auth.controller.ts` e testes; schema somente se uma lacuna
real impedir a operação atômica.

**RED → GREEN:** cookie ausente, expirado, revogado, duas renovações simultâneas
e uso posterior do token antigo. **Saída:** `/auth/refresh` retorna `204`,
cookies novos e nenhum body; nunca persiste token bruto.

**Execução em 29/09/2026:** a rota valida JWT, tipo, usuário, hash e prazo da
sessão; uma atualização condicional no banco garante que só uma chamada possa
rotacionar o token. A sessão sucessora guarda apenas o hash e fica encadeada à
anterior na mesma transação. O uso posterior de um token antigo revoga os
sucessores da cadeia. Testes cobrem ausência, assinatura inválida, expiração,
conta pendente, concorrência e replay; o teste HTTP cobre CSRF, cookies e
resposta `204` vazia. `test:unit` passou com 18 suítes e 77 testes usando
Prisma simulado. O cliente deve renovar o token CSRF após o refresh.

### 06 — Logout

**Plano de execução — 30/09/2026:** reutilizar leitura e limpeza dos cookies.
Validar assinatura, tipo e vínculo com a sessão antes de revogar. Logout atual
aceita repetição de uma sessão já revogada e invalida seus sucessores; logout-all
exige access JWT de conta ativa e sessão válida e revoga somente suas sessões.
Serializar revogação com a rotação pela atualização da mesma linha na transação.
Testar primeiro revogação, repetição, tokens inválidos/alheios, falha de banco,
refresh posterior e HTTP 204 com CSRF e cookies expirados. Executar baseline,
RED, GREEN, lint e build sem serviços externos; revisar este lote antes do 07.

**Escopo:** revogar a sessão do refresh cookie ou todas as sessões do usuário
autenticado, conforme a rota; limpar cookies com os atributos do lote 02.

**Arquivos previstos:** `src/modules/auth/auth.service.ts`,
`src/modules/auth/auth.controller.ts` e testes.

**RED → GREEN:** logout atual, logout-all, repetição, sessão de outro usuário,
refresh após revogação e cookies expirados. **Saída:** ambas as rotas retornam
`204` sem body e não deixam sessão utilizável.

**Execução do lote 06 — 30/09/2026:** logout e logout-all registrados com
Origin/CSRF, resposta `204` vazia e limpeza dos cookies existentes. Validação de
JWT e sessão foi compartilhada com refresh; hash inválido retorna `401` sem
erro de comparação. Logout atual aceita repetição e percorre sucessores.
Logout-all valida access, conta ativa e sessão, lista apenas suas sessões e
revoga cada cadeia em transação. A leitura do sucessor ocorre depois da
atualização que bloqueia a linha, para acompanhar uma rotação concorrente.
Novo login concorrente não é necessariamente parte do conjunto revogado.
Testes RED comprovaram métodos e rotas ausentes; testes usam JWT real e Prisma
simulado. Baseline: 77 testes. Validação final: 18 suítes/89 testes, lint e build
aprovados via `npm.cmd`, além de `git diff --check`. Não houve banco real,
migration, Docker, acesso a `.env` ou commit. Concorrência foi simulada;
ensaio com PostgreSQL real segue pendente. Guards e fechamento são lotes 07–08.

### 07 — Guards e autorização

**Plano de execução — 03/10/2026:** implementar estratégia Passport JWT com
extrator exclusivo do cookie `vers_access`, HS256 e expiração obrigatória.
Consultar sessão persistida e conta ativa a cada acesso; papéis vêm do banco,
nunca das claims. Exportar guards opt-in, decorators de papéis, rota pública
e usuário atual pelo `AuthModule`; não instalar autenticação global nem
publicar rotas sintéticas fora dos testes. Reutilizar `AUTH_UNAUTHORIZED` em
401/403, com status 403 para papel insuficiente, sem ampliar o catálogo.
Preparar consultas de vínculo para veículos, instalações e testes, mantendo
404 indistinguível e acesso histórico pelo criador conforme contrato.
ADMIN global não dispensa vínculo. As F05–F06 aplicarão esses componentes nas
rotas reais; escritas deverão verificar vínculo dentro da própria transação.

Arquivos deste lote: `common/strategies/jwt.strategy.ts`,
`common/guards/{jwt-auth,roles}.guard.ts`,
`common/decorators/{public,roles,current-user}.decorator.ts`,
`modules/auth/auth-principal.ts`, `modules/auth/resource-access.service.ts`,
`modules/auth/auth.service.ts`, `modules/auth/auth.module.ts` e
`modules/auth/auth-authorization.spec.ts`; este plano, índice do backend,
contrato humano e contexto diário. Primeiro comprovar RED no harness HTTP
com JWT real e Prisma simulado; depois executar `test:unit`, lint e build.
Não acessar `.env`, Neon, Redis real ou alterar dependências/schema.

**Escopo:** ler access token somente do cookie, validar assinatura e estado da
conta, separar rotas públicas/autenticadas/admin. Preparar checagem de vínculo
do recurso em consulta/service; aplicá-la nas rotas reais da F05–F06.

**Arquivos previstos:** `src/common/guards/`, `src/common/strategies/`,
`src/modules/auth/` e testes; sem controller de domínio fictício.

**RED → GREEN:** token ausente/alterado/expirado, conta bloqueada, papel
insuficiente, recurso inexistente/alheio com mesma resposta `404`. **Saída:**
guards testados e política de aplicação por rota documentada.

**Execução — 03/10/2026:** estratégia Passport JWT e guards opt-in exportados.
`vers_access` único é a única fonte do token; HS256, tipo access, UUIDs e
expiração são obrigatórios. Sessão e conta são consultadas a cada acesso;
revogação, substituição, expiração e conta não ativa impedem acesso. Papéis
vêm do banco, com herança no controlador e sobrescrita por rota. Helpers de
veículo/instalação/teste mantêm vínculo e consulta histórica do criador,
sem bypass para ADMIN. Não há novas rotas de produção.

Baseline: 18 suítes/89 testes. RED confirmou módulos/decorators ausentes.
O harness precisou importar `AuthModule` diretamente para consumir seus
providers exportados. GREEN final: `npm.cmd run test:unit`, 19 suítes/108
testes, lint e build aprovados. JWTs reais, Prisma simulado e HTTP local;
nenhum `.env`, banco real, serviço externo, migration ou dependência alterado.
Ensaios de consultas SQL e concorrência real continuam para a integração.
O lote 08 permanece pendente; F04 não foi marcada concluída.

### 08 — Fechamento da fase

**Escopo:** conferir as seis operações efetivas com OpenAPI e shared types,
eventos auditáveis, CORS/CSRF, cookie inacessível ao JavaScript e regressão da
F03. Documentar limites da proteção WebSocket até existir canal real na F08.

**Arquivos previstos:** testes HTTP, `docs/Api`, índice do roadmap, este plano
e contexto diário; só corrigir produção se um teste revelar defeito.

**Evidência:** `test:unit`, lint, build e `git diff --check`; registrar resultado
e qualquer bloqueio de `pnpm`. **Saída:** F04 marcada concluída somente depois
da revisão do programador e de todas as condições do critério de saída.

## Ordem e limites

### Evidência do lote 08 — 05/10/2026

Conferidas as seis operações de auth, status e envelopes com o controller e
tipos compartilhados. Acrescentados tipos `CsrfResponse` e `LogoutAllRequest`,
headers Origin/CSRF e respostas 403 ao OpenAPI. Referências locais do YAML
resolvidas e cinco mutações conferidas. Corrigidos CSRF multibyte (RangeError)
e envelope 403; política de auditoria cobre refresh/logout-all e valida resultado.

Regressão HTTP cobre as cinco mutações com token malformado, sem cookies de
sessão na recusa; testes existentes cobrem CORS, cookies, rotação/replay,
revogação, autorização por recurso e fundação F03. Banco e Redis são doubles:
não houve validação contra serviços reais. Na entrega original do lote 08,
emissão/persistência por operação ainda não estava conectada; complemento abaixo.
WebSocket aguarda canal real da F08.

F04 permanece em andamento até revisão do programador e aceite dessas pendências.

### Complemento — auditoria de auth, 05/10/2026

Implementados gravador Prisma e interceptor exclusivo do AuthController para os
cinco eventos. A política sanitiza campos antes de `AuditEvent.create`; evento
guarda ação, resultado e requestId, com actorId/resourceId nulos. Não há payload
nem identidade extraída de cookie não validado. Cadastro duplicado é auditado
igual ao novo. GET csrf e recusas de guards não entram no interceptor.

Decisão do programador: falha da auditoria mantém autenticação e revogação,
logando somente evento técnico, ação e requestId. Gravação separada da transação
da sessão, sem rollback, fila ou retentativa. Respostas 202/204 podem ser enviadas
antes de terminar a tentativa de auditoria. Plano: [auditoria de auth](backend-phase-4-auth-audit.md).

TDD: testes novos falharam com módulos ausentes; cinco casos HTTP falharam por
ausência de gravação antes da conexão do interceptor. GREEN: 22 suítes/139 testes,
lint e build passaram. Banco/Redis simulados; nenhuma migration ou dependência
alterada. pnpm.ps1 bloqueado por ExecutionPolicy; pnpm.cmd abortou tentativa de
reinstalação sem TTY. Executados scripts locais via npm.cmd sem reinstalar.

Implementação da F04 pronta para revisão/PR do programador; não marcada concluída
automaticamente. F05 não iniciada e aguarda o PR conforme pedido explícito.

```text
F03 → 01 → decisões operacionais → 02 → 03 → 04 → 05 → 06 → 07 → 08 → F05
```

Usar transação/condição atômica para rotação e revogação; não aceitar refresh
em body ou header. Access token não é persistido. Autorização por recurso é
verificada no service/consulta, não apenas por papel. A identidade MQTT segue
separada da identidade humana. A proteção do handshake WebSocket será ligada
quando o canal real existir na F08; o contrato e o teste do guard podem ser
preparados nesta fase.

## Critério de saída

- As seis rotas `/auth/*` cumprem status, cookies e envelopes contratados;
  cadastro não cria sessão e a ativação da conta continua fora da F04.
- CSRF, CORS, papéis, revogação e replay têm testes de abuso.
- Somente hashes de senha e refresh são persistidos; respostas, auditoria e
  logs não contêm credenciais ou dados pessoais desnecessários.
- `pnpm --filter @vers/backend test:unit`, lint e build passam, ou uma limitação
  do gerenciador é registrada com execução equivalente de `npm run test:unit`.
- Contratos e contexto diário refletem o que foi implementado e o que segue
  pendente; o programador revisa cada lote e faz os commits.
