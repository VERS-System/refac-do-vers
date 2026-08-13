<!-- Documento que define os dados de teste e os indicadores analíticos do VERS. -->

# Dados e indicadores

## 1. Entidades conceituais

O armazenamento pode ser organizado inicialmente em três grupos: **teste**, **configuração do sistema** e **leitura de telemetria**. Essa divisão permite comparar montagens diferentes sem perder as medições individuais.

| Entidade     | Finalidade                                      | Exemplos de campos                                                                                       |
| ------------ | ----------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Teste        | Contextualiza uma execução experimental.        | Identificador, data/hora, duração, veículo, peso, RPM médio, velocidade, terreno e inclinação.           |
| Configuração | Descreve a montagem usada em um ou mais testes. | Número de piezos, associação elétrica, ponto de instalação, tipo de armazenamento e versão do firmware.  |
| Leitura      | Registra uma observação durante o teste.        | Timestamp, tensão, corrente, potência, aceleração, temperatura, energia acumulada e estado dos sensores. |

O primeiro modelo físico já existe em `services/backend/prisma/schema.prisma` e
usa PostgreSQL/Neon. Ele é experimental e será estabilizado na Fase 1 do
[roadmap do core](plans/core-roadmap.md), incluindo chaves, enums, índices,
precisão, unidades e novas entidades de identidade, veículo e dispositivo.

## 2. Dados mínimos por teste

- identificador único do teste;
- data e hora de início e fim;
- duração;
- configuração utilizada;
- quantidade de piezos ativos;
- condições do veículo e do percurso disponíveis;
- observações do operador e intercorrências;
- resultado ou classificação de satisfatoriedade.

## 3. Dados mínimos por leitura

- timestamp no padrão UTC ou com fuso explicitamente informado;
- tensão, em volts (V);
- corrente, em ampères (A);
- potência, em watts (W);
- energia acumulada, preferencialmente em joules (J) e/ou watt-hora (Wh);
- aceleração/vibração com unidade e eixo documentados;
- temperatura, quando houver sensor;
- qualidade da leitura, estado de conectividade e eventuais erros.

## 4. Indicadores

| Indicador                 | Cálculo ou significado                                            | Uso                                                                                |
| ------------------------- | ----------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Potência instantânea      | `P = V × I`                                                       | Identificar picos e comportamento ao longo do percurso.                            |
| Potência média            | Média de `P` dentro de um intervalo válido.                       | Comparar testes com duração semelhante ou normalizada.                             |
| Energia recuperada        | Integral/soma temporal da potência medida.                        | Medir a produção acumulada do teste.                                               |
| Tensão máxima e média     | Máximo e média das leituras de tensão.                            | Avaliar condicionamento e variação do sinal.                                       |
| Corrente máxima e média   | Máximo e média das leituras de corrente.                          | Avaliar capacidade de fornecimento do conjunto.                                    |
| Relação vibração–potência | Correlação entre aceleração e potência.                           | Investigar se maior vibração produz maior recuperação.                             |
| Eficiência do sistema     | Razão entre energia útil medida e energia mecânica de referência. | Usar apenas se houver método confiável para estimar a energia mecânica de entrada. |

> A palavra “eficiência” exige uma referência de energia mecânica de entrada. Sem essa referência, o dashboard deve reportar energia recuperada e desempenho elétrico, evitando indicar uma eficiência absoluta sem base experimental.

## 5. Regras de qualidade de dados propostas

- Toda leitura deve estar vinculada a um teste e a uma configuração conhecida.
- Unidades e ponto de medição devem acompanhar a documentação de cada versão do circuito.
- Dados ausentes, valores fora de faixa ou falhas de sensor não devem ser silenciosamente tratados como zero.
- Alterações de hardware, firmware ou calibração devem gerar uma nova versão de configuração.
- Comparações devem indicar condições de terreno, velocidade e quantidade de piezos para evitar conclusões indevidas.
