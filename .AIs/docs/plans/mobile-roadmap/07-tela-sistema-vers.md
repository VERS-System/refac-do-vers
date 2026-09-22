<!-- Task da tela de informações da instalação física VERS. -->

# Task 07 — Tela Sistema VERS

## Objetivo

Apresentar ao usuário as informações públicas da instalação, configuração e
dispositivos associados ao veículo selecionado.

## O que precisa ser feito

- exibir modelo, identificação pública, status e data da instalação;
- apresentar configuração ativa, quantidade de piezos, associação, ponto de
  instalação e tipo de armazenamento quando disponíveis;
- apresentar dispositivos somente com metadados públicos e estado fornecido;
- diferenciar ativo, manutenção, inativo, falha e informação indisponível;
- oferecer acesso visual a testes e solicitação de revisão;
- criar estados sem instalação, carregamento e erro.

## Integração esperada

Consome instalações, configurações e metadados públicos de dispositivos. A tela
nunca recebe nem manipula credenciais MQTT ou regras de provisionamento.

## Validação

- nenhuma credencial ou identificador secreto é exibido;
- unidades e rótulos físicos seguem o dicionário de dados;
- testes cobrem todos os estados públicos relevantes.

## Critério de saída

O usuário entende qual montagem VERS está associada ao veículo sem acessar dados
operacionais restritos.
