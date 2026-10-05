// Audita resultados das mutações de auth sem bloquear sessões por falha de auditoria.
import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Observable, from } from 'rxjs';
import { catchError, concatMap, map } from 'rxjs/operators';
import { AuditEventInput } from '../../common/audit/audit-policy.service';
import { AuditWriterService } from '../../common/audit/audit-writer.service';
import { getRequestId, RequestWithRequestId } from '../../common/http/request-context';

const AUDITED_HANDLERS: Record<string, { action: string; resourceType: string }> = {
  register: { action: 'auth.register', resourceType: 'user' },
  login: { action: 'auth.login', resourceType: 'session' },
  refresh: { action: 'auth.refresh', resourceType: 'session' },
  logout: { action: 'auth.logout', resourceType: 'session' },
  logoutAll: { action: 'auth.logout-all', resourceType: 'session' },
};

@Injectable()
export class AuthAuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuthAuditInterceptor.name);

  /** Recebe o gravador para separar auditoria da transação de autenticação. */
  constructor(private readonly writer: AuditWriterService) {}

  /** Aguarda tentativa de auditoria preservando resposta ou exceção original. */
  intercept(context: ExecutionContext, next: CallHandler<unknown>): Observable<unknown> {
    const operation = AUDITED_HANDLERS[context.getHandler().name];
    if (!operation) return next.handle();
    const requestId = getRequestId(context.switchToHttp().getRequest<RequestWithRequestId>());
    return next.handle().pipe(
      concatMap((value) => from(this.record({ ...operation, result: 'SUCCESS', requestId })).pipe(map(() => value))),
      catchError((error: unknown) => from(this.record({ ...operation, result: 'FAILURE', requestId })).pipe(map(() => { throw error; }))),
    );
  }

  /** Trata falha de auditoria conforme decisão operacional, sem logar a causa. */
  private async record(event: AuditEventInput): Promise<void> {
    try {
      await this.writer.persist(event);
    } catch {
      this.logger.error({ event: 'audit_persistence_failed', action: event.action, requestId: event.requestId });
    }
  }
}
