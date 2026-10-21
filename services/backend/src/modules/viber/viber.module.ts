// Registra o módulo da Viber reutilizando autenticação e configuração
// globais existentes, sem novas conexões de banco ou serviços de dados.
import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ViberController } from './viber.controller';
import { ViberService } from './viber.service';

@Module({ imports: [AuthModule], controllers: [ViberController], providers: [ViberService] })
export class ViberModule {}
