<!-- Plano da tela Veículos (cadastro de carros) do app desktop. -->

# Plano — Tela Veículos (desktop)

Pedido do usuário em 15/10/2026: uma tela para cadastro de carro. No começo
cada carro funciona pelo ID; quando o sistema for real, o chassi passa a
identificar cada um. Não há tela de veículos no Stitch: a tela segue o
visual das telas já implementadas. Task da equipe: D09
(`.AIs/docs/plans/desktop-roadmap/09-telas-perfil-veiculos.md`). Contratos:
`packages/shared-types/src/vehicles.ts` e
`services/backend/src/modules/vehicles`.

## 1. Decisões do usuário (15/10/2026)

- **Tela própria "Veículos" na sidebar**, com lista, cadastro, detalhes e
  edição, como a D09. "Veículo e instalação" continua mostrando o carro ativo
  e a instalação.
- **ID gerado pelo sistema**: o backend cria o `id` (UUID) ao cadastrar; a
  tela mostra o ID só para leitura, com botão de copiar.
- **Chassi opcional já validado**: 17 caracteres, letras e números sem I, O
  e Q (padrão VIN). Fica só no repositório de exemplo: o backend ainda não
  tem a coluna, que precisa existir antes de o chassi virar identificador.
- **Perfil continua nas Configurações** (seção Perfil); nenhuma tela nova
  de perfil.

## 2. Como fica

- Rota `/veiculos`, item "Veículos" na sidebar, antes de "Veículo e
  instalação".
- Cabeçalho "Veículos" com o botão "Novo veículo".
- **Lista "Seus veículos"** (tabela): veículo (fabricante e modelo, placa),
  ID curto (8 primeiros caracteres), chassi, relação e o selo "Principal".
  Clicar numa linha mostra os detalhes; começa no principal.
- **Detalhes**: ID completo com "Copiar ID", placa (não muda depois do
  cadastro), chassi, fabricante, modelo, ano, relação, data do cadastro e a
  instalação vinculada, se houver. Ações:
  - "Editar": fabricante, modelo e ano; o chassi pode ser informado uma vez,
    enquanto estiver vazio, e depois não muda (como a placa);
  - "Tornar principal", com confirmação;
  - "Remover", com confirmação.
- **Remover** segue o backend (`DELETE /vehicles/:id`):
  - se o removido é o principal e sobram dois ou mais carros, é preciso
    escolher qual vira principal;
  - se sobra um, ele vira principal e o diálogo avisa;
  - carro com instalação do VERS: no backend, a instalação é apagada junto.
    No exemplo, a remoção fica desativada com "disponível com a API", para
    não deixar a instalação de exemplo órfã.
- **Novo veículo**: placa (obrigatória e única), chassi (opcional e único),
  fabricante, modelo e ano. Depois de salvar, o carro novo fica selecionado
  e a tela mostra "Veículo cadastrado." com o ID gerado.
- Erros: placa ou chassi repetido ("Já existe um veículo com a placa …"),
  validação, carro não encontrado e serviço fora, nos padrões das outras
  telas.

## 3. Arquivos

- `data/tipos.ts`: `chassi` em `Veiculo`, `NovoVeiculo` e
  `AtualizacaoVeiculo`.
- `data/calculos.ts`: `normalizarChassi`.
- `data/cadastroEmMemoria.ts`: IDs em UUID, chassi (validação, unicidade,
  só pode ser preenchido uma vez) e `remover` com substituto.
- `data/fixtures/sistema.ts`: IDs dos veículos de exemplo em formato UUID.
- `data/repositorio.tsx`, `data/repositorioMock.ts`: `removerVeiculo`.
- `hooks/useDados.ts`: `remover` em `useAcoesVeiculo`.
- `routes/navegacao.ts`, `App.tsx`: rota e item da sidebar.
- `components/veiculos/` (lista, detalhes, formulário, diálogos) e
  `pages/VeiculosPage.tsx`, com testes.

## 4. Validação

TDD, `npm run test:unit`, build, Prettier e prints em 1280 e 1512 px.
Commit só se o programador pedir (regra 7).

## 5. A validar pelo programador

- Ícone e posição do item "Veículos" na sidebar.
- Chassi preenchível uma vez e depois fixo.
- Remoção desativada no exemplo para carros com instalação.
- "Veículo e instalação" mantém os diálogos de editar, adicionar e tornar
  principal; a alternativa é levar essas ações só para a tela Veículos.
- Backend: coluna `vin` (chassi) única em `vehicles` e nos contratos, antes
  de usar o chassi como identificador.

## 6. Execução (15/10/2026)

- TDD: 17 testes vermelhos antes da implementação, todos por asserção
  (chassi, IDs em UUID, remoção, rota, sidebar e a tela).
- Implementado: `normalizarChassi`; IDs dos veículos de exemplo em UUID
  (`ID_CIVIC`, `ID_STRADA`) e IDs novos com `crypto.randomUUID()`; chassi
  no cadastro em memória (validação, unicidade, preenchido uma vez);
  `removerVeiculo` com as regras do backend; `remover` em
  `useAcoesVeiculo`; rota `/veiculos` e item "Veículos" (ícone `CarFront`)
  antes de "Veículo e instalação"; `components/veiculos/` (lista,
  formulários, detalhes e diálogo de remoção) e a página. "Tornar
  principal" reaproveita o diálogo da tela Veículo e instalação.
- Ajustes visuais nos prints: placa e chassi empilhados no "Novo veículo"
  (o chassi ficava cortado em 1280 px) e rótulo curto do ID; a placa saiu
  do cabeçalho dos detalhes (aparecia duas vezes).
- Resultado: 465 testes passando (a suíte rodou com um processo por vez:
  a máquina estava com menos de 1 GB de memória livre e os processos
  paralelos não iniciavam), `tsc` e build ok, prints em 1280 e 1512 px.
