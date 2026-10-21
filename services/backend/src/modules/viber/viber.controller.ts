// Expõe a geração da Viber com a mesma sessão, Origin e CSRF das demais
// rotas mutáveis do backend; o SSE cru com resposta controlada só chega no lote C2.
import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ViberResponseDto } from './viber.dto';
import { ViberService } from './viber.service';

/** Rota POST /viber/responses sob o prefixo global da API (api/v1). */
@Controller('viber')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ViberController {
  /** Recebe o serviço para manter admissão e stream fora do ciclo da rota. */
  constructor(private readonly viber: ViberService) {}

  /** Corpo validado pelo pipe global; sem ADMIN exigido, apenas sessão ativa. */
  @Post('responses')
  responder(@Body() entrada: ViberResponseDto): never {
    return this.viber.admitir(entrada);
  }
}
