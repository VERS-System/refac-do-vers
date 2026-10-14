<!-- Descreve eventos internos e limites de entrega antes de ativar Redis ou Socket.IO. -->
# Tempo real v1 — contrato incremental

Estado: lote 8.1 local, evento interno. Namespace, comandos de assinatura,
payload externo e transporte ainda não implementados. Plano em
[F08](../plans/backend-phase-8-execution-roadmap.md).

## Evento interno telemetry.processed

Emitido por MqttPipelineService.events somente depois de process confirmar o
commit de amostras, resumos e estado. Consumidores são código interno confiável;
não encaminhar este objeto diretamente a sockets ou Redis sem contrato,
validação e autorização específicos.

```json
{
  "version": 1,
  "type": "telemetry.processed",
  "messageId": "00000000-0000-4000-8000-000000000701",
  "correlationId": "00000000-0000-4000-8000-000000000701",
  "occurredAt": "2026-10-14T12:00:01.000Z"
}
```

| Campo | Significado |
| --- | --- |
| version | Versão do envelope interno, literal 1. |
| type | Nome do evento, literal telemetry.processed. |
| messageId | ID interno de mqtt_messages; não é o messageId enviado no MQTT. |
| correlationId | Mesmo ID interno, para correlacionar processamento e histórico. |
| occurredAt | UTC ISO do momento de emissão, gerado no backend após o commit. |

Identidade de deduplicação: (type, version, messageId). Não há eventId aleatório
adicional. O evento não contém medições, payload bruto, credenciais, dados
pessoais nem lista de destinatários. Metadados de instalação/teste serão
resolvidos a partir do histórico confiável quando houver roteamento externo.

occurredAt não representa captura, ordenação global ou cursor de paginação.
Mensagem tardia pode afetar períodos antigos; consumidor não pode ignorar a
atualização só porque uma captura mais recente já chegou.

## Falhas, recuperação e duplicatas

- Recuperar RECEIVED e concluir o commit emite o mesmo contrato.
- REJECTED, NOT_FOUND e falha de processamento não emitem evento.
- ALREADY_PROCESSED repara resumos sem nova notificação de telemetria.
- Erro síncrono/assíncrono de listener não desfaz histórico nem impede ACK;
  mantém código seguro de log, sem repassar causa ou conteúdo recebido.
- EventEmitter não garante isolamento entre listeners síncronos: um listener
  que lança pode impedir os seguintes. Listeners futuros devem conter falhas.
- Crash após commit pode perder evento. Não há outbox, replay ou garantia de
  entrega; PostgreSQL e REST autorizado continuam a fonte de verdade.
- Recálculo de TEST ao encerrar teste, sem nova mensagem, ainda não produz
  evento próprio. Essa necessidade deverá ser resolvida no contrato externo.

## Recuperação pelo cliente — próxima etapa

REST atual permite consultar telemetria/resumos por teste e resumos por
instalação. Teste admite criador histórico ou vínculo atual; instalação exige
vínculo atual. Redis ou salas Socket.IO nunca podem ampliar esses acessos.
Snapshot, assinatura confirmada e nova consulta devem fechar a janela entre
carregamento e assinatura; reconexão exige nova consulta autorizada.

Payload externo (aviso para consultar REST ou medições completas) aguarda
decisão do programador. Autenticação existente usa cookies HttpOnly e sessão
validada no banco, sem token em query ou auth. Limites, revogação, Origin e
indisponibilidade Redis serão definidos antes da implementação de transporte.
