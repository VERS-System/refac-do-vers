<!-- Plano de fechamento das interfaces parciais do mobile (Tasks 02, 03 e 04). -->

# Plano — Fechamento das parciais mobile (Tasks 02, 03 e 04)

## 1. Objetivo

Levar Login (02), Cadastro (03) e Home (04) do estado "interface parcial" ao
critério de saída de cada task do `mobile-roadmap`, usando somente estado
visual local (props) e fixtures. Nenhuma integração com backend ou banco de
dados faz parte deste plano: sessão, tokens, unicidade de email, normalização
e regras definitivas de senha continuam no backend (contratos F01/F04, fases
futuras). A sessão segue provisória em memória (`App.tsx`), sem persistência.

## 2. Task 02 — Login

Gaps contra `02-tela-login.md`:

- [ ] remover o botão "Entrar com Google" e o divisor "OR" (sem contrato
      aprovado; regra 8 do roadmap);
- [ ] remover `onGoogleLogin` da tela e atualizar
      `LoginScreen.test.tsx` (o teste atual exige o botão);
- [ ] corrigir typo "Sing up" → "Sign up";
- [ ] revisar textos e idioma da tela;
- [ ] adicionar visibilidade da senha (alternar `secureTextEntry`);
- [ ] criar estados visuais via prop `status`: `idle`, `sending`,
      `genericError`, `unavailable`, `temporarilyBlocked`, `sessionExpired`;
- [ ] erro usa mensagem genérica (sem revelar se o email existe);
- [ ] testes: envio, carregamento, cada estado de erro, navegação ao cadastro,
      foco e leitor de tela.

Arquivos afetados: `src/screens/LoginScreen.tsx`,
`src/screens/__tests__/LoginScreen.test.tsx`.

## 3. Task 03 — Cadastro

Gaps contra `03-tela-cadastro.md`:

- [ ] corrigir "SING UP" → "SIGN UP";
- [ ] revisar textos, idioma e ortografia da tela;
- [ ] criar estados visuais via prop `status`: `idle`, `sending`,
      `conflict` (email já registrado), `genericError`, `success`;
- [ ] manter validação local só como experiência de uso (já existe via
      `evaluatePassword` + confirmação; não antecipar regra do backend);
- [ ] manter retorno explícito ao Login e ausência de CPF/documentos (já ok);
- [ ] testes: formulário incompleto, envio, conflito, erro, sucesso e retorno.

Arquivos afetados: `src/screens/RegisterScreen.tsx`,
`src/screens/__tests__/RegisterScreen.test.tsx`.

## 4. Task 04 — Home

Gaps contra `04-tela-home.md`:

- [ ] exibir período, unidade e qualidade ao lado de cada indicador
      (ex. "últimos 30 dias · Wh · dados parciais");
- [ ] criar estados via props: `loading`, `noInstallation`, `noData`,
      `insufficientQuality`, `error`, `success`;
- [ ] marcar fixtures como dados de amostra até o contrato F06 existir
      (critério: não apresentar simulado como real);
- [ ] navegar aos detalhes por callbacks (bateria, sistema VERS), sem calcular
      nada no cliente;
- [ ] manter Viber evidente e ausência de diagnóstico (já ok);
- [ ] testes: cards, cada estado visual, atalhos e responsividade.

Arquivos afetados: `src/screens/HomeScreen.tsx`,
`src/screens/__tests__/HomeScreen.test.tsx`
(possível novo `src/screens/__tests__/HomeScreen.states.test.tsx`).

## 5. Padrão de implementação (vale para as três)

- Estados chegam por props (ex. `status`, `quality`, `period`), nunca de rede,
  storage ou cálculo local; callbacks (`onLogin`, `onRegister`, atalhos)
  seguem como único ponto de saída.
- TDD: teste unitário antes da implementação, conforme regra 4 do `AGENTS.MD`.
- Comentários em português no topo e nas funções (regra 3 do `AGENTS.MD`).
- Validação por tela: `test:unit` + `tsc --noEmit` em `services/mobile`.

## 6. Fora do escopo (explicitamente não fazer)

- Integração com backend/banco, cookies, tokens, refresh, logout real.
- Login Google, recuperação de senha, qualquer tela sem contrato aprovado.
- Persistência de sessão (AsyncStorage/SecureStore) ou qualquer escrita local.
- Cálculos de potência, energia, eficiência, economia ou tarifa no cliente.
- Telas das Tasks 05–13.

## 7. Entregas (commits pequenos, feitos pelo programador)

1. Task 02 — Login (testes + tela).
2. Task 03 — Cadastro (testes + tela).
3. Task 04 — Home (testes + tela).

Cada entrega só fecha após `test:unit` e `tsc --noEmit` verdes.
