<!-- Formaliza o escopo aprovado da Viber e separa decisões de produto de propostas de implementação. -->
# Etapa 1 — escopo e decisões

## Objetivo e entrada

Gabriel deve conseguir implementar sem herdar a suposição antiga de que Viber
analisa dados do carro. Entrada: respostas do responsável em 20/10/2026 e
[roadmap principal](README.md). A implementação ainda não começou neste plano.

## Requisitos funcionais

| ID | Requisito | Evidência de aceite |
| --- | --- | --- |
| V01 | Somente Electron e usuário autenticado. | Sessão ausente/revogada impede geração no servidor. |
| V02 | Pergunta livre sobre funcionamento e features do VERS. | Perguntas funcionais e físicas recebem resposta pertinente. |
| V03 | Base única de conhecimento em Markdown. | Revisão da base identificada no serviço, sem leitura dinâmica do repositório. |
| V04 | Nenhum acesso a dados individuais para responder. | Testes negam dependências de veículos, instalações, testes e telemetria. |
| V05 | Consultivo. | Nenhuma ferramenta executável, rota de domínio ou mudança de dados acionada pelo modelo. |
| V06 | Recusar assuntos externos e reconhecer desconhecimento. | Corpus de avaliação inclui ambos os casos. |
| V07 | Resposta incremental textual. | Primeiro trecho aparece antes do evento terminal. |
| V08 | Estilo breve, direto, em português. | Avaliação manual de perguntas representativas. |
| V09 | Justificativa opcional, sem cadeia interna. | Controle de fundamentos modifica o pedido, sem segunda chamada automática. |
| V10 | Conversa não persistida. | Reabertura inicia conversa vazia; logout remove estado e listeners. |
| V11 | Online com GPT-5.5. | Configuração do serviço e ensaio real confirmam modelo. |
| V12 | Controle de US$10 com pausas. | Casos de reserva/retomada/exaustão passam sem chamada extra. |

## Comportamento proposto da sessão temporária

1. Ao abrir a Viber, iniciar uma conversa vazia e oferecer perguntas gerais.
2. Manter mensagens somente enquanto a tela estiver montada.
3. “Nova conversa” cancela o envio atual, limpa mensagens e reinicia o contexto
   temporário; não altera o orçamento ou a pausa global.
4. Sair da página, fechar janela, recarregar ou trocar de conta descarta mensagens.
5. Usuário pode digitar durante uma resposta, mas o envio seguinte permanece
   bloqueado até a geração terminar e a pausa expirar.
6. Falha antes de qualquer resposta preserva a pergunta para nova tentativa manual.
7. Resposta parcial interrompida fica identificada como incompleta na tela,
   sem entrar no histórico enviado ao modelo na próxima pergunta.

Esse ciclo é a proposta mínima compatível com “não precisa de histórico”.
Não implementar lista permanente de conversas recentes ou sincronização.

## Propostas iniciais para validar no ensaio

| Parâmetro | Proposta | Motivo |
| --- | --- | --- |
| Gerações simultâneas | Uma global no ai-service. | Um computador e controle simples de reserva/carga. |
| Pergunta | Até 2.000 caracteres. | Evita colar grandes documentos em um chat só de dúvidas. |
| Histórico enviado | Últimos três pares completos, até 6.000 caracteres no conjunto. | Permite “e como isso funciona?” sem crescimento ilimitado. |
| Entrada total ao modelo | Até 12.000 tokens contados, incluindo base/instruções/histórico. | Limite explícito para previsão de custo. |
| Saída | Até 400 tokens; orientar normalmente 2–5 frases. | Respostas curtas e custo limitado. |
| Fundamentos | Opção antes de enviar, dentro do mesmo teto. | Atende explicação sem duplicar chamadas por padrão. |
| Pausa | Dez segundos após a tentativa de geração encerrar. | Cadência visível, sem limite de dez perguntas. |
| Prazo total | 45 segundos por geração. | Evita espera ilimitada; não é controle financeiro. |
| Prazo sem texto inicial | Vinte segundos. | Mensagem de indisponibilidade e tentativa manual. |

Valores confirmados pelo responsável em 20/10/2026, sem ajustes
(ver `Context_20_10_2026.md`, seção Viber). A base editorial
`00-contexto-geral-viber.md` também foi revisada e confirmada sem
alterações factuais. Nenhum limite financeiro pode aumentar acima de
US$10 sem nova decisão.

## Fora do escopo

- Mobile, web público e distribuição a todos os visitantes do evento.
- Modelos offline, Ollama, GPU, download de pesos ou múltiplos provedores.
- Dados de usuário, telemetria, busca de testes ou dashboards personalizados.
- Agentes com ferramentas, execução de código e acesso à internet pelo modelo.
- RAG, embeddings, banco vetorial, upload de arquivos e ingestão automática.
- Áudio, imagens, CSV/PDF, exportação de relatório e anexos de comparação.
- Histórico persistente, renomeação/busca de conversas, nova migration.
- Análise automática em segundo plano, filas Celery e uso de Redis para tarefas.
- Mudanças na autenticação ou na arquitetura de tempo real do núcleo.

## Checklist antes de desenvolver

- [x] Revisar a base factual com o responsável e identificar pontos desconhecidos. (20/10: confirmada sem alterações)
- [x] Confirmar os valores propostos para o ensaio, sem tratá-los como aprovados. (20/10: confirmados sem ajustes)
- [ ] Conferir baseline da outra frente e combinar quem conecta os arquivos comuns.
- [ ] Reservar uma parte dos US$10 para ensaios, no mesmo registro de orçamento.
- [ ] Registrar versão da base, modelo e versões das dependências usadas.

## Entrega revisável

Um commit documental sugerido: `docs: definir escopo consultivo da Viber`.
O programador realiza commit/push. Não escrever serviço ou mudar tela nesta
etapa. Aceite: decisões claras e ausência de dúvida que altere o contrato central.

## Addendum (20/10/2026) — provedor e modelo

A linha V11 ("Online com GPT-5.5") foi substituída pela decisão do
programador registrada no plano `09-migracao-gemini.md`:

- **Provedor**: Google Gemini (a chave disponível é do Google; a OpenAI
  recusou com 401). **Modelo**: `gemini-3-flash-preview`.
- Tarifas usadas no orçamento: entrada US$0,50/M arredondado para cima
  (1 micros/token), saída US$3,00/M (3 micros/token); teto US$10 e demais
  parâmetros desta página permanecem válidos.
- Todo o restante do escopo (V01–V12, fora do escopo, limites) inalterado.
