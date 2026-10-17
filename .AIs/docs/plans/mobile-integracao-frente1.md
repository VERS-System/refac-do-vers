<!-- Integração do mobile com o backend: fundação HTTP, autenticação e perfil. -->

# Plano — integração Frente 1: fundação + Auth + Perfil

## 1. Contexto e problema

O backend tem 28/32 rotas implementadas (F05 lotes 1–7): health, auth por
cookies (`csrf/register/login/refresh/logout/logout-all`), `GET/PATCH
/users/me`, veículos, instalações, testes e suporte. O mobile está sem
qualquer camada de rede: `App.tsx` usa `isAuthenticated` local, o
`AuthNavigator` só repassa `onAuthenticated` e o `RootNavigator` entrega
`DEMO_PROFILE` fixo. As telas já aceitam props de dados e têm estados
`loading/empty/error` (Task 08), prontas para receber dados reais.

Esta frente cria a fundação de rede + sessão real + perfil, provando
cedo os riscos de cliente nativo (header `Origin`, captura de
`Set-Cookie`, persistência segura) antes de veículos/instalações/testes.

## 2. Decisões do programador (regra 11, 17/10/2026)

| Ponto | Decisão |
| --- | --- |
| Escopo | Fundação + Auth + Perfil (`/users/me`). Demais domínios em frentes futuras. |
| Origin nativo | Fixo `http://localhost:8081` — já está na lista default `CORS_ORIGINS` do backend; zero mudança no backend. |
| Sessão persistida | Sim: jar de cookies/token em `expo-secure-store`, restaurado no boot. |
| Tipos | Consumir `@vers/shared-types` (workspace) via Metro/Jest; fonte única de verdade. |
| Fixtures | Fixture só em teste. Telas integradas usam dados reais e, em falha, os estados de erro já existentes. |

## 3. Fatos do contrato que orientam o cliente

- Cookies: `vers_access` (15 min, `Path=/`), `vers_refresh` (7 d,
  `Path=/api/v1/auth`), `vers_csrf` — HttpOnly, SameSite=Lax.
- `GET /auth/csrf` → `{ data: { csrfToken } }` + cookie `vers_csrf`.
  Mutações enviam header `X-CSRF-Token` + `Origin` + `Cookie` com os três
  cookies. Após `login` e após `refresh`, novo `GET /auth/csrf` é
  obrigatório (token anterior deixa de valer).
- Envelopes: sucesso `{ data, requestId }`; lista `{ data, meta,
  requestId }`; erro `{ error: { code, message, details }, requestId,
  timestamp }` (HTTP 401 `AUTH_UNAUTHORIZED`, 403, 409, 422...).
- Base: `EXPO_API_URL` (hecho atual `http://localhost:3000`) + prefixo
  `/api/v1`. Expo só expõe variáveis com prefixo `EXPO_PUBLIC_` — o
  `.env.example` será atualizado para `EXPO_PUBLIC_API_URL` (nunca o
  `.env` real, regra 2).

## 4. Arquitetura da camada nova

```
src/services/api/
  cookieJar.ts      — parse de Set-Cookie, header Cookie, snapshot/restore
  httpClient.ts     — fetch base: URL, Origin fixo, envelopes, erro tipado,
                      refresh automático em 401 e retry uma vez
  authApi.ts        — csrf, register, login, refresh, logout, logout-all
  usersApi.ts       — getMe, patchMe
src/session/
  SessionProvider.tsx — contexto: estado da sessão, bootstrap/restore,
                      login/register/logout, expõe profile
  useSession.ts       — hook de consumo
src/storage/
  secureStorage.ts  — wrapper expo-secure-store (get/set/remove JSON)
```

- `httpClient` usa `fetch` nativo (sem axios — zero dependência nova
  além de `expo-secure-store`). Jar de cookies é manual em JS: captura
  `Set-Cookie` das respostas e monta o header `Cookie`; em memória +
  persistência segura.
- Origem do app: header `Origin: http://localhost:8081` em toda
  requisição (o `CsrfGuard` só compara string).
- Tipos de request/response vêm de `@vers/shared-types` (pacote
  workspace: `packages/shared-types`, `main: ./src/index.ts`).
- Comentários em português em todo código novo (regra 3).

## 5. Mudanças por arquivo

### Novos

