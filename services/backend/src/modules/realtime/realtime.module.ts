// Registra transporte Redis passivo para futura coordenação MQTT e entrega Socket.IO autorizada.
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RealtimePubSubService } from './realtime-pubsub.service';
import { MqttModule } from '../mqtt/mqtt.module';
import { RealtimeIngestionService } from './realtime-ingestion.service';
import { RealtimeNotificationService } from './realtime-notification.service';
import { AuthModule } from '../auth/auth.module';
import { RealtimeAuthorizationService } from './realtime-authorization.service';
import { RealtimeGateway } from './realtime.gateway';
import { DataModule } from '../data/data.module';

@Module({ imports: [ConfigModule, MqttModule, AuthModule, DataModule],
  providers: [RealtimePubSubService, RealtimeNotificationService, RealtimeIngestionService, RealtimeAuthorizationService, RealtimeGateway],
  exports: [RealtimePubSubService, RealtimeIngestionService, RealtimeAuthorizationService] })
export class RealtimeModule {}
