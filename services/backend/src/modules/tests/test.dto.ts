// Valida planejamento e filtros experimentais sem aceitar estado/snapshot do cliente.
import { Transform } from 'class-transformer';
import { TerrainType, TestStatus } from '@prisma/client';
import { IsEnum, IsNumber, IsOptional, IsPositive, IsString, IsUUID, Matches, MaxLength, Validate, ValidateIf } from 'class-validator';
import { IsUtcRangeEndAfterStart, IsValidUtcDateTime, PaginationQueryDto } from '../../common/dto/pagination.dto';

export class CreateTestDto {
  @IsUUID('4')
  installationId!: string;

  @IsUUID('4')
  configurationId!: string;

  // Preserva tipos originais para rejeitar coerções implícitas da validação global.
  @Transform(({ obj, key }: { obj: Record<string, unknown>; key: string }) => obj[key])
  @IsString()
  @Matches(/\S/)
  @MaxLength(120)
  name!: string;

  @IsEnum(TerrainType)
  terrain!: TerrainType;

  @Transform(({ obj, key }: { obj: Record<string, unknown>; key: string }) => obj[key])
  @IsString()
  @Matches(/\S/)
  @MaxLength(160)
  testLocation!: string;

  @Transform(({ obj, key }: { obj: Record<string, unknown>; key: string }) => obj[key])
  @IsOptional()
  @IsNumber({ allowInfinity: false, allowNaN: false })
  @IsPositive()
  vehicleWeightKg?: number | null;

  @Transform(({ obj, key }: { obj: Record<string, unknown>; key: string }) => obj[key])
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string | null;
}

export class TestQueryDto extends PaginationQueryDto {
  @ValidateIf((_object, value) => value !== undefined)
  @IsUUID('4')
  installationId?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsEnum(TestStatus)
  status?: TestStatus;

  @ValidateIf((_object, value) => value !== undefined)
  @Validate(IsValidUtcDateTime)
  startedFrom?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @Validate(IsValidUtcDateTime)
  @Validate(IsUtcRangeEndAfterStart)
  startedTo?: string;
}
