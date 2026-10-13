// DTOs comuns para parametros e filtros transversais da API REST.

import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
  Validate,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

const UTC_DATE_TIME_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;

/**
 * Valida o formato UTC e a existencia do instante sem normalizar dias invalidos.
 * Compara a representacao canonica para rejeitar datas corrigidas pelo Date.
 */
@ValidatorConstraint({ name: 'isValidUtcDateTime', async: false })
export class IsValidUtcDateTime implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (typeof value !== 'string' || !UTC_DATE_TIME_PATTERN.test(value)) {
      return false;
    }

    const instant = new Date(value);
    if (Number.isNaN(instant.getTime())) {
      return false;
    }

    const canonical = instant.toISOString();
    return value.includes('.')
      ? canonical === value
      : `${canonical.slice(0, 19)}Z` === value;
  }

  defaultMessage(): string {
    return 'Informe uma data e hora UTC valida.';
  }
}

/**
 * Confirma que dois filtros UTC formam um intervalo crescente.
 * Existe para impedir consultas abertas ou invertidas antes dos casos de dominio.
 */
@ValidatorConstraint({ name: 'isUtcRangeEndAfterStart', async: false })
export class IsUtcRangeEndAfterStart implements ValidatorConstraintInterface {
  validate(value: unknown, args: ValidationArguments): boolean {
    if (typeof value !== 'string') {
      return true;
    }

    const source = args.object as UtcDateRangeQueryDto;
    if (typeof source.startedFrom !== 'string') {
      return true;
    }

    return new Date(source.startedFrom).getTime() < new Date(value).getTime();
  }

  defaultMessage(): string {
    return 'A data final deve ser posterior a data inicial.';
  }
}

export class PaginationQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 20;
}

export class UuidParamDto {
  @IsUUID('4')
  id!: string;
}

export class UtcDateRangeQueryDto {
  @IsOptional()
  @Validate(IsValidUtcDateTime)
  startedFrom?: string;

  @IsOptional()
  @Validate(IsValidUtcDateTime)
  @Validate(IsUtcRangeEndAfterStart)
  startedTo?: string;
}
