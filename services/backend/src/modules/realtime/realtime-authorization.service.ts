// Autoriza operações do tempo real pelas mesmas sessões e vínculos usados no REST.
import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { isUUID } from 'class-validator';
import { createCorsConfig } from '../../config/cors.config';
import { AuthPrincipal } from '../auth/auth-principal';
import { AuthService } from '../auth/auth.service';
import { readCookie } from '../auth/auth.cookies';
import { ResourceAccessService } from '../auth/resource-access.service';
import { DataUpdatedEvent } from './realtime-contract';

export type RealtimeSubscription = Readonly<{ version: 1; resource: DataUpdatedEvent['resource'] }>;

/** Rejeita campos extras e identidades arbitrárias antes de acessar a persistência. */
export function parseRealtimeSubscription(input: unknown): RealtimeSubscription {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('INVALID_REQUEST');
  const command = input as Record<string, unknown>;
  if (Object.keys(command).some((key) => !['version', 'resource'].includes(key)) || command.version !== 1 ||
    !command.resource || typeof command.resource !== 'object' || Array.isArray(command.resource)) throw new Error('INVALID_REQUEST');
  const resource = command.resource as Record<string, unknown>;
  if (Object.keys(resource).some((key) => !['type', 'id'].includes(key)) ||
    (resource.type !== 'test' && resource.type !== 'installation') ||
    typeof resource.id !== 'string' || !isUUID(resource.id, '4')) throw new Error('INVALID_REQUEST');
  return { version: 1, resource: { type: resource.type, id: resource.id } };
}

@Injectable()
export class RealtimeAuthorizationService {
  private readonly origins: string[];

  /** Reutiliza a configuração CORS e serviços existentes sem abrir conexões ou timers. */
  constructor(private readonly config: ConfigService, private readonly jwt: JwtService,
    private readonly auth: AuthService, private readonly resources: ResourceAccessService) {
    this.origins = createCorsConfig(config.getOrThrow<string>('CORS_ORIGINS')).origin as string[];
  }

  /** Verifica Origin, cookie HS256 e sessão atual em toda chamada, sem cache de permissões. */
  async authenticate(origin: string | undefined, cookie: string | undefined): Promise<AuthPrincipal> {
    if (!origin || origin === 'null' || origin === '*' || !this.origins.includes(origin)) throw new Error('UNAUTHENTICATED');
    const token = readCookie(cookie, 'vers_access');
    if (!token) throw new Error('UNAUTHENTICATED');
    let claims: unknown;
    try {
      claims = await this.jwt.verifyAsync(token, {
        secret: this.config.getOrThrow<string>('auth.accessSecret'), algorithms: ['HS256'],
      });
    } catch { throw new Error('UNAUTHENTICATED'); }
    try { return await this.auth.validateAccessClaims(claims); }
    catch (error) {
      throw new Error(error instanceof UnauthorizedException ? 'UNAUTHENTICATED' : 'REALTIME_UNAVAILABLE');
    }
  }

  /** Revalida sessão e vínculo para cada assinatura ou aviso, ocultando recursos ausentes/alheios. */
  async authorize(origin: string | undefined, cookie: string | undefined, input: unknown): Promise<AuthPrincipal> {
    const { resource } = parseRealtimeSubscription(input);
    const principal = await this.authenticate(origin, cookie);
    try {
      if (resource.type === 'test') await this.resources.requireTest(principal.id, resource.id);
      else await this.resources.requireInstallation(principal.id, resource.id);
    } catch (error) {
      throw new Error(error instanceof NotFoundException ? 'RESOURCE_UNAVAILABLE' : 'REALTIME_UNAVAILABLE');
    }
    return principal;
  }
}
