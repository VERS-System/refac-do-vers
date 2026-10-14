<!-- Documento que descreve a arquitetura conceitual física e digital do VERS. -->

# Arquitetura do sistema

> **Estado em 13/08/2026:** a implementação digital usa um monorepo com NestJS,
> Prisma/PostgreSQL (Neon), React/Vite/Tailwind, React Native e FastAPI. MQTT e
> WebSocket possuem scaffolds dentro do backend, mas sua integração funcional
> ainda será validada pelas fases 0, 5 e 7 do
> [roadmap do core](plans/core-roadmap.md).

A autenticação dos clientes usa JWT próprio no backend NestJS. Access e refresh
tokens trafegam exclusivamente em cookies `HttpOnly`, sem exposição ao
JavaScript ou aos corpos JSON. Em produção, a API e os clientes devem operar por
HTTPS e os cookies devem usar o atributo `Secure`. CORS com credenciais,
proteção CSRF e a política `SameSite` serão fechados antes da implementação do
módulo de autenticação.

## 1. Camadas do VERS

| Camada                   | Responsabilidade                                                | Componentes previstos                                             |
| ------------------------ | --------------------------------------------------------------- | ----------------------------------------------------------------- |
| Mecânica                 | Receber a vibração do veículo e transferi-la aos transdutores.  | Suporte, estrutura de fixação e elementos piezoelétricos.         |
| Condicionamento elétrico | Retificar, filtrar, estabilizar e direcionar a energia gerada.  | Ponte retificadora, capacitores, MOSFET e conversores buck/boost. |
| Medição e controle       | Obter leituras elétricas e de vibração; coordenar a telemetria. | ESP32, INA219, MPU6050 e sensores adicionais.                     |
| Armazenamento de energia | Acumular a energia elétrica recuperada.                         | Bateria e/ou supercapacitor.                                      |
| Plataforma de dados      | Receber, persistir, analisar e exibir os registros.             | API backend, banco de dados, dashboard e aplicativo futuro.       |

## 2. Componentes físicos esperados

- **ESP32:** microcontrolador responsável por adquirir, organizar e transmitir os dados.
- **Elementos piezoelétricos:** convertem deformação mecânica em tensão elétrica.
- **MPU6050:** mede aceleração e pode fornecer uma referência de intensidade de vibração.
- **INA219:** mede tensão e corrente em um ponto definido do circuito; a posição do sensor deve ser documentada em cada montagem.
- **Ponte retificadora:** converte a saída alternada dos piezos em corrente contínua pulsante.
- **Capacitores:** filtram o sinal e acumulam energia temporariamente.
- **Conversores buck e/ou boost:** adequam a tensão à etapa de medição ou armazenamento.
- **MOSFET:** permite chaveamento ou controle de uma etapa elétrica, conforme o circuito final.
- **Bateria ou supercapacitor:** recebe a energia condicionada para armazenamento.

## 3. Fluxos principais

### Fluxo de energia

```text
Vibração → piezos → retificação → filtragem → conversão DC-DC → armazenamento
```

### Fluxo de dados

```text
MPU6050 + INA219 + dados do teste → ESP32 → API → banco de dados → dashboard
```

Embora os dois fluxos se relacionem, eles devem ser tratados separadamente no projeto do circuito. O caminho de energia precisa ser seguro e adequado às tensões dos piezos; o caminho de dados precisa fornecer leituras com referência, frequência de amostragem e unidade claramente definidas.

## 4. Responsabilidades do ESP32

O firmware deverá, em uma evolução posterior:

1. inicializar sensores e interfaces de comunicação;
2. coletar leituras periódicas de tensão, corrente e aceleração;
3. calcular ou transmitir métricas derivadas, como potência instantânea;
4. associar as leituras a um teste identificado;
5. enviar lotes de dados à API e lidar com indisponibilidade de rede;
6. registrar estados relevantes, como quantidade de piezos ativos e falhas de sensor.

## 5. Pontos a definir antes da implementação

- topologia elétrica e limites de tensão/corrente do circuito;
- ponto exato de instalação dos piezos e forma de fixação;
- associação em série/paralelo e número de elementos ativos;
- localização do INA219 e método de cálculo de energia;
- taxa de amostragem, formato de telemetria e estratégia offline;
- contratos definitivos entre a API NestJS, PostgreSQL/Neon, dashboard e os
  módulos de MQTT/WebSocket;
- requisitos de proteção elétrica e mecânica para uso em veículo.

Essas decisões devem ser registradas em planos específicos antes de modificar hardware ou iniciar o desenvolvimento do software.
