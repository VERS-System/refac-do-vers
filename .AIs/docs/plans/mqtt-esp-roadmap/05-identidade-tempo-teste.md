<!-- Fase de identidade do dispositivo, relógio e associação ao teste. -->

# Task F05 — Identidade, tempo e contexto do teste

## Objetivo

Garantir que cada mensagem informe origem, ordem, instante e contexto sem
atribuir ao dispositivo decisões que pertencem ao backend.

## O que precisa ser feito

- usar `deviceUid` público provisionado e estável;
- gerar `messageId` único e sequência monotônica por dispositivo;
- definir comportamento da sequência após reboot;
- sincronizar relógio e sinalizar quando o instante não for confiável;
- associar `testId` apenas quando recebido por fluxo autorizado;
- registrar versão do firmware, hardware e calibração;
- impedir que o dispositivo declare sozinho um teste como válido ou concluído.

## Testes

- reboot, sequência reiniciada, relógio ausente e sincronização tardia;
- colisão simulada de `messageId`;
- teste nulo, expirado ou substituído;
- identidade do payload coincide com a usada no tópico.

## Critério de saída

Toda mensagem possui origem e ordem rastreáveis, e estados incertos são
representados explicitamente para validação no backend.
