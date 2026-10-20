<!-- Planeja a base fixa e o serviço FastAPI da Viber sem acesso a dados de domínio. -->
# Etapa 2 — base de conhecimento e serviço de IA

## Objetivo

Criar a menor geração testável baseada em conhecimento fixo. O serviço já tem
FastAPI, Pydantic, SDK OpenAI e httpx declarados. Não adicionar frameworks de
agentes, bibliotecas de RAG ou camada de banco para esta entrega.

## Arquivos candidatos e responsabilidade

| Arquivo | Trabalho |
| --- | --- |
| `services/ai-service/src/main.py` | Registrar a rota e remover carregamento automático de dotenv antes de testes/importação. |
| `services/ai-service/src/api/viber.py` | Validar contrato interno e abrir/fechar o stream. |
| `services/ai-service/src/viber.py` | Montar contexto, consumir SDK e normalizar eventos; manter pequeno. |
| `services/ai-service/src/knowledge/vers.md` | Cópia de execução revisada da base editorial. |
| `services/ai-service/src/budget.py` | Controle financeiro definido na etapa 4. |
| `services/ai-service/tests/test_viber.py` | Contrato, montagem de contexto, erros e desconexão. |
| `services/ai-service/tests/test_budget.py` | Reserva, persistência e aritmética. |
| `services/ai-service/.env.example` | Documentar nomes de configuração, sem credenciais reais. |
| `services/ai-service/requirements.txt` | Alterar somente se a versão efetiva não suportar os métodos necessários. |

Não criar todos esses arquivos por obrigação. Se a implementação permanecer
legível em menos arquivos, manter a estrutura simples. Testes de orçamento
continuam separados por cobrirem regras financeiras relevantes.

## Base documental

1. Revisar [contexto geral](00-contexto-geral-viber.md).
2. Copiar o conteúdo de execução para caminho fixo dentro de `src/knowledge`.
3. Remover da cópia runtime notas de implementação e links internos sem utilidade
   para o usuário, preservando limites factuais e regras de resposta.
4. Definir `knowledgeVersion`, por exemplo `vers-2026-10-20-v1`.
5. Carregar uma vez no startup a partir do arquivo empacotado, não de caminho
   enviado pelo cliente. Validar ausência de arquivo, vazio e tamanho máximo.
6. Base inválida deixa o recurso indisponível e não inicia geração sem contexto.
7. Teste verifica versão/conteúdo e que nenhuma pasta do repositório é varrida.

A fonte editorial é o MD deste roadmap; a cópia runtime é um artefato derivado.
Toda mudança factual atualiza as duas na mesma entrega. Não criar sincronizador
automático para um único documento; registrar revisão e conferir equivalência
do conteúdo útil no teste/revisão.

## Montagem da chamada

- Modelo fixo no serviço: `gpt-5.5`, conforme decisão do responsável.
- Usar Responses API e `stream=true`.
- `store=false`; não usar Conversations API ou `previous_response_id`.
- Contexto e instruções privilegiadas vêm somente do servidor.
- Histórico recebe apenas papéis `user` e `assistant`, texto limitado e pares
  completos. Nunca aceitar papéis `system`/`developer` do cliente.
- Não encaminhar ID de conta, email, placa, cookies, tokens ou cabeçalhos internos.
- Pergunta livre continua podendo conter dados digitados pela pessoa; avisar
  no chat para não enviar dados pessoais e não registrá-la em logs.
- `reasoning.effort=none` é a proposta para reduzir latência/custo nesta tarefa,
  compatível com o modelo documentado; confirmar no ensaio real da conta.
- `max_output_tokens=400`, com texto curto por instrução. Se o usuário pedir
  fundamentos, incluí-los na resposta normal dentro do mesmo teto.
- Não definir parâmetros opcionais por hábito: temperatura, ferramentas,
  busca, multimodalidade e summaries internos ficam ausentes.
- Desativar retries automáticos do SDK para geração paga (`max_retries=0`).
  Nova tentativa de usuário é nova operação e exige nova reserva de orçamento.

## Streaming e ciclo de vida

Usar cliente assíncrono e gerador assíncrono do FastAPI. Traduzir somente
eventos conhecidos de texto e término para o contrato VERS. Não repassar objetos
brutos do provedor. Completion, limite de saída, falha e cancelamento precisam
ter resultados diferentes. `response.incomplete` não equivale a sucesso completo.

Em desconexão, fechar a chamada upstream e liberar o slot. Não concluir que
cancelamento significa custo zero: a política de reserva da etapa 4 prevalece.
Manter prazo de rede e prazo total independentes de pausas e limite de tokens.

## Configuração e saúde

Configurar por ambiente do processo, sem ler `.env` e sem `load_dotenv()`.
Chave OpenAI e token entre serviços nunca entram no renderer nem no Markdown.
Permitir iniciar o núcleo com Viber desabilitada; ai-service sem chave deve
informar indisponibilidade segura, sem esconder o problema com resposta de exemplo.

Separar saúde do processo e prontidão da Viber. Prontidão verifica base,
configuração e registro de orçamento sem consumir uma geração paga.
Não prometer comprovação de acesso ao provedor por um `/health` local.

## TDD e aceite

Usar `unittest` da biblioteca padrão e os componentes já instalados, evitando
uma dependência só para testes. Casos obrigatórios antes da implementação:

- [ ] Base ausente/vazia rejeitada.
- [ ] Entrada contém base, pergunta e histórico limitado, sem perfil.
- [ ] Texto do cliente não substitui instruções do servidor.
- [ ] Papéis inválidos e campos extras rejeitados.
- [ ] Deltas chegam incrementalmente.
- [ ] Falha inicial não abre stream de sucesso.
- [ ] Falha após delta encerra como erro, sem conclusão falsa.
- [ ] Timeout/cancelamento fecha upstream e não gera replay.
- [ ] Ausência de usage final conserva reserva.
- [ ] Resposta incompleta preserva esse estado.

Comando futuro, dentro de `services/ai-service`:
`python -m unittest discover -s tests -v`.
Este serviço não tem script npm; não inventar um para cumprir a regra de TDD.
Backend e dashboard continuam com seus `npm run test:unit` existentes.

Entrega sugerida: `feat: gerar respostas consultivas da Viber com base fixa`.
Só declarar pronta a geração isolada com provas de contrato; integração e
gasto real continuam dependendo das etapas seguintes.
