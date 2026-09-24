# Plano — Animação da logo na transição Login/Cadastro

## Objetivo

Animar as três barras do logotipo do VERS (agora vetor SVG) com efeito bounce
na transição entre as telas de Login e Cadastro, fazendo as barras "se
encaixarem" individualmente com atraso entre elas.

## Regras da animação

- **Entrando no Cadastro** (Login → Register): a barra da **direita** entra
  primeiro, depois a do **meio** e, por último, a da **esquerda**.
- **Entrando no Login** (Register → Login ou primeira abertura): a barra da
  **esquerda** entra primeiro, depois a do **meio** e, por último, a da
  **direita**.
- Cada barra parte deslocada horizontalmente (para "encaixar" no lugar) e
  volta com `Animated.spring` (fricção baixa → efeito bounce).
- O atraso entre o início de cada barra é fixo (`LOGO_BAR_DELAY_MS`).
- A logo do Login passa a ficar no topo da tela, como no Cadastro.
- Splash, Home e BottomNavigation continuam sem animação.

## Revisão da animação (decidida pelo programador)

A animação anterior (deslizar pequeno deslocamento) foi substituída:

- **Login/Cadastro:** cada barra sai pelo lado da tela e entra pelo outro lado,
  depois centraliza, mantendo o bounce. Ao entrar no Cadastro as barras saem
  pela direita e voltam pela esquerda; ao entrar no Login, o inverso. A ordem
  escalonada permanece (Cadastro: direita→meio→esquerda; Login:
  esquerda→meio→direita). A distância de saída é a largura da tela.
- **SplashScreen:** a logo inteira parte do centro da tela e converge para o
  topo, na mesma posição em que fica nas telas de Login/Cadastro.

### Revisão — primeira exibição do Login sem animação

O Login não anima a logo na primeira vez em que é exibido (logo após a splash),
para evitar estranhamento; reanima nos focos seguintes, vindo do Cadastro. O
Cadastro sempre anima, pois só é acessado via navegação. O disparo é controlado
por um contador de focos com opção de pular a primeira execução
(`useFocusLogoAnimationRun(skipInitial)`).

## Arquivos afetados

- `services/mobile/src/components/logoAnimation.ts` (novo) — plano puro da
  animação (ordem, atrasos, deslocamentos) testável isoladamente.
- `services/mobile/src/components/VersLogo.tsx` — recebe props `animation` e
  `animationRun` e aplica o spring escalonado em cada barra.
- `services/mobile/src/screens/LoginScreen.tsx` — logo no topo + `animation="login"`.
- `services/mobile/src/screens/RegisterScreen.tsx` — `animation="register"`.
- `services/mobile/src/navigation/AuthNavigator.tsx` — dispara reanimação via
  `useFocusEffect` ao focar cada rota.
- `services/mobile/src/navigation/focusRunCounter.ts` (novo) — contador de focos
  com função pura `nextFocusRun` e hook `useFocusLogoAnimationRun`; permite
  pular a animação na primeira exibição do Login.
- Testes:
  - `services/mobile/src/components/__tests__/logoAnimation.test.ts` (novo).
  - `services/mobile/src/components/__tests__/VersLogo.test.tsx` (estendido).
  - testes das telas mantidos.

## Metodologia

TDD: escrever os testes do plano e da integração → comprovar falha → implementar
→ rodar `npm run test:unit` e garantir sucesso.