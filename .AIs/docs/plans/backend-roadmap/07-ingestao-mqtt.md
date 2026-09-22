<!-- Fase 07 do roadmap executável do backend VERS. -->

# Fase 07 — Contrato e ingestão MQTT

## Objetivo

Receber telemetria real com autenticação, rastreabilidade e idempotência.

## Marco obrigatório

Esta fase só inicia com ESP32 publicando ou simulador MQTT aprovado, além de:

- medições e unidades confirmadas;
- payload versionado de exemplo;
- identidade e tópicos do dispositivo;
- frequência ou lote aproximado;
- broker de teste disponível;
- critério de início e fim de teste.

## Etapa A — Conexão HiveMQ

- TLS obrigatório;
- credencial revogável por dispositivo;
- ACL limitada ao próprio `deviceUid`;
- reconexão com backoff e health check;
- segredos apenas por configuração segura.

## Etapa B — Recepção bruta

- validar tópico, tamanho e profundidade antes do parse completo;
- registrar QoS, retained e timestamps;
- persistir envelope bruto imutável;
- atribuir correlation ID sem registrar credencial.

## Etapa C — Identidade e idempotência

- cruzar dispositivo do tópico, payload e banco;
- validar dispositivo ativo e teste permitido;
- deduplicar por `messageId` e dispositivo/sequência;
- preservar e sinalizar mensagens fora de ordem;
- tratar replay e reinício de sequência.

## Etapa D — Validação e normalização

- aceitar somente versões suportadas;
- distinguir ausente, `null` e zero;
- validar finitude, unidade, faixa e coerência;
- calcular potência no backend;
- classificar `VALID`, `PARTIAL`, `SUSPECT` ou `INVALID`.

## Etapa E — Pipeline comum

- produzir `TelemetrySample` sem duplicar regras da Fase 06;
- atualizar resumos de modo idempotente;
- publicar evento interno apenas após persistência válida;
- manter rejeições auditáveis fora das análises.

## Testes

- conexão, reconexão e credencial revogada;
- válido, inválido, duplicado, atrasado e fora de ordem;
- lote parcial e payload excessivo;
- falha entre persistência e processamento;
- nenhuma duplicação de telemetria ou energia.

## Saída

Uma mensagem pode ser rastreada do broker ao payload bruto, telemetria tratada
e motivo de rejeição.
