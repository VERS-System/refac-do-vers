// Define o evento interno pós-commit sem transportar medições, identidade de usuário ou payload MQTT.
export const TELEMETRY_PROCESSED_EVENT = 'telemetry.processed';

export type TelemetryProcessedEvent = Readonly<{
  version: 1;
  type: typeof TELEMETRY_PROCESSED_EVENT;
  messageId: string;
  correlationId: string;
  occurredAt: string;
}>;
