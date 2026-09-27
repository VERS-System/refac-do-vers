<!-- Plano executável da Fase 04 do backend VERS: autenticação e autorização. -->

# Fase 04 do backend — autenticação e autorização

## Objetivo e estado

**Planejada em 26/09/2026.** A F03 concluiu a fundação HTTP; apenas health está
registrado. Implementar as cinco rotas `/auth/*` contratadas, sessões em cookies
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
  `PENDING_VERIFICATION`; o contrato de cadastro inicia sessão.
- Dependências de JWT, Passport e bcrypt já estão instaladas. Reutilizar o que
  houver; não adicionar bibliotecas sem necessidade comprovada.

## Decisões do programador antes de ativar auth

1. Origem e domínio de produção do web/desktop e da API; uso dos cookies no
   mobile. Registrar `SameSite`, `Secure`, `Domain` e `Path` para access e
   refresh, incluindo ambiente local.
2. Mecanismo CSRF para requisições mutáveis autenticadas por cookie, inclusive
   `refresh`, `logout` e `logout-all`; definir comportamento de clientes nativos.
3. Vida útil de access/refresh, chaves distintas e política de rotação de
   assinatura. O valor único atual de sete dias não é uma decisão final.
4. Conta `PENDING_VERIFICATION`: quais rotas pode usar e como se torna
   `ACTIVE`, pois não há contrato de verificação de email nesta fase.
5. Política de bloqueio/tentativas e resposta de cadastro para email existente:
   o contrato atual prevê `409`, que revela a existência da conta.

Registrar as respostas neste plano e refletir qualquer mudança de contrato em
`endpoints.md` e `openapi.yaml` antes do lote afetado. Nenhuma política acima
será inferida por um valor padrão de biblioteca.

## Lotes

| Lote | Entrega | Teste mínimo antes da implementação |
| --- | --- | --- |
| 01 — Baseline e decisões | Confirmar scaffolds, schema, contratos, comandos locais e decisões acima. | `test:unit`, lint, build; inventário de divergências. |
| 02 — Configuração e cookies | Validar segredos, expirações e opções aprovadas; emissor/limpeza de cookies sem tokens no JSON ou logs. | Configuração inválida falha no início; atributos de cookie e limpeza são simétricos; nenhuma credencial vaza. |
| 03 — Cadastro | DTO allowlist, email normalizado, senha validada, hash bcrypt, criação de `USER` e sessão atômica. | Payload extra/senha inválida, corrida de email duplicado, hash persistido, perfil público e cookies corretos. |
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

**Escopo:** validar opções de assinatura e duração no startup, criar uma única
rotina de emissão/limpeza de cookies com os atributos aprovados e conectar a
proteção CSRF para as mutações que usam cookies.

**Arquivos previstos:** `src/config/auth.config.ts`, `src/config/env.config.ts`,
`src/modules/auth/` e respectivos testes; `.env.example` se surgirem variáveis.

**RED → GREEN:** configuração ausente/inválida; cookies com atributos e paths
corretos; limpeza simétrica; origem/CSRF aceito e negado. Sem rota de auth
registrada ainda. **Saída:** infraestrutura testada sem credencial no JSON/log.

### 03 — Cadastro

**Escopo:** validar DTO e email, aplicar a regra de senha, gravar hash e papel
`USER`, criar sessão conforme política aprovada e retornar `UserProfile`.
Capturar conflito de unicidade do banco, inclusive corrida concorrente.

**Arquivos previstos:** `src/modules/auth/{auth.module,auth.controller,auth.service}.ts`,
`src/modules/auth/dto/register.dto.ts`, `src/app.module.ts` e testes.

**RED → GREEN:** payload válido/inválido, campo extra, email com caixa distinta,
duplicidade concorrente, hash no banco, status e cookies de `201`. **Saída:**
somente `/auth/register` é ligado e documentado como implementado.

### 04 — Login

**Escopo:** verificar senha e status segundo a decisão do lote 01; criar sessão
e cookies. Reutilizar os componentes do cadastro. Não criar estratégia Local
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

- As cinco rotas `/auth/*` cumprem status, cookies e envelopes contratados.
- CSRF, CORS, papéis, revogação e replay têm testes de abuso.
- Somente hashes de senha e refresh são persistidos; respostas, auditoria e
  logs não contêm credenciais ou dados pessoais desnecessários.
- `pnpm --filter @vers/backend test:unit`, lint e build passam, ou uma limitação
  do gerenciador é registrada com execução equivalente de `npm run test:unit`.
- Contratos e contexto diário refletem o que foi implementado e o que segue
  pendente; o programador revisa cada lote e faz os commits.
