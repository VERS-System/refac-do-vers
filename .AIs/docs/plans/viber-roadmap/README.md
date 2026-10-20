<!-- Roadmap principal da Viber consultiva, com etapas executáveis e coordenação com a integração Electron/backend. -->
# Viber — roadmap de implementação e integração

Data de referência: **20/10/2026**, America/Sao_Paulo.
Responsável pela estrutura de IA e integração: **Gabriel Domingues**.
Prazo solicitado: entrega no mesmo dia. Este documento planeja o trabalho;
nenhuma etapa de implementação está concluída por sua criação.

## 1. Resultado que deve ser entregue

Um usuário autenticado abre a Viber no Electron, pergunta sobre funcionalidades
ou fundamentos físicos do VERS e recebe uma resposta textual em português,
progressivamente, usando uma base documental única. O assistente é consultivo,
não acessa dados individuais e não guarda histórico permanente de conversa.

Execução no computador do estande: Electron no host, backend e ai-service
locais; **inferência online pela OpenAI, modelo `gpt-5.5`**. Não haverá modelo
offline nesta entrega. O banco já usado pela autenticação conserva sua
configuração existente; este plano não migra Neon nem promete login sem internet.

A apresentação terá **um computador** e público estimado de **7.000 pessoas no
evento**, não 7.000 clientes simultâneos. Não existe quantidade garantida de
perguntas: depende do tamanho do contexto, das respostas e do uso real.
Orçamento total de API confirmado: **US$10**, incluindo testes pagos.

## 2. Decisões confirmadas e parâmetros propostos

| Tema | Decisão do responsável |
| --- | --- |
| Produto | Chat assistente Viber do VERS; sem Rakuten Viber. |
| Interface | Somente Electron, mantendo linguagem visual atual. |
| Conteúdo | Funcionalidades do sistema e estudo técnico/físico do projeto. |
| Dados pessoais/telemetria | Sem consulta, ingestão ou análise de dados únicos do usuário. |
| Ações | Somente explicação; sem mutações ou ferramentas de domínio. |
| Acesso | Usuário autenticado, sem privilégio exclusivo de administrador. |
| Assuntos externos | Reconhecer limitação e oferecer ajuda sobre o VERS. |
| Provedor | OpenAI; GPT-5.5; acesso à API informado como disponível. |
| Conectividade | Online, confirmado após considerar alternativa offline. |
| Resposta | Texto incremental; curta, direta, com os detalhes necessários. |
| Explicação opcional | Justificativa compreensível; não raciocínio interno privado. |
| Anexos/fontes visíveis | Só texto; sem fontes obrigatórias na interface. |
| Histórico | Sem persistência; conversa temporária na memória. |
| Organização documental | Pasta com roadmap principal e etapas detalhadas. |
| Responsabilidade | Gabriel desenvolve IA e sua integração; outra frente integra backend/Electron. |
| Coordenação | Contratos e arquivos próprios primeiro; conexão compartilhada por último. |
| Gasto | Pausas e teto total de US$10; sem limite de dez perguntas no total. |

Valores de engenharia apresentados nas etapas (intervalo de 10 segundos,
400 tokens de saída, janelas e prazos) são **propostas iniciais para o ensaio**,
não respostas atribuídas ao responsável. Gabriel deve registrar sua confirmação
ou ajuste antes de ativar a apresentação. Nenhuma alteração de modelo ou aumento
do teto pode ocorrer silenciosamente.

## 3. Leitura e dependências

| Ordem | Documento | Entrega da etapa | Depende de |
| --- | --- | --- | --- |
| Base | [Contexto geral da Viber](00-contexto-geral-viber.md) | Conhecimento curado do VERS, sem dados de contas. | Revisão editorial. |
| 1 | [Escopo e decisões](01-escopo-e-decisoes.md) | Critérios de produto e lista de exclusões. | Respostas desta conversa. |
| 2 | [Base e serviço Python](02-base-e-servico-ia.md) | Contexto empacotado e geração testável. | 1 e base. |
| 3 | [Contratos e streaming](03-contratos-e-streaming.md) | HTTP/SSE/IPC definidos com exemplos e falhas. | 1; antecede acoplamentos. |
| 4 | [Orçamento e pausas](04-orcamento-e-limites.md) | Reserva persistente, teto e recuperação segura. | 2 e 3. |
| 5 | [Módulo backend](05-integracao-backend.md) | Rota autenticada e proxy interno de streaming. | 3 e 4. |
| 6 | [Integração Electron](06-integracao-electron.md) | Ponte restrita e interface incremental. | 3; ensaio integrado exige 5. |
| 7 | [Validação e entrega](07-validacao-e-entrega.md) | Evidências, instalação e roteiro da apresentação. | 2–6. |
| Coordenação | [Plano de merge](08-coordenacao-e-merge.md) | Donos, arquivos compartilhados e ordem de integração. | Aplicável desde o início. |

Sequência de execução: congelar contrato → base e ai-service isolados →
orçamento → backend próprio → Electron próprio → pequenas conexões → ensaio.
Backend e Electron podem ser desenvolvidos contra simuladores do contrato,
mas somente a prova integrada permite declarar a entrega pronta.

## 4. Arquitetura proposta

```text
Usuário autenticado
    ↓ pergunta e conversa temporária
Renderer Electron — interface e estado efêmero
    ↓ ponte Viber com operações fixas
Preload → main — validação, cookies da partição existente, CSRF
    ↓ POST /api/v1/viber/responses
Backend NestJS — sessão/autorização e proxy sem dados de domínio
    ↓ POST interno /internal/v1/viber/responses + credencial entre serviços
ai-service FastAPI — base fixa, limites, orçamento e cliente OpenAI
    ↓ contagem de entrada e geração limitada
OpenAI Responses API — gpt-5.5
    ↑ eventos de texto → SSE → IPC → bolha de resposta
```

