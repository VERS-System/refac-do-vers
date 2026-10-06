// Publica planejamento e leituras de experimentos com sessão/CSRF existentes.
import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { TestRecord } from '../../../../../packages/shared-types/src/tests';
import { PaginatedResponse } from '../../../../../packages/shared-types/src/api';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UuidParamDto } from '../../common/dto/pagination.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuthPrincipal } from '../auth/auth-principal';
import { CreateTestDto, TestQueryDto } from './test.dto';
import { TestsService } from './tests.service';

@Controller('tests')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TestsController {
  /** Injeta o serviço para manter persistência e autorização fora das rotas. */
  constructor(private readonly tests: TestsService) {}

  /** Encaminha filtros validados e identidade autenticada para a listagem. */
  @Get()
  list(@CurrentUser() user: AuthPrincipal, @Query() query: TestQueryDto): Promise<PaginatedResponse<TestRecord>> {
    return this.tests.list(user.id, query);
  }

  /** Consulta um teste por UUID validado sem aceitar identidade do cliente. */
  @Get(':id')
  detail(@CurrentUser() user: AuthPrincipal, @Param() params: UuidParamDto): Promise<TestRecord> {
    return this.tests.detail(user.id, params.id);
  }

  /** Planeja um experimento validado com snapshot atribuído pelo servidor. */
  @Post()
  create(@CurrentUser() user: AuthPrincipal, @Body() input: CreateTestDto): Promise<TestRecord> {
    return this.tests.create(user.id, input);
  }
}
