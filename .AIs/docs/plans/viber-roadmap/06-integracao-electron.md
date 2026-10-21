<!-- Planeja streaming real da Viber no Electron sem alterar o transporte comum de sessão e medições. -->
# Etapa 6 — Electron e interface

## 1. Objetivo e decisão de isolamento

Conectar Viber preservando login, cadastro, medições e o lote de tempo real.
O escopo novo é diferente das sugestões de análise demonstrativa atuais.
Não adaptar a assinatura de todos os métodos de `RepositorioVers` para streaming.

Criar uma ponte Viber e hook próprios, testáveis por injeção, sem novas
bibliotecas. Reutilizar Page, Card, Button, tipografia, cores e ViberMark.
Reutilizar o componente Mensagem quando ele aceitar texto sem anexo/fonte;
não converter respostas em medições ou recomendações automaticamente.

## 2. Arquivos próprios e pontos comuns

| Arquivo candidato | Natureza |
| --- | --- |
| `src/shared/viber.ts` | Novo: tipos IPC/eventos/payload. |
| `src/main/viber.ts` | Novo: operação fixa, ciclo e autorização de remetente. |
| `src/main/rede-viber.ts` | Novo se necessário: transporte incremental e parser SSE. |
| `src/main/viber.test.ts`, `rede-viber.test.ts` | Novos: provas do transporte/segurança. |
| `src/preload/viber.ts` | Novo se o bundler aceitar; senão ponte curta no index existente. |
| `src/renderer/hooks/useViber.ts` | Novo: conversa efêmera, deltas e descarte. |
| `src/renderer/hooks/useViber.test.tsx` | Novo: fluxo e desmontagem. |
| `src/renderer/pages/ViberIaPage.tsx` e teste | Alteração Viber: sem contexto de carro ou conversas fictícias. |
| `src/renderer/components/viber/PainelConversa.tsx` e testes | Alteração Viber: novo fluxo incremental. |
| `src/renderer/components/viber/Mensagem.tsx` e testes | Alteração mínima se precisar de estado parcial/preservação de quebras. |
| `src/main/index.ts` | Conexão pequena, coordenada, ao final. |
| `src/preload/index.ts` | Expor propriedade Viber, preservando as demais. |
| `src/shared/sessao.ts` | Conexão do tipo de `window.vers` já declarado aqui. |

Prefixo `src` nesta tabela é `services/dashboard/src`. Confirmar nomes efetivos
de testes e entrypoints antes de escrever. Não criar arquivos só para cumprir
esta lista se a solução puder ficar legível em menos módulos.

## 3. Main: autenticação sem travar o aplicativo

1. Reutilizar validação de URL local e remetente/janela/frame existentes.
2. Usar a mesma partição `persist:vers-api`; não copiar cookies para o renderer.
3. Reutilizar a consulta/renovação de perfil existente antes de iniciar geração.
4. Coordenar obtenção de CSRF e **envio inicial** do POST com a fila da sessão,
   evitando que login/logout/refresh troquem cookies entre essas duas ações.
5. Depois de o pedido ser enviado com os headers corretos, liberar a fila;
   a duração inteira do stream não fica enfileirada com login/cadastro.
6. Se a sessão mudar nessa janela inicial, abortar a tentativa em vez de
   reenviar um POST que talvez tenha começado a gerar.
7. Manter referência cancelável da tentativa ativa por janela e requestId.
8. Logout, logout-all, troca de identidade ou fechamento abortam tentativa ativa.
   Um callback pequeno no ponto comum de sessão pode fazer esse cancelamento;
   não colocar regra Viber dentro do serviço de autenticação.
9. Não repetir geração depois de 401, 429 ou queda. A UI pede nova tentativa.

Alteração na fila/coordenação é ponto de atenção explícito para a outra frente.
Provar que um logout durante resposta longa executa rapidamente e não espera
quarenta e cinco segundos pela IA.

## 4. Transporte incremental

O `fetchDaSessao` atual junta todos os buffers antes de criar Response. Preservá-lo
para sessão/cadastros; o novo caminho usa `net.request` e trata cada chunk.
Mesma política de Origin fixo, cookies de sessão e recusa de redirects.

Não aplicar timeout de dez segundos do transporte REST indiscriminadamente
a uma resposta de IA. Usar os prazos específicos e limites de bytes da Viber.
Parser segue a [etapa 3](03-contratos-e-streaming.md), com UTF-8 incremental,
buffers limitados e terminal obrigatório. Se houver stream pausado pelo cliente,
limitar fila de IPC e cancelar em excesso; não crescer memória indefinidamente.

Somente enviar eventos tipados ao webContents original. Não emitir para todas
as janelas. Cancelamento de uma janela não pode alcançar tentativa de outra.

## 5. Preload e tipos

