<!-- Plano do cadastro do veículo no Criar conta do app desktop: guardar no computador e gravar no primeiro acesso (opção B). -->

# Plano — Veículo do Criar conta gravado no primeiro acesso (desktop)

Pedido do usuário em 16/10/2026: o Criar conta precisa cadastrar o veículo
também. Hoje a etapa Veículo descarta os dados, porque na API o veículo só
pode ser criado por uma conta logada (`POST /vehicles`, com sessão) e a conta
nova nasce `PENDING_VERIFICATION`, sem login.

## 1. O que o banco e o backend oferecem (16/10/2026)

- `vehicles`: id (UUID), `license_plate` única, `brand`, `model`,
  `model_year`. `user_vehicles`: vínculo conta ↔ carro com `relationship`
  (OWNER, DRIVER, ADMIN) e `is_primary`.
- `POST /vehicles` cria carro e vínculo OWNER numa transação; o primeiro
  carro da conta vira principal. Exige sessão de conta `ACTIVE`.
- `POST /auth/register` cria a conta `PENDING_VERIFICATION` e responde 202
  igual para e-mail novo ou repetido. **Não existe ativação**: nenhum código
  muda a conta para `ACTIVE` (a documentação da API diz "a ativação será
  definida em fase futura"). Pendência do backend.

## 2. Decisão do usuário

Opção B: sem mudança no backend. O Criar conta guarda o veículo no
computador e, no primeiro login com aquele e-mail, o app abre "Cadastre seu
veículo" já preenchido; ao confirmar, grava pelo `POST /vehicles`
(`criarVeiculo` no repositório).

Motivos: usa só o que existe; não prende placas em contas nunca confirmadas
(a placa é única); não revela placas nem e-mails no cadastro público; não
depende de como a ativação for feita. Custo: se o primeiro login for em outro
computador, o formulário vem vazio.

## 3. Como fica

- **Criar conta**: a etapa Veículo continua igual (mesma validação). Depois
  do envio da conta, o app guarda e-mail, placa, fabricante, modelo e ano no
  `localStorage` (chave `vers:veiculo-do-cadastro`; um só registro, o último
  cadastro). Senha nunca é guardada. A tela final diz que o veículo fica
  guardado neste computador e é cadastrado no primeiro acesso.
- **Login**: depois de entrar, se houver veículo guardado para aquele e-mail
  (sem diferenciar maiúsculas), vai para `/primeiro-veiculo`; senão, para a
  Visão geral, como hoje.
- **Primeiro veículo** (`/primeiro-veiculo`, fora do shell, no layout do
  Login): título "Cadastre seu veículo", campos preenchidos com o que foi
  digitado no cadastro e editáveis, botões "Cadastrar veículo" e "Pular por
  agora".
  - Cadastrar: valida como a etapa Veículo, grava, apaga o registro guardado
    e vai para a Visão geral. Recusa (placa repetida, serviço fora) aparece
    no aviso de erro e o registro continua guardado.
  - Pular: apaga o registro e vai para a Visão geral; o carro pode ser
    cadastrado depois na tela Veículos.
  - Sem registro guardado (acesso direto à rota): vai para a Visão geral.
- **Peças comuns**: validação e campos do veículo saem do `CriarContaPage`
  para `components/autenticacao/CamposVeiculo.tsx`, usados pelas duas telas.

## 4. Arquivos

- Novo `data/veiculoDoCadastro.ts` (guardar, ler por e-mail, apagar; leitura
  e escrita protegidas com try/catch) e teste.
- Novo `components/autenticacao/CamposVeiculo.tsx`.
- Novo `pages/PrimeiroVeiculoPage.tsx` e teste.
- `pages/CriarContaPage.tsx` (+ teste), `pages/LoginPage.tsx` (+ teste),
  `routes/navegacao.ts` (`ROTAS.primeiroVeiculo`), `App.tsx` (rota).
- Docs: este plano, `desktop-frontend-autenticacao.md`, roadmap e contexto.

## 5. Validação

TDD (testes vermelhos antes), `npm run test:unit`, `npm run build`,
Prettier e print do Criar conta (tela final) e do Primeiro veículo.
Commit só se o programador pedir (regra 7).

## 6. A validar pelo programador

- O convite aparece sempre que há veículo guardado para o e-mail, mesmo se a
  conta já tiver carros (no exemplo, o login entra numa conta com dois). Na
  API real, a conta nova não terá carros; um e-mail já cadastrado que passou
  pelo Criar conta neste computador também recebe o convite, e pode pular.
- O registro fica no computador até ser usado ou pulado (sem prazo).
- Backend: definir a ativação da conta (link por e-mail, código ou liberação
  por administrador). Sem ela, nenhuma conta criada pelo app consegue entrar.

## 7. Execução (16/10/2026)

- TDD: 8 testes vermelhos por asserção antes da implementação (módulo só
  com as assinaturas): registro guardado, Criar conta, Login e a tela.
- Implementado: `data/veiculoDoCadastro.ts`;
  `components/autenticacao/CamposVeiculo.tsx` (campos e validação, agora
  usados pelo Criar conta e pela tela nova); `pages/PrimeiroVeiculoPage.tsx`
  e a rota `/primeiro-veiculo`; Criar conta guarda o veículo (placa já
  normalizada) depois do envio da conta e a tela final diz que ele é
  cadastrado no primeiro acesso; Login leva ao Primeiro veículo quando há
  veículo guardado para o e-mail.
- Um teste estava errado ao exigir que o `localStorage` só tivesse a chave
  do veículo (as preferências também ficam lá); passou a olhar só as chaves
  do veículo.
- Resultado: 61 arquivos e 474 testes passando, `tsc` e build ok, Prettier
  aplicado, print da tela em 1280 px.
