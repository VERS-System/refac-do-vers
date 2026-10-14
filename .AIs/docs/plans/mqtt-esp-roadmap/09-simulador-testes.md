<!-- Fase de simulador MQTT e testes integrados do contrato ESP32/backend. -->

# Task F09 — Simulador e testes de integração

## Objetivo

Validar contrato e cenários de falha mesmo quando a placa ou o circuito não
estiverem disponíveis.

## O que precisa ser feito

- criar simulador que use exatamente os tópicos e payloads versionados;
- gerar séries nominais, lacunas, atrasos, duplicatas e fora de ordem;
- simular reboot, sequência reiniciada e relógio inválido;
- simular sensor ausente, saturado e intermitente;
- simular lote parcial e payload excessivo;
- testar credencial válida, revogada e tópico proibido;
- executar fluxo até a aceitação ou rejeição controlada pelo backend;
- manter fixtures sintéticas e determinísticas.

## Limites

- o simulador não comprova precisão elétrica ou calibração física;
- resultados sintéticos não são apresentados como medições experimentais;
- ele não substitui o teste posterior com a placa real.

## Critério de saída

O mesmo contrato é exercitado por simulador e firmware, e o backend distingue
mensagens válidas, parciais, duplicadas, atrasadas e inválidas.
