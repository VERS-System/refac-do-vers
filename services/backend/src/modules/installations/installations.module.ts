// Registra as leituras de instalações reutilizando a autenticação existente.
import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { InstallationsController } from './installations.controller';
import { InstallationsService } from './installations.service';

@Module({ imports: [AuthModule], controllers: [InstallationsController], providers: [InstallationsService] })
export class InstallationsModule {}
