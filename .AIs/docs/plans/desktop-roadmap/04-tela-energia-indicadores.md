<!-- Task da tela de energia, séries e indicadores do desktop. -->

# Task D04 — Tela Energia e indicadores

## Objetivo

Explorar séries e resumos energéticos com a densidade visual permitida pelo
desktop.

## O que precisa ser feito

- criar filtros de instalação, teste, período e resolução;
- apresentar energia recuperada, potência média, pico e qualidade;
- criar gráficos com eixos, unidades, tooltip e lacunas explícitas;
- comparar períodos ou testes somente quando o contrato permitir;
- exibir bateria usada e economia apenas com fonte e premissas registradas;
- permitir exportação somente por endpoint e limite definidos pelo backend;
- criar estados vazio, parcial, inválido, loading e erro.

## Limites

- Recharts apenas representa dados recebidos;
- o desktop não calcula potência, energia, eficiência ou economia;
- filtros de UI não substituem autorização ou limites da API.

## Critério de saída

Gráficos e resumos são acessíveis, legíveis e fiéis ao contrato, inclusive com
lacunas e valores extremos.
