<!-- Subdivisão da Task 02 (Login) em sub-entregas pequenas e testáveis. -->

# Plano — Task 02 Login em sub-entregas

Derivado de `.agents/docs/plans/mobile-fechamento-parciais-02-04.md`.
Cada sub-entrega segue TDD (teste antes da tela) e vira um commit pequeno
feito pelo programador. Estados chegam por props; sem backend, sem
persistência, sem Google.

## 02a — Limpeza (Google, typo, textos)

- Remover botão "Entrar com Google", divisor "OR", prop `onGoogleLogin`,
  estilos `googleButton/googleIcon/googleCTA/socialTitle` e import de `Image`
  (vira unused) em `src/screens/LoginScreen.tsx`.
- Corrigir "Sing up" → "Sign up"; revisar demais textos da tela.
- Atualizar `src/screens/__tests__/LoginScreen.test.tsx`: remover caso do
  Google, manter envio de credenciais e abertura do cadastro.
- Aceite: nenhum "Google" em tela/teste; `test:unit` + `tsc --noEmit` verdes.

## 02b — Visibilidade da senha

- Alternar `secureTextEntry` do campo de senha por botão com
  `accessibilityLabel` bilíngue claro e `accessibilityRole="button"`.
- Testes: alterna visível/oculto, rótulo acessível correto nos dois estados.
- Aceite: leitor de tela anuncia o estado; senha oculta por padrão.

## 02c — Envio/carregamento

- Nova prop `status: 'idle' | 'sending' | ...` (nome: `LoginStatus`);
  em `sending`, botão exibe carregamento, fica desabilitado e ignora toques.
- Testes: estado de envio renderiza indicador, bloqueia reenvio, volta ao
  `idle` quando a prop muda.
- Aceite: impossível duplo envio pelo estado visual.

## 02d — Erro genérico

- Estado `genericError` com mensagem pública fixa (sem revelar se o email
  existe), mantendo campos preenchidos.
- Testes: mensagem exibida, credenciais preservadas, retorno ao `idle`.
- Aceite: texto alinhado ao contrato (mensagem genérica de credenciais).

## 02e — Indisponibilidade

- Estado `unavailable` (backend fora): mensagem distinta + botão de tentar de
  novo (reemite `onLogin` com os mesmos dados).
- Testes: mensagem, tentativa repete o envio, campos preservados.
- Aceite: diferencia-se visualmente do erro genérico.

## 02f — Bloqueio temporário

- Estado `temporarilyBlocked`: mensagem de bloqueio + orientação de espera,
  envio desabilitado.
- Testes: bloqueio impede `onLogin`, mensagem correta.
- Aceite: sem contagem regressiva real (visual apenas).

## 02g — Sessão expirada

- Estado `sessionExpired`: informa que a sessão anterior expirou, sem
  detalhes de segurança; formulário limpo e pronto para novo acesso.
- Testes: mensagem exibida, campos prontos para preenchimento.
- Aceite: não revela tokens, prazos internos ou motivos técnicos.

## 02h — Acessibilidade e validação final da Task 02

- Conferir foco, ordem de leitura, alvos de toque e rótulos em todos os
  estados; nenhuma regressão nos testes 02a–02g.
- Aceite (critério de saída da Task 02): fluxo visual de entrada completo,
  `test:unit` e `tsc --noEmit` verdes, pronto para o contrato de sessão.

Arquivos em todas as sub-entregas: `src/screens/LoginScreen.tsx` e
`src/screens/__tests__/LoginScreen.test.tsx`.
