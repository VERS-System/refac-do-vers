<!-- Fase de definição dos tópicos, payloads e publicação MQTT do ESP32. -->

# Task F06 — Contrato MQTT e publicação

## Objetivo

Versionar o contrato entre firmware e backend antes de integrar com o broker.

## Tópicos propostos

```text
vers/v1/devices/{deviceUid}/telemetry
vers/v1/devices/{deviceUid}/status
vers/v1/devices/{deviceUid}/events
```

## O que precisa ser feito

- fechar nomes, finalidade, QoS e uso de retained por tópico;
- definir envelope com `schemaVersion`, `messageId`, `deviceUid`, `sequence`,
  `capturedAt`, `testId` e medições;
- usar nomes com unidade explícita;
- distinguir campo ausente, `null` e zero real;
- limitar tamanho, profundidade e quantidade de amostras por lote;
- manter payload JSON pequeno e compatível com MicroPython;
- publicar status sem transformar o broker em fonte de verdade;
- documentar compatibilidade e rejeição de versões.

## Testes

- golden files de payload válido, parcial e inválido;
- serialização com caracteres, números extremos e campos ausentes;
- tópico e `deviceUid` coincidem;
- tamanho máximo respeitado;
- nenhuma credencial aparece no payload.

## Critério de saída

Firmware e backend compartilham exemplos aprovados de tópicos e payloads
versionados, antes da conexão real com HiveMQ.