| Arquivo | Conteúdo |
| --- | --- |
| `metro.config.js` | Resolver `@vers/shared-types` (watchFolders/extraNodeModules do workspace pnpm). |
| `src/services/api/cookieJar.ts` | Jar manual de cookies (parse, header, snapshot). |
| `src/services/api/httpClient.ts` | Wrapper de fetch + envelopes + refresh 401. |
| `src/services/api/authApi.ts` | Rotas de autenticação tipadas. |
| `src/services/api/usersApi.ts` | `GET/PATCH /users/me` tipados. |
| `src/session/SessionProvider.tsx` | Estado/serviços de sessão. |
| `src/session/useSession.ts` | Hook de consumo. |
| `src/storage/secureStorage.ts` | Wrapper `expo-secure-store`. |

### Alterados

| Arquivo | Mudança |
| --- | --- |
| `App.tsx` | Montar `SessionProvider`; splash espera o restore da sessão (bootstrap). |
| `navigation/RootNavigator.tsx` | Receber `profile` real via sessão; remover `DEMO_PROFILE`. |
| `navigation/AuthNavigator.tsx` | Repassar handlers reais de login/cadastro da sessão. |
| `screens/LoginScreen.tsx` | Props mínimas de submissão/erro (sem mudar o visual). |
| `screens/RegisterScreen.tsx` | Idem. |
| `screens/ProfileScreen.tsx` | Se necessário, props mínimas de edição (`PATCH /users/me`). |
| `jest.setup.js` / `package.json` | Mapear `@vers/shared-types` no Jest; nova dep `expo-secure-store`. |
| `.env.example` | Renomear para `EXPO_PUBLIC_API_URL` (+ nota do prefixo Expo). |
| Testes afetados (nav/screens) | Ajuste aos novos props/provider. |

## 6. Lotes (TDD — regras 4/7; um commit pequeno por lote)

### Lote 0 — spike manual (checklist do programador, sem código de produto)

Com backend no ar (docker, porta 3000) e o Expo dev server (8081):
1. `GET http://localhost:3000/api/v1/health/live` ok.
2. No aparelho/emulador: requisição com header `Origin:
   http://localhost:8081` e captura de `Set-Cookie` (Android e iOS).
   Se a plataforma esconder `Set-Cookie`, documentar e adotar fallback
   (ex.: lib de cookies) — decisão do programador antes do Lote 1.
3. Login manual via curl/HTTPie com CSRF completo, só para conferir o
   fluxo de cookies contra o app.

### Lote 1 — fundação HTTP

- `cookieJar.ts` + `httpClient.ts` + testes (fetch mockado):
  montagem do header `Cookie`, captura de `Set-Cookie`, envelope de
  sucesso/erro, código `error.code`, 401 dispara refresh + retry uma
  vez, Origin fixo presente.

### Lote 2 — endpoints + shared-types

- Config do Metro/Jest para `@vers/shared-types`.
- `authApi.ts` + `usersApi.ts` + testes (fetch mockado, payloads conforme
  contrato: register 202 sem corpo, login 200 com perfil, refresh
  204/200, logout 204, `getMe`, `patchMe` com campos parciais).

### Lote 3 — sessão

- `secureStorage.ts` + `SessionProvider.tsx` + `useSession.ts` + testes:
  bootstrap `restoring/anonymous/authenticated`, persistência/restauração
  do jar, login (reemite CSRF), registro (202 → aviso, sem sessão),
  logout (limpa storage), refresh falho → sessão expira e volta ao
  público.

### Lote 4 — wiring das telas

- `App.tsx`, `RootNavigator`, `AuthNavigator`, `LoginScreen`,
  `RegisterScreen`, `ProfileScreen` + testes de navegação:
  login real autentica; cadastro mostra aviso de e-mail a confirmar;
  perfil mostra `displayName`/`email` reais; `Sair` chama `logout`;
  logout-all em `Sair da conta em todos os aparelhos` (se já existir a
  ação) — se não existir, fica para frente futura.

### Lote 5 — regressão e entrega

- Regressão total + `tsc --noEmit` + `git diff --check`; smoke manual
  com backend docker; registro no contexto do dia; lista de arquivos
  para commit (regra 7).

## 7. Riscos e mitigações

| Risco | Mitigação |
| --- | --- |
| Plataforma esconde `Set-Cookie` | Spike Lote 0; fallback com lib de cookies decidido pelo programador. |
| `Origin` bloqueado em iOS/Android | Header via fetch ok em RN (não é forbidden-header); validar no spike nos dois sistemas. |
| Metro/pnpm + shared-types | `metro.config.js` com watchFolders; se travar, fallback: tipos espelhados (decisão do programador). |
| Expo SecureStore | Dep nativa nova; `npx expo install` na versão do SDK 57. |

## 8. Fora do escopo desta frente

Veículos, instalações, testes experimentais, suporte, energia/telemetria
(F06), deep links, refresh em background, tela de sessão expirada
dedicada (por ora, retorno ao fluxo público), alterações no backend.
