<!-- Fase 05 do roadmap executável do backend VERS. -->

# Fase 05 — Recursos experimentais do domínio

Em andamento em 06/10/2026 após confirmação de revisão/PR da F04.
Execução por lotes no [plano da F05](../backend-phase-5-execution-roadmap.md).
Lotes 1–7 implementados até 13/10/2026: perfil, veículos, instalações/configurações,
planejamento/ciclo de testes e criação/consultas próprias de suporte.
Lote 8 entregue em 13/10/2026: regressão/conferência concluídas, pronta para
revisão final do programador. Backend 378 testes, lint/build e shared-types
test:unit/lint/build aprovados. Após esclarecimento dos limites, programador
orientou avançar em 13/10/2026: recorte executável concluído, mantendo pendências
reais e capacidades administrativas abaixo fora dessa entrega.

## Limites da entrega por lotes

As etapas abaixo conservam a visão estratégica. O recorte executável entregue
implementa perfil, veículos, leituras de instalações/configurações, ciclo de
testes e suporte próprio. Provisionamento/revogação de dispositivos, mutações
de instalações/configurações e transições administrativas do suporte continuam
dependentes de contratos e decisões operacionais. Não foram implementados.
Concorrência/rollback/cascatas dos services ainda exigem ensaio PostgreSQL real;
os testes HTTP usam persistência sintética. Detalhes e matriz no plano da F05.

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
