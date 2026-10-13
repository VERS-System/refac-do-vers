// Valida paginação e intervalo de captura UTC sem aceitar filtros internos.
import { TelemetryQuality } from '@prisma/client';
import { IsEnum, IsUUID, Validate, ValidateIf } from 'class-validator';
import { IsUtcRangeEndAfterStart, IsValidUtcDateTime, PaginationQueryDto } from '../../common/dto/pagination.dto';

export class TelemetryQueryDto extends PaginationQueryDto {
  @ValidateIf((_object, value) => value !== undefined)
  @IsEnum(TelemetryQuality)
  quality?: TelemetryQuality;

  @ValidateIf((_object, value) => value !== undefined)
  @Validate(IsValidUtcDateTime)
  capturedFrom?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @Validate(IsValidUtcDateTime)
  @Validate(IsUtcRangeEndAfterStart, ['capturedFrom'])
  capturedTo?: string;
}

export class TelemetryTestParamDto {
  @IsUUID('4')
  testId!: string;
}
