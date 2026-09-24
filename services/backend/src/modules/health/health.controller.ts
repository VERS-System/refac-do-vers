// Controller dos endpoints publicos de liveness e readiness.

import { Controller, Get } from '@nestjs/common';
import { HealthService, HealthStatus } from './health.service';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  /**
   * Confirma que o processo HTTP esta vivo sem depender de banco ou Redis.
   */
  @Get('live')
  live(): Promise<HealthStatus> {
    return this.healthService.live();
  }

  /**
   * Confirma que o processo esta pronto para atender rotas que dependem do banco.
   */
  @Get('ready')
  ready(): Promise<HealthStatus> {
    return this.healthService.ready();
  }
}
