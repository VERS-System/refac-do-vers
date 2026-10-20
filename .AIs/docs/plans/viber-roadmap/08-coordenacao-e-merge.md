<!-- Define divisão de arquivos e ordem de integração para reduzir conflitos entre Viber e o núcleo Electron/backend. -->
# Coordenação e prevenção de conflitos de merge

## 1. Responsáveis e regra de convivência

**Gabriel Domingues:** estrutura da IA, base, orçamento, módulo backend Viber,
ponte e interface Viber, testes e integração do próprio recurso.

**Outra frente:** integração do backend com Electron no núcleo, incluindo
medições, cadastros, autenticação e tempo real conforme seu roadmap.
O nome e a branch dessa frente não foram informados; não atribuí-los por suposição.

Pontos compartilhados recebem uma única edição coordenada por vez. Trabalho
em módulos novos pode avançar sem tocar o lote 4. Isso reduz conflitos, mas
não elimina regressões semânticas: login, filas e cookies precisam de teste conjunto.

## 2. Estado do trabalho em andamento

No levantamento havia mudanças do lote 4 em arquivos de ensaios, tipos,
testes e seu plano. O estado mudou durante a própria sessão. Portanto:

1. Conferir diff e status antes de iniciar cada lote.
2. Não restaurar, sobrescrever, formatar ou incluir em commit alterações alheias.
3. Não criar branch de outro nome presumido nem realizar checkout que arrisque
   trabalho não commitado.
4. Combinar baseline conhecido do núcleo antes da conexão final.
5. Não usar “aceitar tudo de um lado” para resolver main, preload ou tipos.

## 3. Matriz de propriedade e risco

| Área/arquivo | Viber | Núcleo | Estratégia |
| --- | --- | --- | --- |
| `services/ai-service/src/**`, testes e base | Principal | Normalmente sem alteração | Gabriel trabalha em módulos pequenos e novos. |
| `backend/src/modules/viber/**` | Principal | Sem edição esperada | Não importar serviços de dados. |
| `dashboard/src/shared/viber.ts` | Principal | Sem edição esperada | Contrato próprio, sem alterar tipos de ensaios. |
| `dashboard/src/main/viber.ts`, `rede-viber.ts` | Principal | Sem edição esperada | Transporte dedicado, sem refatorar rede-sessao. |
| `dashboard/src/renderer/hooks/useViber.ts` | Principal | Sem edição esperada | Estado efêmero fora de useDados genérico. |
| Tela/componentes Viber e seus testes | Principal | Coordenar se houver toque | Trocar apenas comportamento Viber. |
| `dashboard/src/main/index.ts` | Conexão pequena | Alto uso | Um registro aditivo após estabilizar main da outra frente. |
| `dashboard/src/preload/index.ts` | Expor Viber | Alto uso | Acrescentar propriedade, preservar sessao/cadastro/ensaios. |
| `dashboard/src/shared/sessao.ts` | Tipo da propriedade Viber | Alto uso | Import pequeno; não reescrever Window.vers. |
| `dashboard/src/main/rede-sessao.ts` | Não alterar por padrão | Núcleo | Streaming fica em arquivo próprio. |
| `AplicacaoConectada.tsx`, `App.tsx` | Evitar | Principal | Hook Viber local e desmontagem existentes; seam mínimo só se comprovado. |
| `data/tipos.ts`, `repositorio.tsx`, `repositorioMock.ts`, `useDados.ts` | Evitar | Principal | Não alterar cinco métodos demonstrativos para o novo streaming. |
| `backend/src/app.module.ts` | Import único | Principal | Registro em commit coordenado. |
| Configuração comum/Compose | Configurar Viber | Compartilhado | Patch concentrado; sem reordenar outros serviços. |
| OpenAPI/endpoints/índice | Inserção pequena | Compartilhado | Append local, sem regeneração ou formatação total. |
| Prisma/migrations/telemetria | Fora do escopo | Principal | Nenhuma mudança Viber. |
| `pnpm-lock.yaml` | Evitar | Compartilhado | Não há dependência JS nova prevista. |
| Contexto diário | Append | Compartilhado | Não reescrever o registro da outra frente. |

