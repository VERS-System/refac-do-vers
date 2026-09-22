<!-- Task das telas de instalações, configurações e dispositivos VERS. -->

# Task D07 — Telas Sistema VERS

## Objetivo

Apresentar instalações, configurações físicas e dispositivos com os detalhes
públicos adequados a uma tela desktop.

## O que precisa ser feito

- criar lista e detalhes de instalações acessíveis;
- mostrar modelo, serial público, status e datas;
- exibir versões de configuração e destacar a ativa;
- mostrar piezos, associação, ponto e armazenamento quando disponíveis;
- exibir firmware, estado e última atividade pública dos dispositivos;
- criar estados manutenção, inativo, falha, sem dispositivo e erro;
- disponibilizar atalhos para testes e suporte.

## Limites

- credenciais MQTT nunca aparecem no renderer;
- provisionamento e revogação só aparecem para papel autorizado e continuam
  validados pelo backend;
- nenhuma configuração usada em teste é alterada localmente.

## Critério de saída

O usuário identifica montagem e estado sem acessar segredos ou estruturas
internas do banco.