Expor `window.vers.viber` sem substituir o objeto inteiro de sessão/cadastro.
A declaração atual de Window.vers está em `shared/sessao.ts`; declarar outra
versão incompatível em arquivo novo produziria conflito de TypeScript.
Preferir importar PonteViber e adicionar uma propriedade pequena no tipo atual,
por último, junto com as demais conexões coordenadas.

Validar retornos na fronteira; `aoEvento` entrega somente dados, não evento IPC
ou funções com acesso ao main. A função de unsubscribe remove o listener exato.
O registro dos listeners não pode crescer a cada render ou nova pergunta.

## 6. Interface proposta

| Elemento atual | Mudança necessária |
| --- | --- |
| Subtítulo “interpreta seus dados” | “Tire dúvidas sobre o VERS e seu funcionamento.” |
| Contextos Hoje/Semana/Teste | Retirar do fluxo real; não enviar contexto individual. |
| Sugestões sobre queda de eficiência | “Como o VERS funciona?”, “Para que servem os sensores?”, “Como usar a telemetria?”. |
| Conversas recentes fictícias | Ocultar nesta versão sem histórico. |
| Painel lateral | Pode virar ajuda breve sobre assuntos disponíveis; não requer redesign. |
| “Nova conversa” | Limpar memória e cancelar tentativa atual. |
| Campo “sobre seus dados” | “Pergunte sobre o VERS…”. |
| Resposta final única | Uma bolha estável recebe deltas e estado de conclusão. |
| Fontes/anexos | Sem preenchimento fictício; `null` se reutilizar MensagemViber atual. |
| Classificação | Explicação quando aplicável; não inventar medição/inferência estruturada. |

Não inferir a natureza da resposta por palavras-chave. Não adicionar outra
chamada paga só para classificar texto. Avisos do caráter experimental ficam
na base e no conteúdo quando pertinentes.

## 7. Estado mínimo do hook

`idle → connecting → streaming → cooldown → idle`, com `error` e `cancelled`
como estados terminais da tentativa. Cada tentativa tem ID e texto acumulado.
O contador de pausa é separado do histórico e comandado pelo servidor.

- Registrar listener antes do envio; limpar no terminal/desmontagem.
- Deltas de requestId antigo não alteram a conversa atual.
- Mensagem do usuário aparece uma vez; resposta tem ID estável.
- Pergunta só deixa o campo quando a tentativa foi admitida; guardar cópia
  para restaurar após falha sem texto. Cancelamento não duplica pergunta.
- Histórico seguinte inclui apenas pares completos confirmados; nunca uma
  resposta parcial, um erro de rede ou metadados como texto do modelo.
- Nova conversa e unmount cancelam tentativa e limpam estado.
- Rotas protegidas existentes continuam como estão; backend é a barreira real.

## 8. Acessibilidade e texto

Mostrar texto como texto React, com quebras preservadas e quebra de palavras
longas. Não usar HTML remoto/dangerouslySetInnerHTML. Sem dependência Markdown
para esta entrega textual. Pedir listas simples e fórmulas legíveis ao modelo.

Manter nome acessível de enviar/cancelar e foco no campo. `role=log` não deve
anunciar cada token: usar estado de ocupado e anúncio resumido ao concluir,
enquanto o texto incremental permanece visualmente disponível.
Autoscroll só se a pessoa estiver perto do fim; respeitar leitura de mensagens
anteriores e a preferência de reduzir movimento.

Controle opcional: “Explicar fundamentos” antes do envio. Uma solicitação após
a resposta é nova pergunta, passa por pausa/orçamento e não ocorre automaticamente.
Sem interface intitulada “raciocínio interno”.

## 9. Testes e aceite

- [ ] Sem ponte Electron: estado indisponível, sem fallback de respostas falsas.
- [ ] Pergunta livre produz texto progressivo no mesmo componente.
- [ ] Fragmentos chegam antes do terminal e preservam acentos/quebras.
- [ ] Clicar duas vezes não cria duas gerações.
- [ ] Cancelar/nova conversa/desmontagem remove listeners e ignora deltas antigos.
- [ ] Falha inicial preserva pergunta; falha parcial mostra resposta incompleta.
- [ ] Cooldown informa espera e não permite contornar regra ao limpar conversa.
- [ ] Nenhum hook de dados de carro/teste é chamado ao usar a tela.
- [ ] Logout durante stream funciona e apaga conversa da conta anterior.
- [ ] Componentes atuais fora da Viber não mudaram comportamento.

Rodar `npm run test:unit`, `npm run typecheck` e `npm run build` no dashboard,
sem carregamento automático de `.env`. Provar dev e loadFile/build reais.
Se o preload sandbox não aceitar importação do módulo novo, ajustar apenas o
empacotamento da ponte; nunca desligar sandbox/contextIsolation para facilitar.

Commit sugerido do módulo próprio: `feat: transmitir respostas Viber no Electron`.
Conexões compartilhadas ficam em commit separado definido na etapa 8.
