<!-- Subdivisão da Task 03 (Cadastro) em sub-entregas pequenas e testáveis. -->

# Plano — Task 03 Cadastro em sub-entregas

Cada sub-entrega segue TDD (teste antes da tela) e vira um commit pequeno
feito pelo programador. Estados chegam por props; sem backend, sem
persistência. Validação local segue só como experiência de uso; unicidade,
normalização e regras definitivas são do backend (F04).

## 03a — Limpeza (typo, textos)

- Corrigir "SING UP" → "SIGN UP"; revisar textos, idioma e ortografia.
- Testes existentes continuam verdes; nenhum comportamento muda.
- Aceite: `test:unit` + `tsc --noEmit` verdes.

## 03b — Visibilidade da senha e da confirmação

- Aplicar o alternador `Ionicons` (`eye-outline`/`eye`, prop `trailing` do
  `AuthTextField`, padrão da 02b) nos dois campos.
- Testes: cada campo alterna independente, rótulos "Mostrar/Ocultar senha".
- Aceite: leitor de tela anuncia os dois estados em cada campo.

## 03c — Envio/carregamento

- Nova prop `status: RegisterStatus` (`idle`, `sending`, `conflict`,
  `genericError`, `success`); em `sending`, botão desabilitado, indicador
  "Enviando" e guarda anti-reenvio (mesmo padrão da 02c).
- Testes: indicador, botão desabilitado, sem reenvio.
- Aceite: impossível duplo envio pelo estado visual.

## 03d — Conflito (email já registrado)

- Estado `conflict` com mensagem pública ("Este email já está em uso...")
  sem vazar dados; campos preservados; botão segue ativo para corrigir e
  reenviar.
- Testes: mensagem, campos preservados, reenvio funciona.
- Aceite: mensagem não confirma nada além do conflito de cadastro.

## 03e — Erro genérico

- Estado `genericError` com mensagem fixa, campos preservados, reenvio ativo
  (mesmo padrão da 02d).
- Testes: mensagem, preservação, reenvio.
- Aceite: distingue-se do conflito.

## 03f — Sucesso

- Estado `success`: confirmação de conta criada + orientação de ir ao Login
  (sem navegar sozinho: navegação é do pai por callback); envio desabilitado.
- Testes: mensagem de sucesso, sem reenvio, retorno ao Login intacto.
- Aceite: não antecipa sessão nem tokens.

## 03g — Acessibilidade e validação final da Task 03

- Nome+papel em todos os botões, requisitos anunciados (já existe),
  ordem de leitura, alvos de toque; regressão total.
- Aceite (critério de saída da Task 03): fluxo visual completo,
  `test:unit` e `tsc --noEmit` verdes, pronto para o contrato F04.

Arquivos em todas as sub-entregas: `src/screens/RegisterScreen.tsx` e
`src/screens/__tests__/RegisterScreen.test.tsx`.
