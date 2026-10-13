// Publica a consulta de telemetria com sessão existente e filtros validados.
import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { TelemetrySample } from '../../../../../packages/shared-types/src/telemetry';
import { PaginatedResponse } from '../../../../../packages/shared-types/src/api';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuthPrincipal } from '../auth/auth-principal';
import { DataService } from './data.service';
import { TelemetryQueryDto, TelemetryTestParamDto } from './telemetry-query.dto';

@Controller('tests')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DataController {
  /** Recebe o serviço para manter acesso a dados fora do controller. */
  constructor(private readonly data: DataService) {}

  /** Encaminha o teste e filtros validados com a identidade exclusiva do guard. */
  @Get(':testId/telemetry')
  telemetry(@CurrentUser() user: AuthPrincipal, @Param() params: TelemetryTestParamDto,
    @Query() query: TelemetryQueryDto): Promise<PaginatedResponse<TelemetrySample>> {
    return this.data.telemetry(user.id, params.testId, query);
  }
}
