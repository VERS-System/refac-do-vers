<!-- Fase de implementação e validação dos drivers de sensores do ESP32. -->

# Task F03 — Drivers e diagnóstico dos sensores

## Objetivo

Ler os sensores aprovados e comunicar explicitamente disponibilidade e falhas.

## O que precisa ser feito

- implementar ou integrar driver do INA219;
- implementar ou integrar driver do MPU6050;
- implementar entrada ADC apenas se aprovada no mapa elétrico;
- detectar sensor ausente, timeout, leitura inválida e saturação;
- expor leitura bruta e convertida com unidade documentada;
- registrar endereço, faixa e configuração efetivamente usadas;
- tornar temperatura e sensores opcionais realmente opcionais.

## Testes

- valores nominais, limites, erro de barramento e dispositivo ausente;
- conversão de registradores para unidades físicas conhecidas;
- mocks não escondem exceções relevantes do MicroPython;
- falha não é convertida silenciosamente em zero.

## Critério de saída

Cada sensor produz leituras com unidade e estado explícitos, ou um erro
classificável que não contamina a telemetria.
