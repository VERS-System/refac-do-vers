// Publica somente leituras de instalações/configurações com a sessão existente.
import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { Installation, Configuration } from '../../../../../packages/shared-types/src/installations';
import { PaginatedResponse } from '../../../../../packages/shared-types/src/api';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuthPrincipal } from '../auth/auth-principal';
import { ConfigurationParamDto, InstallationParamDto, InstallationQueryDto } from './installation-query.dto';
import { InstallationsService } from './installations.service';

@Controller('installations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InstallationsController {
  /** Recebe o serviço para manter consultas fora das rotas HTTP. */
  constructor(private readonly installations: InstallationsService) {}

  /** Encaminha filtros validados usando somente a identidade do guard. */
  @Get()
  list(@CurrentUser() user: AuthPrincipal, @Query() query: InstallationQueryDto): Promise<PaginatedResponse<Installation>> {
    return this.installations.list(user.id, query);
  }

  /** Consulta instalação por UUID validado e vínculo próprio. */
  @Get(':installationId')
  detail(@CurrentUser() user: AuthPrincipal, @Param() params: InstallationParamDto): Promise<Installation> {
    return this.installations.detail(user.id, params.installationId);
  }

  /** Lista versões da instalação com paginação comum e acesso próprio. */
  @Get(':installationId/configurations')
  configurations(@CurrentUser() user: AuthPrincipal, @Param() params: InstallationParamDto,
    @Query() query: PaginationQueryDto): Promise<PaginatedResponse<Configuration>> {
    return this.installations.configurations(user.id, params.installationId, query);
  }

  /** Consulta versão com ambos os UUIDs validados para impedir mistura de instalações. */
  @Get(':installationId/configurations/:configurationId')
  configuration(@CurrentUser() user: AuthPrincipal, @Param() params: ConfigurationParamDto): Promise<Configuration> {
    return this.installations.configuration(user.id, params.installationId, params.configurationId);
  }
}
