<!-- Plano das telas Login e Criar conta do app desktop (Fase 4 do roadmap). -->

# Plano — Telas Login e Criar conta (desktop)

Referências: `services/dashboard/design-reference/08-login` e
`09-criar-conta`. Task da equipe: D02
(`.AIs/docs/plans/desktop-roadmap/02-telas-autenticacao.md`). Contratos:
`packages/shared-types/src/auth.ts` (`LoginRequest`, `RegisterRequest`) e os
DTOs de `services/backend/src/modules/auth/dto`.

## 1. Decisões (14/10/2026, madrugada — autonomia "escolher e registrar")

O usuário autorizou a IA a escolher as decisões menores e registrá-las como
"a validar". Escolhas, pela fidelidade aos contratos e à D02:

- **Sem autenticação real**: o repositório de exemplo valida como o backend
  (e-mail válido, senha preenchida) e aceita qualquer credencial válida. As
  recusas do backend (credenciais inválidas, limite de tentativas, serviço
  indisponível) viram erros tipados que a tela trata; os testes os simulam.
- **Login social (Google e Apple) fora**, como manda a D02 ("excluir Google
  … enquanto não houver contrato").
- **"Esqueci a senha"** fica visível, mas avisa "Recuperação de senha
  disponível com a API" (o backend tem os DTOs, mas não há tela nem fluxo
  combinado no app).
- **"Manter conectado" fora**: a sessão é por cookies com duração definida
  pelo backend; o contrato não tem essa opção.
- **Sessão encerrada/expirada**: o Login mostra o aviso quando chega de
  "Encerrar todas as sessões" (Configurações) ou de uma sessão expirada.
- **Criar conta em três etapas** (Conta, Veículo, Instalação), como o
  Stitch. Conta segue o `RegisterRequest` (nome opcional, e-mail, senha com
  as regras do `RegisterDto`: 8 caracteres, 1 maiúscula, 1 caractere
  especial, sem espaços). Veículo segue o `CreateVehicleRequest` (placa
  obrigatória; fabricante, modelo e ano opcionais). Instalação explica que o
  ESP32 e os piezos são associados depois do primeiro acesso.
- **Envio**: só a conta vai ao repositório (`registrar`). Na API, o veículo
  só pode ser criado depois da confirmação do e-mail e do login, então a
  tela final diz isso com a placa informada, sem fingir que foi salvo.
  **Atualizado em 16/10/2026**: o veículo fica guardado no computador e é
  gravado no primeiro acesso (`desktop-frontend-veiculo-no-cadastro.md`).
- **Sem enumeração de contas**: como o backend responde igual para e-mail
  novo ou já cadastrado, a tela final diz "Se o e-mail puder ser usado,
  você receberá um link de confirmação".

## 2. Como fica

### Login

- E-mail (`autocomplete="email"`) e senha (`current-password`) com botão
  "Mostrar senha" (`aria-pressed`).
- Validação no envio: "Informe um e-mail válido." e "Informe a senha.", com
  foco no primeiro campo inválido.
- Enviando: botão "Entrando…" desativado. Erros em `role="alert"`:
  - credenciais inválidas → "E-mail ou senha incorretos.";
  - limite de tentativas → "Muitas tentativas. Aguarde alguns minutos e
    tente de novo.";
  - indisponível ou outro → "Não foi possível entrar agora. Tente de novo
    em instantes.".
- Sucesso leva à Visão geral.

### Criar conta

- Etapas em lista ordenada (`aria-current="step"`) com "Conta", "Veículo" e
  "Instalação"; etapas concluídas ganham check.
- Conta: requisitos da senha ao vivo (cada um "atendido" ou "pendente" para
  leitores de tela); "Continuar" valida e-mail, requisitos e confirmação
  ("As senhas não coincidem.").
- Veículo: placa validada com `normalizarPlaca` ("Informe uma placa válida,
  como ABC1D23."), ano com 4 dígitos.
- Instalação: resumo (e-mail e veículo) e o que acontece depois; "Criar
  conta" envia; "Voltar" em todas as etapas preserva o que foi digitado.
- Final: "Confirme seu e-mail" e "Ir para o Login".

## 3. Arquivos

- `data/erros.ts`: códigos `credenciais-invalidas` e `limite-tentativas`.
- `data/tipos.ts`: `Credenciais` e `NovaConta` (espelham os contratos).
- `data/repositorio.tsx` e `data/repositorioMock.ts`: `entrar` e
  `registrar`, validando como os DTOs.
- `data/calculos.ts`: `requisitosSenha` e `emailValido`.
- `hooks/useDados.ts`: `useAcoesAutenticacao`.
- `App.tsx`: aceita um repositório opcional (para os testes simularem
  recusas).
- `components/autenticacao/` (campo de senha, etapas, requisitos),
  `pages/LoginPage.tsx`, `pages/CriarContaPage.tsx` e testes.
- `components/configuracoes/Secoes.tsx`: encerrar sessões avisa o Login.

## 4. Divergências com o Stitch

| Onde | Stitch | Implementação | Motivo |
|---|---|---|---|
| Login social | Google e Apple | fora | D02 e sem contrato |
| Manter conectado | caixa marcada | fora | sem opção no contrato |
| Esqueci a senha | link | aviso "disponível com a API" | sem fluxo combinado |
| Etapas Veículo e Instalação | não desenhadas | seguem o padrão da etapa Conta | só a etapa 1 existe no Stitch |

## 5. Validação

TDD, `npm run test:unit`, build, Prettier, prints em 1280 e 1512 px. Sem
commit (regra 7).

## 6. A validar pelo programador

- Login social e "Manter conectado" fora; "Esqueci a senha" só avisa.
- ~~Etapa Veículo antes da confirmação do e-mail: os dados não são
  enviados.~~ **Resolvido em 16/10/2026** (decisão do usuário, opção B): o
  veículo fica guardado no computador e é gravado no primeiro acesso, pela
  tela Primeiro veículo. Plano em `desktop-frontend-veiculo-no-cadastro.md`.
- Nome opcional (o contrato aceita conta sem `displayName`).
- "Sem espaços" aparece atendido com a senha vazia (é verdade para o texto
  vazio; a referência também o mostra verde).

## 7. Execução (14/10/2026)

- TDD: 20 testes vermelhos antes da implementação (validadores, repositório,
  Login, Criar conta e o teste do App que entrava sem credenciais), todos
  falhando por asserção.
- Implementado: códigos `credenciais-invalidas` e `limite-tentativas`;
  `Credenciais` e `NovaConta`; `requisitosSenha`, `senhaValida` e
  `emailValido`; `entrar` e `registrar` no repositório de exemplo;
  `useAcoesAutenticacao`; `App` com repositório opcional;
  `components/autenticacao/Campos.tsx` (campo de senha, requisitos, etapas,
  aviso de erro); as duas páginas; Configurações avisa o Login ao encerrar
  as sessões.
- Resultado: 449 testes passando sem avisos, `tsc` e build ok, prints em
  1280 e 1512 px (Login com erros de validação e etapa Conta) conferidos.
