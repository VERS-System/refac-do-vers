// Persiste envelopes válidos e agrega rejeições sem copiar conteúdo inválido para logs/banco.
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { IPublishPacket } from 'mqtt';
import { isDeepStrictEqual } from 'node:util';
import { PrismaService } from '../../prisma/prisma.service';
import { parseTelemetryMessage, TelemetryMessage } from './mqtt-contract';

type Receipt = { outcome: 'RECEIVED' | 'DUPLICATE' | 'REJECTED'; id: string | null };
type PersistenceResult = Receipt | 'MQTT_DEVICE_UNAVAILABLE' | 'MQTT_MESSAGE_CONFLICT';
const parserRejections = new Set(['MQTT_INVALID_TOPIC', 'MQTT_PAYLOAD_TOO_LARGE',
  'MQTT_INVALID_JSON', 'MQTT_INVALID_ENVELOPE']);

@Injectable()
export class MqttReceptionService implements OnModuleDestroy {
  private readonly logger = new Logger(MqttReceptionService.name);
  private readonly rejections = new Map<string, number>();
  private logTimer: ReturnType<typeof setTimeout> | undefined;

  /** Reutiliza Prisma global sem abrir conexão MQTT ou criar timers antes da recepção. */
  constructor(private readonly prisma: PrismaService) {}

  /** Valida antes de escrever e só resolve depois do commit ou de rejeição permanente segura. */
  async receive(packet: Pick<IPublishPacket, 'topic' | 'payload' | 'qos' | 'retain'>, receivedAt: Date): Promise<Receipt> {
    if (!Number.isFinite(receivedAt.getTime())) throw new RangeError('Instante de recepção inválido.');
    if (typeof packet.topic !== 'string' || !Buffer.isBuffer(packet.payload) ||
      ![0, 1, 2].includes(packet.qos) || typeof packet.retain !== 'boolean') return this.reject('MQTT_INVALID_PACKET');
    let message: TelemetryMessage;
    try { message = parseTelemetryMessage(packet.topic, packet.payload); }
    catch (error) {
      if (error instanceof Error && parserRejections.has(error.message)) return this.reject(error.message);
      throw new Error('MQTT_RECEPTION_FAILED');
    }
    let result: PersistenceResult;
    try {
      try { result = await this.persist(packet, message, receivedAt); }
      catch (error) {
        if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') throw error;
        // PostgreSQL aborta a transação após unicidade; reconsulta em uma transação nova.
        result = await this.persist(packet, message, receivedAt);
      }
    } catch { throw new Error('MQTT_PERSISTENCE_FAILED'); }
    return typeof result === 'string' ? this.reject(result) : result;
  }

  /** Protege origem contra exclusão/revogação e reconhece retransmissão sem reescrever o bruto. */
  private async persist(packet: Pick<IPublishPacket, 'topic' | 'qos' | 'retain'>,
    message: TelemetryMessage, receivedAt: Date): Promise<PersistenceResult> {
    return this.prisma.$transaction(async (tx): Promise<PersistenceResult> => {
      const device = await tx.device.findUnique({ where: { deviceUid: message.deviceUid },
        select: { id: true, installationId: true, vehicleId: true } });
      if (!device) return 'MQTT_DEVICE_UNAVAILABLE';
      const vehicles = await tx.$queryRaw<{ id: string }[]>`
        SELECT id FROM vehicles WHERE id = ${device.vehicleId}::uuid FOR UPDATE`;
      if (!vehicles.length) return 'MQTT_DEVICE_UNAVAILABLE';
      const installations = await tx.$queryRaw<{ id: string }[]>`
        SELECT id FROM vers_installations WHERE id = ${device.installationId}::uuid
        AND vehicle_id = ${device.vehicleId}::uuid FOR UPDATE`;
      if (!installations.length) return 'MQTT_DEVICE_UNAVAILABLE';
      const devices = await tx.$queryRaw<{ id: string }[]>`
        SELECT id FROM devices WHERE id = ${device.id}::uuid AND device_uid = ${message.deviceUid}
        AND installation_id = ${device.installationId}::uuid AND vehicle_id = ${device.vehicleId}::uuid
        AND revoked_at IS NULL AND status <> 'REVOKED' FOR UPDATE`;
      if (!devices.length) return 'MQTT_DEVICE_UNAVAILABLE';
      const sequence = BigInt(message.sequence);
      const existing = await tx.mqttMessage.findFirst({ where: { OR: [
        { messageId: message.messageId }, { deviceId: device.id, sequence },
      ] }, select: { id: true, messageId: true, deviceId: true, sequence: true, topic: true, payload: true } });
      if (existing) {
        // JSON persistido normaliza -0/0; comparação não depende da ordem das chaves.
        const comparable: unknown = JSON.parse(JSON.stringify(message));
        return existing.deviceId === device.id && existing.messageId === message.messageId &&
          existing.sequence === sequence && existing.topic === packet.topic && isDeepStrictEqual(existing.payload, comparable)
          ? { outcome: 'DUPLICATE', id: existing.id } : 'MQTT_MESSAGE_CONFLICT';
      }
      const row = await tx.mqttMessage.create({ data: { messageId: message.messageId, deviceId: device.id,
        testId: null, schemaVersion: message.schemaVersion, topic: packet.topic,
        payload: message as unknown as Prisma.InputJsonObject, sequence, qos: packet.qos, retained: packet.retain,
        capturedAt: new Date(message.capturedAt), receivedAt, status: 'RECEIVED' }, select: { id: true } });
      return { outcome: 'RECEIVED', id: row.id };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });
  }

  /** Conta apenas códigos controlados pelo backend, mantendo um único timer por janela. */
  private reject(reason: string): Receipt {
    this.rejections.set(reason, (this.rejections.get(reason) ?? 0) + 1);
    if (!this.logTimer) {
      this.logTimer = setTimeout(() => { this.flushRejections(); }, 60000);
      this.logTimer.unref();
    }
    return { outcome: 'REJECTED', id: null };
  }

  /** Emite somente motivos/horário/contagens; não retém tópico, IDs do remetente nem payload. */
  private flushRejections(): void {
    clearTimeout(this.logTimer);
    this.logTimer = undefined;
    if (!this.rejections.size) return;
    // shortcut: crash perde contagens em memória, usar exportação durável quando observabilidade exigir.
    this.logger.warn({ event: 'mqtt_rejections', recordedAt: new Date().toISOString(),
      counts: Object.fromEntries(this.rejections) });
    this.rejections.clear();
  }

  /** Faz flush final e remove timer sem deixar rejeições manterem o processo aberto. */
  onModuleDestroy(): void { this.flushRejections(); }
}
