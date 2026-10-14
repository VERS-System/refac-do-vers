// Registra transporte Redis passivo para futura coordenação MQTT e entrega Socket.IO autorizada.
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RealtimePubSubService } from './realtime-pubsub.service';

@Module({ imports: [ConfigModule], providers: [RealtimePubSubService], exports: [RealtimePubSubService] })
export class RealtimeModule {}
