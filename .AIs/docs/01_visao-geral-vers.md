<!-- Documento de referência para apresentar o propósito, escopo e funcionamento do VERS. -->

# VERS — Vibration Energy Recovery System

## 1. Visão geral

O **VERS (Vibration Energy Recovery System)** é um projeto de TCC que investiga a recuperação de energia mecânica normalmente dissipada pelas vibrações de um veículo. A proposta utiliza elementos piezoelétricos para converter deformações mecânicas em energia elétrica e medir o comportamento do sistema em diferentes condições de operação.

Vibrações causadas pelo motor, pela suspensão, pelo pavimento, pela aceleração e pela frenagem estão presentes durante o funcionamento do veículo. No VERS, parte dessas vibrações é captada por piezos instalados em um ponto mecânico a ser definido e validado experimentalmente.

O projeto tem caráter experimental e educacional: busca demonstrar a viabilidade da tecnologia, obter medições confiáveis e comparar resultados de testes. Ele **não tem como objetivo substituir o alternador** do veículo, pois a energia recuperada é limitada e variável.

## 2. Objetivos

1. Coletar dados de funcionamento e das condições de teste do veículo.
2. Medir a tensão, a corrente, a potência e a energia produzidas pelos elementos piezoelétricos.
3. Armazenar os dados para consulta, comparação e análise posterior.
4. Gerar indicadores que permitam avaliar o desempenho e a eficiência do sistema.

## 3. Escopo funcional

O VERS deve permitir:

- captar vibração e/ou aceleração do conjunto monitorado;
- medir a saída elétrica condicionada dos piezos;
- registrar leituras com data, hora e identificação do teste;
- enviar telemetria a uma API de backend;
- persistir os dados em banco de dados;
- apresentar resultados no dashboard e no aplicativo mobile, com evolução
  planejada para relatórios e análises por modelos de IA.

## 4. Funcionamento resumido

```text
Vibração do veículo
        ↓
Elementos piezoelétricos
        ↓
Ponte retificadora → capacitor → conversor DC-DC
        ↓
Armazenamento elétrico e medição
        ↓
ESP32
        ↓
API backend → banco de dados → dashboard / análises
```

Os piezos produzem um sinal elétrico variável conforme a deformação mecânica. Antes de esse sinal ser medido ou armazenado, ele passa por condicionamento elétrico. O ESP32 consolida as leituras dos sensores, monta os registros de telemetria e os envia para a API quando houver conectividade.

## 5. Limites e critérios de sucesso

O resultado do projeto não será avaliado apenas pela quantidade absoluta de energia gerada. Também são critérios relevantes:

- estabilidade e repetibilidade das medições;
- comparação entre configurações e cenários de teste;
- integridade dos dados armazenados;
- capacidade de relacionar vibração, condições de operação e energia recuperada;
- apresentação clara dos indicadores no dashboard.

Parâmetros como local de instalação, quantidade e associação dos piezos, tipo de armazenamento e metas numéricas de desempenho permanecem **a validar em protótipo**.
