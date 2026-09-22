<!-- Fase de criação da arquitetura base do firmware MicroPython. -->

# Task F02 — Fundação do firmware

## Objetivo

Criar uma base MicroPython pequena, testável e separada por responsabilidades.

## O que precisa ser feito

- definir estrutura de diretórios e ponto de entrada do firmware;
- separar configuração pública, drivers, aquisição, payload e transporte;
- criar interfaces testáveis para relógio, sensores, Wi-Fi e MQTT;
- definir logging com níveis e redaction de segredos;
- estabelecer tratamento central de falhas e reinicialização controlada;
- registrar versão do firmware e compatibilidade de hardware;
- definir configuração por arquivo local não versionado ou provisionamento.

## Testes

- bootstrap funciona sem broker e com sensores simulados;
- importações não dependem desnecessariamente de hardware real;
- falha de um sensor não impede o diagnóstico dos demais;
- logs nunca expõem senha Wi-Fi ou credencial MQTT.

## Critério de saída

O firmware inicializa de forma previsível, expõe versão e permite substituir
hardware por doubles em testes.
