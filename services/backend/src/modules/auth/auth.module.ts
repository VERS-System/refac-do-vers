// Registra apenas a rota CSRF do lote 02 da autenticação VERS.

import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';

@Module({ controllers: [AuthController] })
export class AuthModule {}
