<!-- Task da tela de telemetria ao vivo do dashboard desktop. -->

# Task D05 — Tela Telemetria ao vivo

## Objetivo

Apresentar atualizações autorizadas durante um teste sem conectar o desktop ao
broker MQTT.

## O que precisa ser feito

- carregar snapshot inicial por REST;
- assinar eventos incrementais pelo Socket.IO do backend;
- exibir tensão, corrente, potência, vibração, qualidade e timestamps disponíveis;
- criar gráfico ao vivo e tabela virtualizada ou limitada;
- indicar conectado, reconectando, desatualizado e offline;
- descartar visualmente eventos duplicados ou obsoletos conforme contrato;
- recuperar lacunas após reconexão por nova consulta REST;
- interromper assinatura ao trocar teste ou perder acesso.

## Integração esperada

O cliente usa sessão por cookie e canais autorizados pelo backend. Não recebe
credenciais MQTT e não persiste histórico local como fonte de verdade.

## Critério de saída

O desktop recupera o estado após desconexão e nunca mistura eventos de testes
ou instalações diferentes.
