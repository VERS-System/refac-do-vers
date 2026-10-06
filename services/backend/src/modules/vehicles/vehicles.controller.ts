// Publica cadastro, listagem e detalhe com sessão e CSRF existentes.
import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PaginationQueryDto, UuidParamDto } from '../../common/dto/pagination.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuthPrincipal } from '../auth/auth-principal';
import { CreateVehicleDto } from './create-vehicle.dto';
import { VehiclesService } from './vehicles.service';
import { Vehicle } from '../../../../../packages/shared-types/src/vehicles';
import { PaginatedResponse } from '../../../../../packages/shared-types/src/api';

@Controller('vehicles')
@UseGuards(JwtAuthGuard, RolesGuard)
export class VehiclesController {
  /** Recebe o serviço para manter persistência fora das rotas HTTP. */
  constructor(private readonly vehicles: VehiclesService) {}

  /** Encaminha a paginação validada usando a conta fornecida pelo guard. */
  @Get()
  list(@CurrentUser() user: AuthPrincipal, @Query() query: PaginationQueryDto): Promise<PaginatedResponse<Vehicle>> {
    return this.vehicles.list(user.id, query);
  }

  /** Consulta o UUID validado exclusivamente dentro dos vínculos próprios. */
  @Get(':id')
  detail(@CurrentUser() user: AuthPrincipal, @Param() params: UuidParamDto): Promise<Vehicle> {
    return this.vehicles.detail(user.id, params.id);
  }

  /** Cadastra campos validados e atribui a propriedade à conta autenticada. */
  @Post()
  create(@CurrentUser() user: AuthPrincipal, @Body() input: CreateVehicleDto): Promise<Vehicle> {
    return this.vehicles.create(user.id, input);
  }
}
