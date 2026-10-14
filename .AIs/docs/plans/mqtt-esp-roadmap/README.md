<!-- Índice operacional do roadmap de firmware ESP32 e publicação MQTT do VERS. -->

# Roadmap executável MQTT/ESP32 — VERS

Este diretório organiza o desenvolvimento do firmware MicroPython e da
comunicação do ESP32 com o broker MQTT. O dispositivo adquire, identifica e
publica medições. Persistência histórica, autorização de usuários, validação
definitiva, idempotência global, cálculos oficiais, Redis e WebSocket pertencem
ao backend.

## Ordem e estado

| Fase | Task | Estado | Dependência principal |
| --- | --- | --- | --- |
| 00 | [Baseline e decisões do protótipo](00-baseline-decisoes.md) | Planejada | — |
| 01 | [Mapa elétrico e interfaces](01-mapa-eletrico-interfaces.md) | Planejada | F00 + frente elétrica |
| 02 | [Fundação do firmware](02-fundacao-firmware.md) | Planejada | F00–F01 |
| 03 | [Drivers e diagnóstico dos sensores](03-drivers-sensores.md) | Planejada | F01–F02 |
| 04 | [Aquisição, calibração e qualidade](04-aquisicao-calibracao.md) | Planejada | F03 |
| 05 | [Identidade, tempo e contexto do teste](05-identidade-tempo-teste.md) | Planejada | F02 e contrato backend |
| 06 | [Contrato MQTT e publicação](06-contrato-mqtt-publicacao.md) | Planejada | F04–F05 |
| 07 | [Wi-Fi, TLS e provisionamento](07-conectividade-seguranca.md) | Planejada | F06 + broker de teste |
| 08 | [Reconexão e operação offline](08-reconexao-buffer-offline.md) | Planejada | F06–F07 |
| 09 | [Simulador e testes de integração](09-simulador-testes.md) | Planejada | F04–F08 |
| 10 | [Observabilidade e entrega do firmware](10-operacao-entrega.md) | Planejada | F00–F09 |

```text
F00 → F01 → F02 → F03 → F04
              └──────→ F05
F04 + F05 → F06 → F07 → F08 → F09 → F10
```

## Fronteiras de responsabilidade

### ESP32 e firmware

- inicializar e ler INA219, MPU6050 e entradas aprovadas;
- registrar versão, identidade pública e estado dos sensores;
- manter sequência, timestamp e contexto do teste;
- produzir payload pequeno, versionado e com unidades explícitas;
- publicar nos tópicos autorizados;
- reconectar e preservar dados conforme a política offline aprovada.

### Backend

- provisionar e revogar a identidade do dispositivo;
- validar tópico, payload, dispositivo e teste;
- preservar mensagens, deduplicar e classificar qualidade definitiva;
- calcular potência e energia oficiais;
- persistir, agregar e distribuir eventos via Redis/WebSocket;
- autorizar o acesso de mobile e desktop.

## Regras de execução

1. Nenhuma ligação física é presumida sem pinout e limites aprovados.
2. Segredos nunca são versionados nem impressos em logs.
3. O firmware não substitui campo ausente ou falha de sensor por zero.
4. O contrato MQTT é versionado antes da integração com o broker.
5. Cada comportamento testável começa por teste automatizado ou harness de
   simulação compatível com MicroPython.
6. A integração real exige ESP32 ou simulador aprovado, broker de teste e
   credencial exclusiva do dispositivo.
7. Alterações de circuito, sensor, firmware ou calibração geram versões
   rastreáveis.

## Decisões bloqueantes

- modelo exato do ESP32 e pinout disponível;
- ponto de medição do INA219 e faixas elétricas seguras;
- uso e endereço dos barramentos I2C;
- sensores realmente presentes no primeiro protótipo;
- taxa de aquisição, janela de agregação e frequência de publicação;
- fonte de tempo e tolerância a relógio inválido;
- capacidade e política do buffer offline;
- QoS, retained e lote por tópico;
- momento em que o contador local de energia reinicia.

## Critério final

Uma placa ou simulador aprovado publica mensagens versionadas, autenticadas e
rastreáveis; falhas de sensor e rede são visíveis; reconexões não corrompem
sequência nem contexto; e o backend recebe dados suficientes para validar,
persistir e calcular os indicadores oficiais.
