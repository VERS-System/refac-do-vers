// Publica telemetria e resumos com sessão existente e filtros validados.
import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { EnergySummary, TelemetrySample } from '../../../../../packages/shared-types/src/telemetry';
import { PaginatedResponse } from '../../../../../packages/shared-types/src/api';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuthPrincipal } from '../auth/auth-principal';
import { DataService } from './data.service';
import { TelemetryQueryDto, TelemetryTestParamDto } from './telemetry-query.dto';
import { SummaryQueryDto } from './summary-query.dto';
import { InstallationParamDto } from '../installations/installation-query.dto';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class DataController {
  /** Recebe o serviço para manter acesso a dados fora do controller. */
  constructor(private readonly data: DataService) {}

  /** Encaminha o teste e filtros validados com a identidade exclusiva do guard. */
  @Get('tests/:testId/telemetry')
  telemetry(@CurrentUser() user: AuthPrincipal, @Param() params: TelemetryTestParamDto,
    @Query() query: TelemetryQueryDto): Promise<PaginatedResponse<TelemetrySample>> {
    return this.data.telemetry(user.id, params.testId, query);
  }

  /** Consulta resumos do teste com a mesma regra de acesso histórico da telemetria. */
  @Get('tests/:testId/energy-summaries')
  testSummaries(@CurrentUser() user: AuthPrincipal, @Param() params: TelemetryTestParamDto,
    @Query() query: SummaryQueryDto): Promise<PaginatedResponse<EnergySummary>> {
    return this.data.testSummaries(user.id, params.testId, query);
  }

  /** Consulta resumos da instalação somente após verificar seu vínculo no serviço. */
  @Get('installations/:installationId/energy-summaries')
  installationSummaries(@CurrentUser() user: AuthPrincipal, @Param() params: InstallationParamDto,
    @Query() query: SummaryQueryDto): Promise<PaginatedResponse<EnergySummary>> {
    return this.data.installationSummaries(user.id, params.installationId, query);
  }
}
