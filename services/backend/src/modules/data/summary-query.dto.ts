// Valida filtros públicos dos resumos sem aceitar versão de cálculo ou identidade do usuário.
import { SummaryPeriod } from '@prisma/client';
import { IsEnum, Validate, ValidateIf } from 'class-validator';
import { IsUtcRangeEndAfterStart, IsValidUtcDateTime, PaginationQueryDto } from '../../common/dto/pagination.dto';

export class SummaryQueryDto extends PaginationQueryDto {
  @ValidateIf((_object, value) => value !== undefined)
  @IsEnum(SummaryPeriod)
  periodType?: SummaryPeriod;

  @ValidateIf((_object, value) => value !== undefined)
  @Validate(IsValidUtcDateTime)
  periodFrom?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @Validate(IsValidUtcDateTime)
  @Validate(IsUtcRangeEndAfterStart, ['periodFrom'])
  periodTo?: string;
}
