<!-- Fase 05 do roadmap executável do backend VERS. -->

# Fase 05 — Recursos experimentais do domínio

## Objetivo

Implementar os casos de uso persistentes que preparam e controlam um teste VERS.

## Etapa A — Perfil e veículos

- consultar e atualizar perfil permitido;
- cadastrar veículo com placa imutável;
- criar vínculo `OWNER` para o usuário;
- garantir exatamente um principal quando houver veículos;
- trocar e excluir vínculo de forma transacional;
- preservar histórico de instalações e testes.

## Etapa B — Instalações

- listar instalações acessíveis ao usuário;
- consultar modelo, status e datas;
- impedir associação a veículo não autorizado;
- restringir criação e manutenção a papel autorizado.

## Etapa C — Dispositivos

- provisionar e revogar identidade do dispositivo;
- expor somente metadados seguros;
- registrar status e `lastSeenAt` sem aceitar spoofing do cliente;
- separar credencial MQTT do registro público.

## Etapa D — Configurações

- criar snapshots versionados e imutáveis;
- validar piezos, associação, armazenamento e ponto de instalação;
- impedir alteração de configuração já usada em teste;
- selecionar configuração ativa explicitamente.

## Etapa E — Ciclo de vida do teste

- criar teste planejado;
- iniciar, finalizar, falhar ou cancelar com transições válidas;
- validar veículo, instalação e configuração compatíveis;
- proteger transições concorrentes;
- registrar operador e timestamps do servidor.

## Etapa F — Suporte

- abrir solicitação de revisão;
- limitar texto e rejeitar documentos;
- consultar e alterar status conforme papel;
- auditar transições sem copiar conteúdo excessivo.

## Testes

- autorização por objeto em todos os casos;
- integridade transacional do veículo principal;
- conflitos de estado e concorrência;
- deleções sem perda de histórico;
- usuário A nunca acessa dados do usuário B.

## Saída

Um usuário autorizado prepara instalação e inicia um teste antes da chegada da
telemetria.
