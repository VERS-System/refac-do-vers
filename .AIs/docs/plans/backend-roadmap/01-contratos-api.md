<!-- Fase 01 do roadmap executável do backend VERS. -->

# Fase 01 — Contratos das APIs

## Objetivo

Permitir que clientes e backend compartilhem formatos estáveis antes de banco,
controllers e MQTT.

## Estado

Em andamento. Envelopes, autenticação, perfil e veículos estão concluídos. O
plano e as decisões desse recorte estão em
[backend-api-contracts-phase-1.md](../backend-api-contracts-phase-1.md).

## Etapa A — Fundação compartilhada — concluída

- envelopes de sucesso, erro e paginação;
- catálogo inicial de erros;
- testes de compilação do `@vers/shared-types`;
- fixtures sintéticas;
- OpenAPI 3.1 e documentação humana.

## Etapa B — Autenticação, perfil e veículos — concluída

- JWT somente em cookies `HttpOnly`, sem tokens no JSON;
- perfil e papéis globais;
- veículos, vínculo `OWNER` e regras de principal;
- placa imutável e documentos pessoais fora do contrato.

## Etapa C — Instalações e configurações

- listar e consultar instalações autorizadas;
- listar configurações versionadas;
- definir campos públicos de dispositivo sem credenciais;
- definir erros de propriedade, estado e conflito.

## Etapa D — Testes experimentais

- criar, iniciar, finalizar, cancelar e consultar testes;
- definir transições de estado e conflitos concorrentes;
- separar contexto do teste de medições e agregados;
- definir filtros, paginação e intervalos.

## Etapa E — Telemetria, resumos e suporte

- contratos paginados de telemetria;
- séries e resumos com unidade explícita;
- qualidade de dados e comparação entre testes;
- criação e acompanhamento de solicitações de revisão.

## Validação

- TypeScript rejeita campos extras e contratos inválidos;
- OpenAPI e tipos possuem os mesmos campos e erros;
- fixtures não contêm tokens, documentos ou dados reais;
- nenhuma decisão de schema vaza para os clientes.

## Saída

Clientes conseguem implementar todos os fluxos previstos usando contratos e
fixtures, sem depender do banco ou do MQTT.
