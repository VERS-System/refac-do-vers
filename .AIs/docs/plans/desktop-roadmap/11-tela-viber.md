<!-- Task da tela desktop de conversa com o assistente Viber. -->

# Task D11 — Tela Viber

## Objetivo

Oferecer uma experiência desktop de conversa que diferencie medição,
explicação, inferência e recomendação.

## O que precisa ser feito

- criar painel de histórico e área de conversa responsiva;
- criar composição, envio, loading, cancelamento visual e repetição;
- permitir seleção apenas de contextos autorizados fornecidos;
- exibir referências temporais usadas na resposta quando disponíveis;
- diferenciar conteúdo gerado de indicadores medidos;
- preservar rascunho em falha ou indisponibilidade;
- tratar mensagens longas, código e links permitidos.

## Integração esperada

Prompts, seleção de dados, minimização, persistência e chaves da OpenAI ficam no
backend/ai-service.

## Critério de saída

Conversa, falhas e acessibilidade estão testadas sem expor dados brutos ou
credenciais ao renderer.
