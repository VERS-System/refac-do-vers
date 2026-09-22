<!-- Task da tela de conversa com o assistente Viber. -->

# Task 12 — Tela Viber

## Objetivo

Criar a experiência visual de conversa com o assistente Viber, mantendo clara a
diferença entre medição, explicação e recomendação.

## O que precisa ser feito

- criar histórico de mensagens, campo de composição e envio;
- apresentar carregamento, falha, repetição e indisponibilidade;
- identificar mensagens do usuário e do Viber de forma acessível;
- exibir avisos quando uma resposta for inferência ou recomendação;
- permitir escolher contexto apenas entre recursos autorizados fornecidos;
- impedir aparência de dado em tempo real quando a resposta usar histórico;
- preparar mensagens longas, links permitidos e teclado móvel.

## Integração esperada

Consome contrato futuro do backend/ai-service. O mobile não monta prompts, não
seleciona dados brutos e nunca recebe chaves da OpenAI.

## Validação

- estados de indisponibilidade não apagam a mensagem digitada;
- conteúdo gerado é visualmente distinguível de medições;
- testes cobrem envio, resposta, erro e acessibilidade da conversa.

## Critério de saída

A interface está pronta para o contrato aprovado do Viber, sem antecipar sua
lógica ou persistência.
