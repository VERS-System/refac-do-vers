<!-- Fase de Wi-Fi, TLS, autenticação e provisionamento do dispositivo. -->

# Task F07 — Wi-Fi, TLS e provisionamento

## Objetivo

Conectar cada dispositivo ao HiveMQ usando identidade própria, transporte
protegido e configuração que não exponha segredos.

## O que precisa ser feito

- implementar conexão Wi-Fi com timeout e backoff;
- validar TLS e cadeia de confiança suportada pelo MicroPython;
- usar credencial MQTT exclusiva e revogável por dispositivo;
- limitar ACL aos tópicos do próprio `deviceUid`;
- definir keepalive, Last Will e status online/offline;
- armazenar segredos fora do repositório e removê-los de logs;
- documentar provisionamento, rotação e revogação;
- falhar de forma segura quando identidade e tópico não coincidem.

## Testes

- Wi-Fi indisponível, DNS, TLS inválido e credencial revogada;
- dispositivo não publica em tópico de outro dispositivo;
- rotação de credencial não altera a identidade pública;
- logs e dumps não contêm segredos.

## Critério de saída

O ESP32 conecta ao broker de teste por TLS e publica somente nos tópicos
autorizados para sua identidade.