Não usar Socket.IO/MQTT para transportar a resposta do chat. Eles já têm
responsabilidades e contratos de medições. Não passar chave da OpenAI, cookies
ou tokens de sessão ao renderer. O backend pode consultar a identidade para
autenticação, mas não deve encaminhar perfil ao modelo.

O ai-service armazena somente um **registro técnico de orçamento agregado**
em volume local, sem textos ou identidade de usuário. Isso não é histórico
de conversa nem nova tabela do banco. É necessário para não zerar o controle
financeiro ao reiniciar o container.

## 5. Estado observado no repositório

- Tela atual: `services/dashboard/src/renderer/pages/ViberIaPage.tsx`.
- Componentes de mensagem, conversa e painel lateral já existem.
- `RepositorioVers` expõe cinco operações Viber, atualmente demonstrativas.
- A tela usa contextos de semana/testes e sugestões que consultam exemplos;
  esses comportamentos não atendem mais a este escopo.
- O `ai-service/src/main.py` contém apenas `/health` e carrega dotenv;
  não há chatbot implementado. Não importar esse entrypoint em testes antes
  de remover o carregamento automático proibido pelas regras do repositório.
- `main/rede-sessao.ts` acumula buffers e entrega a resposta somente no final;
  isso não implementa streaming visível.
- A sessão real usa `net.request`, Origin fixo e partição `persist:vers-api`.
  Preservar esse mecanismo para as chamadas já integradas.
- A fila central do main serializa operações de sessão/cadastro. Uma geração
  longa não pode bloquear logout ou renovação por toda sua duração.
- O Compose principal já possui ai-service; seu Dockerfile efetivo é
  `docker/Dockerfile.ai`. O Dockerfile na pasta do serviço não é o usado por ele.
- A integração das medições do lote 4 está em andamento e altera arquivos
  centrais. Conferir novamente o estado antes de começar a implementação.

## 6. Organização para entregar hoje

Estimativas para Gabriel, **sem garantia de conclusão** e sem pressupor um
horário inicial. Se o tempo disponível for insuficiente, comunicar a limitação;
não retirar autenticação, orçamento ou prova real para declarar pronto.

| Bloco | Faixa inicial de esforço | Resultado necessário |
| --- | --- | --- |
| A | 20–40 min | Revisar base, alinhar pontos compartilhados e confirmar contrato. |
| B | 45–90 min | Serviço de geração e reserva de orçamento com testes. |
| C | 30–60 min | Rota autenticada e proxy de streaming no backend. |
| D | 60–100 min | Ponte Electron, cancelamento e interface incremental. |
| E | 40–70 min | Ensaio dev/build, retomada do container e entrega revisável. |

Total indicativo: 3h15–6h. Não inclui incidentes de Docker, conta de API,
conflitos preexistentes ou instalador. Estimativa não transforma etapas em concluídas.

As primeiras reduções de escopo, se necessárias, são busca/renomeação de
conversas, botão de copiar e explicação após a resposta. A justificativa pode
ser pedida antes do envio e vir no mesmo texto; não exige segunda geração.
Streaming verdadeiro permanece requisito. Não simular digitação após receber
a resposta inteira como se fosse streaming da API.

## 7. Critério final de pronto

- [ ] Usuário autenticado pergunta livremente sobre o VERS no Electron real.
- [ ] Texto aparece antes do encerramento da geração, em dev e build local.
- [ ] Base única empacotada; nenhuma consulta a veículos, testes ou telemetria.
- [ ] Respostas de dúvida, assunto externo e ausência de documentação adequadas.
- [ ] “Explicar fundamentos” entrega justificativa breve sem raciocínio privado.
- [ ] Geração exige sessão válida e não expõe chaves ou credenciais no pacote.
- [ ] Teto de US$10 considera ensaios, reservas, falhas e reinícios.
- [ ] Pausas mostram tempo de espera; não há bloqueio arbitrário após dez perguntas.
- [ ] Logout/nova conversa cancelam geração; falhas não perdem o rascunho.
- [ ] Sem histórico em banco, arquivos de conversa ou armazenamento do navegador.
- [ ] Testes e builds aplicáveis aprovados e evidências registradas na etapa 7.
- [ ] Commits/push feitos pelo programador, em entregas pequenas e revisáveis.

## 8. Relação com os planos existentes

O [plano Electron/backend](../desktop-backend-integration.md) continua sendo
a referência do núcleo. Este roadmap é uma trilha separada, não um novo lote
de medições nem uma reescrita do transporte de sessão.

O [plano visual anterior da Viber](../desktop-frontend-viber.md) serve como
referência de aparência; análise de dados personalizados e comparações ficam
substituídas por este escopo para a entrega atual. Não reescrever documentos
históricos para fingir que já tinham essa decisão.

## 9. Fontes externas consultadas em 20/10/2026

- [GPT-5.5: identificador, streaming e preço](https://developers.openai.com/api/docs/models/gpt-5.5).
- [Streaming na Responses API](https://developers.openai.com/api/docs/guides/streaming-responses).
- [Contagem de tokens](https://developers.openai.com/api/docs/guides/token-counting).
- [Referência de criação de respostas](https://developers.openai.com/api/reference/resources/responses/methods/create).

O acesso à API foi informado pelo responsável, não testado nesta sessão.
Nenhuma chamada paga, build, instalação ou validação funcional foi executada
para produzir este planejamento.
