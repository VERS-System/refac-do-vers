// Valida suporte, paginação e conteúdo sem aceitar identidade ou estado do cliente.
import { Transform } from 'class-transformer';
import { SupportStatus } from '@prisma/client';
import { IsEnum, IsString, IsUUID, Matches, MaxLength, Validate, ValidateIf, ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

// shortcut: detecta padrões reconhecíveis, ampliar com casos reais sem presumir detecção de todo segredo.
const forbiddenReason = /\b\d{3}[.\s]?\d{3}[.\s]?\d{3}[-\s]?\d{2}\b|\b[A-Z]{3}[\s-]?\d[A-Z0-9]\d{2}\b|\b(?:cpf|crlv|renavam|senha|password|token|credencial|credentials?|authorization|api[ _-]?key|secret)\b|\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b|-----BEGIN [A-Z ]*PRIVATE KEY-----|\b(?:sk|ghp|github_pat)[_-][A-Za-z0-9_-]+/i;

@ValidatorConstraint({ name: 'safeSupportReason', async: false })
class SafeSupportReason implements ValidatorConstraintInterface {
  /** Recusa padrões sensíveis e caracteres de controle mantendo quebras de linha e tabulação. */
  validate(value: unknown): boolean {
    return typeof value === 'string' && !forbiddenReason.test(value) &&
      !Array.from(value).some((character) => character.charCodeAt(0) < 32 && !'\t\n\r'.includes(character) || character.charCodeAt(0) === 127);
  }
}

export class CreateSupportDto {
  @IsUUID('4')
  vehicleId!: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsUUID('4')
  installationId?: string;

  @Transform(({ obj, key }: { obj: Record<string, unknown>; key: string }) => obj[key])
  @IsString()
  @Matches(/\S/)
  @MaxLength(1000)
  @Validate(SafeSupportReason, { message: 'Informe o motivo sem documentos, identificadores pessoais ou credenciais.' })
  reason!: string;
}

export class SupportQueryDto extends PaginationQueryDto {
  @ValidateIf((_object, value) => value !== undefined)
  @IsEnum(SupportStatus)
  status?: SupportStatus;
}

export class SupportParamDto {
  @IsUUID('4')
  supportRequestId!: string;
}
