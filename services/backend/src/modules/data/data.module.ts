// Registra a consulta de dados reutilizando autenticação e Prisma existentes.
import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DataController } from './data.controller';
import { DataService } from './data.service';

@Module({ imports: [AuthModule], controllers: [DataController], providers: [DataService] })
export class DataModule {}
