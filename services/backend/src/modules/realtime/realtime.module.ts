// Registra transporte Redis passivo para futura coordenação MQTT e entrega Socket.IO autorizada.
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RealtimePubSubService } from './realtime-pubsub.service';
import { MqttModule } from '../mqtt/mqtt.module';
import { RealtimeIngestionService } from './realtime-ingestion.service';
import { RealtimeNotificationService } from './realtime-notification.service';

@Module({ imports: [ConfigModule, MqttModule], providers: [RealtimePubSubService, RealtimeNotificationService, RealtimeIngestionService],
  exports: [RealtimePubSubService, RealtimeIngestionService] })
export class RealtimeModule {}
