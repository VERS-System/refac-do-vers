// DTOs comuns para parametros e filtros transversais da API REST.

import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsUUID,
  Matches,
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
 * Confirma que dois filtros UTC formam um intervalo crescente.
 * Existe para impedir consultas abertas ou invertidas antes dos casos de dominio.
 */
@ValidatorConstraint({ name: 'isUtcRangeEndAfterStart', async: false })
class IsUtcRangeEndAfterStart implements ValidatorConstraintInterface {
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
  @Matches(UTC_DATE_TIME_PATTERN)
  startedFrom?: string;

  @IsOptional()
  @Matches(UTC_DATE_TIME_PATTERN)
  @Validate(IsUtcRangeEndAfterStart)
  startedTo?: string;
}
