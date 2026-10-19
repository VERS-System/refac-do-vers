// Registra as rotas de autenticação disponíveis e seus serviços.

import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtModule } from '@nestjs/jwt';
import { LoginAttemptsService } from './login-attempts.service';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from '../../common/strategies/jwt.strategy';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ResourceAccessService } from './resource-access.service';
import { AuditPolicyService } from '../../common/audit/audit-policy.service';
import { AuditWriterService } from '../../common/audit/audit-writer.service';
import { AuthAuditInterceptor } from './auth-audit.interceptor';

@Module({
  imports: [JwtModule.register({}), PassportModule.register({ session: false })],
  controllers: [AuthController],
  providers: [AuthService, LoginAttemptsService, JwtStrategy, JwtAuthGuard, RolesGuard, ResourceAccessService, AuditPolicyService, AuditWriterService, AuthAuditInterceptor],
  exports: [JwtAuthGuard, RolesGuard, ResourceAccessService, AuthService, JwtModule],
})
export class AuthModule {}
