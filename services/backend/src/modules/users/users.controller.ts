// Publica o perfil próprio com proteção de sessão; CSRF é aplicado globalmente.
import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuthPrincipal } from '../auth/auth-principal';
import { UserProfile } from '../../../../../packages/shared-types/src/users';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './update-profile.dto';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  /** Recebe o serviço de perfil para manter persistência fora do controller. */
  constructor(private readonly users: UsersService) {}

  /** Consulta a identidade validada pelo guard, sem aceitar ID fornecido pelo cliente. */
  @Get('me')
  me(@CurrentUser() user: AuthPrincipal): Promise<UserProfile> { return this.users.me(user.id); }

  /** Encaminha somente o DTO validado para atualização da própria conta. */
  @Patch('me')
  update(@CurrentUser() user: AuthPrincipal, @Body() input: UpdateProfileDto): Promise<UserProfile> {
    return this.users.update(user.id, input);
  }
}
