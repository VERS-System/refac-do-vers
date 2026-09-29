// Registra as rotas de autenticação disponíveis e seus serviços.

import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtModule } from '@nestjs/jwt';
import { LoginAttemptsService } from './login-attempts.service';

@Module({ imports: [JwtModule.register({})], controllers: [AuthController], providers: [AuthService, LoginAttemptsService] })
export class AuthModule {}
