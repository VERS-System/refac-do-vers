// Exporta transporte e recepção passivos para health e para o pipeline de ingestão.
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MqttService } from './mqtt.service';
import { MqttReceptionService } from './mqtt-reception.service';
import { MqttPipelineService } from './mqtt-pipeline.service';
import { DataModule } from '../data/data.module';

@Module({ imports: [ConfigModule, DataModule], providers: [MqttService, MqttReceptionService, MqttPipelineService],
  exports: [MqttService, MqttReceptionService, MqttPipelineService] })
export class MqttModule {}
