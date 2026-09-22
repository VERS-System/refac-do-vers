<!-- Fase 08 do roadmap executável do backend VERS. -->

# Fase 08 — Redis e tempo real

## Objetivo

Distribuir atualizações ao vivo sem tornar clientes dependentes do broker MQTT.

## Etapa A — Eventos internos

- definir nome, versão, payload mínimo e correlation ID;
- publicar somente após persistência/validação;
- evitar dados pessoais e payload MQTT bruto;
- permitir reconstrução do estado pelo banco.

## Etapa B — Redis Pub/Sub

- usar Redis apenas para Pub/Sub e cache reconstruível;
- separar canais por instalação/teste;
- definir comportamento quando Redis fica indisponível;
- não tratar Pub/Sub como fila durável.

## Etapa C — Socket.IO

- autenticar handshake por sessão autorizada;
- autorizar entrada em cada sala por vínculo do recurso;
- impor limites de conexão e assinatura;
- remover sockets de salas após revogação de acesso.

## Etapa D — Consistência do cliente

- carregar snapshot inicial via REST;
- aplicar eventos incrementais versionados;
- recuperar lacunas após reconexão;
- descartar eventos obsoletos e duplicados.

## Testes

- publicação Redis até entrega WebSocket;
- usuário não autorizado não entra na sala;
- sessão revogada encerra acesso;
- reconexão recupera estado sem duplicar dados;
- falha do Redis não corrompe persistência histórica.

## Saída

Dashboard e mobile recebem somente dados autorizados e recuperam o estado após
desconexões.
