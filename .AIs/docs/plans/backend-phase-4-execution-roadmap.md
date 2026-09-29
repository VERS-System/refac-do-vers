<!-- Plano executável da Fase 04 do backend VERS: autenticação e autorização. -->

# Fase 04 do backend — autenticação e autorização

## Objetivo e estado

**Lotes 01 e 02 concluídos; lote 03 ainda não iniciado.** A F03 concluiu a fundação HTTP; health e `/auth/csrf` estão
registrado. Implementar as seis rotas `/auth/*` contratadas, sessões em cookies
e proteção das rotas que forem entregues nas fases seguintes. Cada lote produz
um diff pequeno, testes antes do código e revisão do programador. A IA não faz
commits, acessa `.env`, Neon ou serviços externos sem autorização específica.

## Baseline e contratos

- Fontes públicas: [`endpoints.md`](../Api/endpoints.md),
  [`openapi.yaml`](../Api/openapi.yaml) e `packages/shared-types`.
- Fontes internas: `services/backend/prisma/schema.prisma`, `AppModule`,
  configuração de CORS, rate limit, auditoria e envelopes da F03.
- `AuthModule`, controller, service e guards existentes têm zero bytes;
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
somente `/auth/register` é ligado e documentado como implementado.

### 04 — Login

**Escopo:** verificar senha e status segundo a decisão do lote 01; criar sessão
e cookies. Reutilizar os componentes dos lotes anteriores. Não criar estratégia Local
se o service existente cobrir o fluxo com menos código.

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

### 06 — Logout

**Escopo:** revogar a sessão do refresh cookie ou todas as sessões do usuário
autenticado, conforme a rota; limpar cookies com os atributos do lote 02.

**Arquivos previstos:** `src/modules/auth/auth.service.ts`,
`src/modules/auth/auth.controller.ts` e testes.

**RED → GREEN:** logout atual, logout-all, repetição, sessão de outro usuário,
refresh após revogação e cookies expirados. **Saída:** ambas as rotas retornam
`204` sem body e não deixam sessão utilizável.

### 07 — Guards e autorização

**Escopo:** ler access token somente do cookie, validar assinatura e estado da
conta, separar rotas públicas/autenticadas/admin. Preparar checagem de vínculo
do recurso em consulta/service; aplicá-la nas rotas reais da F05–F06.

**Arquivos previstos:** `src/common/guards/`, `src/common/strategies/`,
`src/modules/auth/` e testes; sem controller de domínio fictício.

**RED → GREEN:** token ausente/alterado/expirado, conta bloqueada, papel
insuficiente, recurso inexistente/alheio com mesma resposta `404`. **Saída:**
guards testados e política de aplicação por rota documentada.

### 08 — Fechamento da fase

**Escopo:** conferir as cinco operações efetivas com OpenAPI e shared types,
eventos auditáveis, CORS/CSRF, cookie inacessível ao JavaScript e regressão da
F03. Documentar limites da proteção WebSocket até existir canal real na F08.

**Arquivos previstos:** testes HTTP, `docs/Api`, índice do roadmap, este plano
e contexto diário; só corrigir produção se um teste revelar defeito.

**Evidência:** `test:unit`, lint, build e `git diff --check`; registrar resultado
e qualquer bloqueio de `pnpm`. **Saída:** F04 marcada concluída somente depois
da revisão do programador e de todas as condições do critério de saída.

## Ordem e limites

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
