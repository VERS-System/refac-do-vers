<!-- Fase final de operação, observabilidade e entrega do firmware ESP32. -->

# Task F10 — Observabilidade e entrega do firmware

## Objetivo

Tornar gravação, atualização, diagnóstico e demonstração do dispositivo
reproduzíveis.

## O que precisa ser feito

- documentar preparação da placa e gravação do MicroPython;
- documentar instalação do firmware e configuração segura;
- expor versão, uptime, motivo de reboot e estado dos sensores;
- registrar métricas locais mínimas de aquisição, publicação, buffer e falha;
- definir procedimento de atualização e rollback do firmware;
- criar checklist de bancada e checklist de teste em veículo;
- manter matriz de firmware, hardware, calibração e contrato MQTT;
- documentar limitações e decisões ainda abertas.

## Validação

- uma placa limpa pode ser preparada apenas pela documentação;
- atualização interrompida possui recuperação conhecida;
- diagnóstico não exige revelar segredos;
- demonstração executa cenários nominal, offline e sensor com falha;
- versão observada no backend corresponde ao artefato instalado.

## Critério de saída

Outra pessoa consegue preparar, operar, diagnosticar e recuperar o ESP32 usando
somente artefatos e documentação versionados.
