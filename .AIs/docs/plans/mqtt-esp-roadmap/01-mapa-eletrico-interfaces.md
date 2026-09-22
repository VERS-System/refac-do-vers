<!-- Fase de definição das interfaces elétricas usadas pelo ESP32. -->

# Task F01 — Mapa elétrico e interfaces

## Objetivo

Definir ligações, alimentação, barramentos e limites seguros antes de energizar
o protótipo ou escrever drivers dependentes de hardware.

## O que precisa ser feito

- registrar pinout do ESP32 e função de cada pino utilizado;
- definir alimentação, terra comum e níveis lógicos;
- definir SDA, SCL, endereços e velocidade do barramento I2C;
- registrar o ponto físico medido pelo INA219;
- definir se haverá leitura direta por ADC e seu condicionamento;
- registrar limites máximos de tensão e corrente em cada entrada;
- prever desconexão, sensor ausente, endereço duplicado e ruído;
- alinhar associação e quantidade de piezos com a frente elétrica.

## Limites

- esta task não dimensiona ponte, filtro, buck/boost ou armazenamento;
- o firmware não compensa uma ligação elétrica insegura;
- nenhuma montagem é autorizada apenas por suposição documental.

## Validação

- revisão conjunta com a frente elétrica;
- teste de continuidade e alimentação antes de conectar o ESP32;
- descoberta I2C confirma somente dispositivos esperados;
- pinout e limites ficam versionados.

## Critério de saída

Existe um mapa elétrico aprovado que permite inicializar sensores sem risco
conhecido ao ESP32 ou aos instrumentos.
