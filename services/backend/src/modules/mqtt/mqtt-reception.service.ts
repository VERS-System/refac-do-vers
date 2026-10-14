// Persiste envelopes válidos e agrega rejeições sem copiar conteúdo inválido para logs/banco.
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { IPublishPacket } from 'mqtt';
import { isDeepStrictEqual } from 'node:util';
import { PrismaService } from '../../prisma/prisma.service';
import { parseTelemetryMessage, TelemetryMessage } from './mqtt-contract';
import { NormalizedTelemetry, normalizeTelemetry } from './mqtt-normalization';
import { EnergySummaryService } from '../data/energy-summary.service';

type Receipt = { outcome: 'RECEIVED' | 'DUPLICATE' | 'REJECTED'; id: string | null };
type PersistenceResult = Receipt | 'MQTT_DEVICE_UNAVAILABLE' | 'MQTT_MESSAGE_CONFLICT';
type Source = { id: string; installationId: string; vehicleId: string; status: string };
type AuthorizedTest = { id: string; status: string; startedAt: Date | null; endedAt: Date | null };
type Authorization = { test: AuthorizedTest | null; rejectionReason: string | null };
type ProcessingResult = { id: string; outcome: 'NOT_FOUND' | 'ALREADY_PROCESSED' | 'REJECTED' } |
  ({ id: string; outcome: 'PROCESSED' } & Omit<NormalizedTelemetry, 'samples'>);
const parserRejections = new Set(['MQTT_INVALID_TOPIC', 'MQTT_PAYLOAD_TOO_LARGE',
  'MQTT_INVALID_JSON', 'MQTT_INVALID_ENVELOPE']);

@Injectable()
export class MqttReceptionService implements OnModuleDestroy {
  private readonly logger = new Logger(MqttReceptionService.name);
  private readonly rejections = new Map<string, number>();
  private logTimer: ReturnType<typeof setTimeout> | undefined;

