<!-- Fase de aquisição periódica, calibração e qualidade local das medições. -->

# Task F04 — Aquisição, calibração e qualidade

## Objetivo

Coletar medições em cadência previsível e preservar contexto suficiente para o
backend avaliar sua qualidade.

## O que precisa ser feito

- definir taxa de leitura e janela de amostragem;
- coletar tensão, corrente e aceleração sem bloquear conectividade;
- registrar timestamps e duração real entre amostras;
- aplicar somente calibrações aprovadas e versionadas;
- sinalizar ausência, saturação, atraso e falha de sensor;
- decidir se RMS de vibração é calculado localmente ou enviado como amostras;
- manter medições informadas separadas de valores derivados;
- evitar cálculo oficial de energia no dispositivo.

## Testes

- cadência nominal, atrasos, estouro de tempo e reinicialização;
- séries conhecidas para validar conversão e janela;
- sensor parcial não zera os demais campos;
- alteração de calibração muda sua versão rastreável.

## Critério de saída

O firmware gera amostras temporizadas, versionadas e honestas sobre falhas e
ausências, prontas para serialização.
