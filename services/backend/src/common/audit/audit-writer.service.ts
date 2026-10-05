// Persiste a projeção mínima de auditoria no schema existente, sem payload livre.
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditEventInput, AuditPolicyService } from './audit-policy.service';

@Injectable()
export class AuditWriterService {
  /** Recebe banco e política para validar todo evento antes de gravá-lo. */
  constructor(private readonly prisma: PrismaService, private readonly policy: AuditPolicyService) {}

  /** Grava somente campos permitidos e oculta detalhes internos da persistência. */
  async persist(input: AuditEventInput): Promise<void> {
    await this.policy.persistEvent(input, async (event) => {
      await this.prisma.auditEvent.create({ data: event });
    });
  }
}
