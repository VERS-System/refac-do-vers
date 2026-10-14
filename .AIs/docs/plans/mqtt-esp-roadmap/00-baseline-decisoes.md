<!-- Fase inicial de inventário e decisões do protótipo ESP32. -->

# Task F00 — Baseline e decisões do protótipo

## Objetivo

Registrar o estado real do hardware, firmware e ambiente de teste antes de
implementar drivers ou comunicação.

## O que precisa ser feito

- confirmar modelo e revisão da placa ESP32;
- inventariar INA219, MPU6050, sensores opcionais e módulos auxiliares;
- confirmar que ainda não existe firmware canônico versionado;
- definir versão de MicroPython e ferramenta de gravação;
- registrar disponibilidade de placa física, fonte, instrumentos e broker;
- separar decisões confirmadas de propostas ainda não validadas;
- definir comandos de teste, lint ou validação que o firmware deverá oferecer.

## Testes e evidências

- relatório de inventário com fotos ou referências do hardware, quando houver;
- versão da placa e do runtime registradas;
- execução mínima reproduzível em placa ou simulador;
- lista explícita de bloqueios para a fase elétrica.

## Critério de saída

Equipe conhece os componentes reais, o ambiente de desenvolvimento e todas as
decisões que impedem a definição do pinout.