  /** Reutiliza Prisma global sem abrir conexão MQTT ou criar timers antes da recepção. */
  constructor(private readonly prisma: PrismaService, private readonly summaries: EnergySummaryService) {}

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
      const device = await this.lockDevice(tx, message.deviceUid);
      if (!device) return 'MQTT_DEVICE_UNAVAILABLE';
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
      const { rejectionReason } = await this.authorize(tx, message.testId, packet, device);
      const row = await tx.mqttMessage.create({ data: { messageId: message.messageId, deviceId: device.id,
        testId: rejectionReason ? null : message.testId, schemaVersion: message.schemaVersion, topic: packet.topic,
        payload: message as unknown as Prisma.InputJsonObject, sequence, qos: packet.qos, retained: packet.retain,
        capturedAt: new Date(message.capturedAt), receivedAt,
        ...(rejectionReason ? { status: 'REJECTED', rejectionReason, processedAt: new Date() } : { status: 'RECEIVED' }),
      }, select: { id: true } });
      return { outcome: rejectionReason ? 'REJECTED' : 'RECEIVED', id: row.id };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });
  }

  /** Revalida bruto e autorização atual, gravando todas as amostras e decisão sob o mesmo commit. */
  async process(id: string): Promise<ProcessingResult> {
    try {
      return await this.prisma.$transaction(async (tx): Promise<ProcessingResult> => {
        const raw = await tx.mqttMessage.findUnique({ where: { id } });
        if (!raw) return { outcome: 'NOT_FOUND', id };
        let message: TelemetryMessage | undefined;
        let rejectionReason: string | null = null;
        try { message = parseTelemetryMessage(raw.topic, Buffer.from(JSON.stringify(raw.payload))); }
        catch (error) {
          if (!(error instanceof Error) || !parserRejections.has(error.message)) throw error;
          rejectionReason = error.message;
        }
        if (message && (raw.messageId !== message.messageId || raw.sequence !== BigInt(message.sequence) ||
          raw.schemaVersion !== message.schemaVersion || raw.capturedAt.getTime() !== Date.parse(message.capturedAt))) {
          rejectionReason = 'MQTT_INVALID_ENVELOPE';
        }
        let device: Source | null = null;
        let authorization: Authorization | undefined;
        if (message && !rejectionReason) {
          device = await this.lockDevice(tx, message.deviceUid);
          if (!device || device.id !== raw.deviceId) rejectionReason = 'MQTT_DEVICE_UNAVAILABLE';
          else {
            authorization = await this.authorize(tx, message.testId, { qos: raw.qos, retain: raw.retained }, device);
            rejectionReason = authorization.rejectionReason;
          }
        }
        const [locked] = await tx.$queryRaw<{ id: string; status: string }[]>`
          SELECT id, status FROM mqtt_messages WHERE id = ${id}::uuid FOR UPDATE`;
        if (!locked) return { outcome: 'NOT_FOUND', id };
        if (locked.status === 'PROCESSED') return { outcome: 'ALREADY_PROCESSED', id };
        if (locked.status === 'REJECTED') return { outcome: 'REJECTED', id };
        if (rejectionReason) {
          await tx.mqttMessage.update({ where: { id }, data: { status: 'REJECTED', rejectionReason,
            processedAt: new Date(), testId: null } });
          return { outcome: 'REJECTED', id };
        }
        if (!message || !device || !authorization) throw new Error('MQTT_PROCESSING_FAILED');
        const normalized = normalizeTelemetry(message, { messageId: id, deviceId: device.id,
          installationId: device.installationId, test: authorization.test }, raw.receivedAt);
        await tx.telemetrySample.createMany({ data: normalized.samples });
        await this.summaries.recomputeMessage(id, tx);
        await tx.mqttMessage.update({ where: { id }, data: { status: 'PROCESSED', processedAt: new Date(),
          rejectionReason: null, testId: authorization.test?.id ?? null } });
        return { outcome: 'PROCESSED', id, delivery: normalized.delivery, associations: normalized.associations };
      }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });
    } catch { throw new Error('MQTT_PROCESSING_FAILED'); }
  }

  /** Reutiliza ordem veículo/instalação/dispositivo para proteger origem contra exclusão e revogação. */
  private async lockDevice(tx: Prisma.TransactionClient, deviceUid: string): Promise<Source | null> {
    const device = await tx.device.findUnique({ where: { deviceUid },
      select: { id: true, installationId: true, vehicleId: true } });
    if (!device) return null;
    const vehicles = await tx.$queryRaw<{ id: string }[]>`
      SELECT id FROM vehicles WHERE id = ${device.vehicleId}::uuid FOR UPDATE`;
    if (!vehicles.length) return null;
    const installations = await tx.$queryRaw<{ id: string }[]>`
      SELECT id FROM vers_installations WHERE id = ${device.installationId}::uuid
      AND vehicle_id = ${device.vehicleId}::uuid FOR UPDATE`;
    if (!installations.length) return null;
    const [locked] = await tx.$queryRaw<{ id: string; status: string }[]>`
      SELECT id, status FROM devices WHERE id = ${device.id}::uuid AND device_uid = ${deviceUid}
      AND installation_id = ${device.installationId}::uuid AND vehicle_id = ${device.vehicleId}::uuid
      AND revoked_at IS NULL AND status <> 'REVOKED' FOR UPDATE`;
    return locked ? { ...device, status: locked.status } : null;
  }

  /** Compartilha regras de transporte/estado e bloqueia somente teste autorizado da mesma origem. */
  private async authorize(tx: Prisma.TransactionClient, testId: string | null,
    packet: { qos: number; retain: boolean }, device: Source): Promise<Authorization> {
    if (!['ONLINE', 'OFFLINE', 'FAULT'].includes(device.status)) return { test: null, rejectionReason: 'MQTT_DEVICE_NOT_READY' };
    if (packet.qos !== 1 || packet.retain) return { test: null, rejectionReason: 'MQTT_TRANSPORT_NOT_ALLOWED' };
    if (testId === null) return { test: null, rejectionReason: null };
    const [test] = await tx.$queryRaw<AuthorizedTest[]>`
      SELECT id, status, started_at AS "startedAt", ended_at AS "endedAt" FROM tests
      WHERE id = ${testId}::uuid AND installation_id = ${device.installationId}::uuid
      AND vehicle_id = ${device.vehicleId}::uuid FOR UPDATE`;
    if (!test?.startedAt || !['RUNNING', 'COMPLETED', 'FAILED'].includes(test.status) ||
      (test.status === 'RUNNING' ? test.endedAt !== null : !test.endedAt || test.endedAt <= test.startedAt)) {
      return { test: null, rejectionReason: 'MQTT_TEST_UNAVAILABLE' };
    }
    return { test, rejectionReason: null };
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
