// Expõe abertura e consultas próprias de suporte com sessão e validação existentes.
import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { SupportRequest } from '../../../../../packages/shared-types/src/support';
import { PaginatedResponse } from '../../../../../packages/shared-types/src/api';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuthPrincipal } from '../auth/auth-principal';
import { CreateSupportDto, SupportParamDto, SupportQueryDto } from './support.dto';
import { SupportService } from './support.service';

@Controller('support-requests')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SupportController {
  /** Recebe o serviço para manter persistência e autorização fora das rotas. */
  constructor(private readonly support: SupportService) {}

  /** Encaminha filtros validados e identidade obtida exclusivamente pelo guard. */
  @Get()
  list(@CurrentUser() user: AuthPrincipal, @Query() query: SupportQueryDto): Promise<PaginatedResponse<SupportRequest>> {
    return this.support.list(user.id, query);
  }

  /** Abre revisão com motivo validado, solicitante e estado atribuídos pelo servidor. */
  @Post()
  create(@CurrentUser() user: AuthPrincipal, @Body() input: CreateSupportDto): Promise<SupportRequest> {
    return this.support.create(user.id, input);
  }

  /** Consulta UUID validado somente no conjunto de solicitações da conta. */
  @Get(':supportRequestId')
  detail(@CurrentUser() user: AuthPrincipal, @Param() params: SupportParamDto): Promise<SupportRequest> {
    return this.support.detail(user.id, params.supportRequestId);
  }
}
