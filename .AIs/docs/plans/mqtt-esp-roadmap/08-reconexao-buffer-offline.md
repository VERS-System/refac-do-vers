<!-- Fase de confiabilidade de rede e preservação limitada de mensagens offline. -->

# Task F08 — Reconexão e operação offline

## Objetivo

Manter aquisição previsível durante falhas de rede e retomar a publicação sem
duplicação silenciosa ou perda não contabilizada.

## O que precisa ser feito

- implementar reconexão com backoff e jitter;
- desacoplar aquisição da tentativa de publicação;
- definir capacidade, mídia e política do buffer offline;
- preservar `messageId`, sequência e timestamp das mensagens armazenadas;
- definir descarte por prioridade quando o buffer lotar;
- sinalizar quantidade perdida ou descartada;
- reenviar em ritmo que não bloqueie amostras atuais;
- considerar desgaste de flash e corrupção após queda de energia.

## Testes

- quedas curtas e longas de Wi-Fi/broker;
- buffer cheio, reboot com buffer pendente e registro corrompido;
- reconexões repetidas não mudam identificadores;
- retransmissão não altera a ordem original sem sinalização.

## Critério de saída

O dispositivo se recupera de indisponibilidade conforme uma política documentada
e torna perdas observáveis para o backend.
