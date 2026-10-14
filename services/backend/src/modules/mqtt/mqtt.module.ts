// Exporta transporte e recepção passivos para health e para o pipeline de ingestão.
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MqttService } from './mqtt.service';
import { MqttReceptionService } from './mqtt-reception.service';

@Module({ imports: [ConfigModule], providers: [MqttService, MqttReceptionService],
  exports: [MqttService, MqttReceptionService] })
export class MqttModule {}
