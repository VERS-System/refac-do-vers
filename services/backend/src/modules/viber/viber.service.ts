// Admite tentativas validadas da Viber; no lote C1 nenhuma geração existe e
// a rota responde indisponível sem tocar o ai-service. O lote C2 acrescenta
// aqui o fetch do stream com a mesma fronteira de configuração.
import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ViberResponseDto } from './viber.dto';

@Injectable()
export class ViberService {
  /** Registra apenas metadados seguros: nunca pergunta, histórico ou perfil. */
  private readonly logger = new Logger(ViberService.name);

  /** Usa a configuração global já validada pelo Joi no boot (padrão: desabilitado). */
  constructor(private readonly config: ConfigService) {}

  /** Recusa a tentativa sem gerar texto; diagnóstico sobe como log de metadados. */
  admitir(entrada: ViberResponseDto): never {
    const habilitada = this.config.get<boolean>('VIBER_ENABLED', false);
    this.logger.log(
      `tentativa Viber recusada habilitada=${String(habilitada)} clientRequestId=${entrada.clientRequestId}`,
    );
    throw new ServiceUnavailableException();
  }
}