## 4. Ordem de desenvolvimento e integração

### Lote A — documentação e contratos

Congelar o escopo e fixture do stream. Acordar formato do POST, estados
terminais e cancelamento antes de ligar Python/Nest/Electron.
O plano não exige mexer na lista de métodos de RepositorioVers.

### Lote B — serviço de IA independente

Base runtime, SDK, orçamento e testes com provedor simulado. Não depende de
alterações de Electron e não bloqueia a integração de medições.
Usar o token entre serviços no ensaio isolado, nunca desabilitar segurança para testar.

### Lote C — módulo backend independente

Gabriel escreve DTO/controller/service/testes dentro de modules/viber.
Testar com módulo de teste que importa ViberModule, antes de mexer no AppModule
real. Isso não dispensa o ensaio do bootstrap no lote de conexão.

### Lote D — Electron independente

Tipos Viber, transporte main, hook e tela contra fixture/eventos simulados.
Usar injeção pequena no hook/componente; não mudar o repositório inteiro para testes.

### Lote E — conexão compartilhada

1. Integrar baseline do núcleo estabilizado escolhido pelos programadores.
2. Aplicar mudanças aditivas em main/preload/tipo Window.vers.
3. Conectar módulo backend e configuração mínima.
4. Aplicar patch Compose único para token, base e volume financeiro.
5. Atualizar contratos públicos/índice com links e comportamento SSE.
6. Conferir manualmente que registros de ensaios/cadastro/sessão continuam presentes.
7. Rodar testes/builds do núcleo afetado e ensaio Viber real.

Nenhum cherry-pick/merge/push é executado pelo agente por este documento.
Os programadores escolhem o método de integração compatível com o histórico
real. Se houver checkout separado, sugerir branch `codex/viber-assistente`
somente como nome proposto; este planejamento não criou branch.

## 5. Commits e entregas por push

| Entrega | Commits pequenos sugeridos | Prova antes do push do programador |
| --- | --- | --- |
| 1 — serviço isolado | Base/contrato; geração; orçamento/testes. | Unidade Python e simulação de falhas financeiras. |
| 2 — integração servidor | Módulo backend; configuração/documentação. | Unidade/lint/build + SSE com bootstrap. |
| 3 — Electron | Transporte/hook; tela; conexões comuns. | Unidade/typecheck/build e teste de logout durante stream. |
| 4 — apresentação | Infra final; evidências e roteiro. | Ensaio dev/build e reinício com orçamento preservado. |

Um push representa feature revisável completa dentro dessa entrega, não
rascunhos quebrados entre arquivos. Não misturar código alheio do lote 4.

## 6. Revisão de conflito semântico

Mesmo sem conflito textual, verificar:

- A fila de autenticação não fica presa durante geração longa.
- O novo caminho usa a mesma partição/origem que o núcleo já comprovou.
- A obtenção de CSRF não compete com login/refresh na janela de envio.
- Logout/expiração remove eventos da conversa e não preserva conteúdo de outra conta.
- A ponte do preload conserva todas as operações adicionadas pela outra frente.
- A declaração Window.vers conserva ensaios/cadastros e compila.
- Uma rota SSE não muda os envelopes REST das outras rotas.
- Viber desabilitada não exige chave de IA para executar o núcleo.
- Orçamento não está em diretório temporário do build/container.
- Tela Viber real não chama os métodos antigos de análise demonstrativa.

## 7. Mudanças deliberadamente evitadas

Não refatorar o repositório global, mover pasta do dashboard, trocar gerenciador
de pacotes, padronizar todos os contratos existentes ou retirar fixtures usadas
por outras telas. Código demonstrativo antigo só é removido quando uma busca
de consumidores provar que não atende mais nenhuma tela/teste e isso não amplia
o merge. Para entregar hoje, basta desconectá-lo do fluxo real da Viber.

Aceite desta estratégia: alterações concentradas e revisão conjunta dos pontos
comuns. Não é promessa de ausência total de conflitos.
