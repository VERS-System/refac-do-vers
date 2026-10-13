// Valida alterações parciais e substituto sem converter tipos enviados pelo cliente.
import { Transform } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min, ValidateIf } from 'class-validator';

export class UpdateVehicleDto {
  // Preserva o tipo original; null limpa os campos descritivos.
  @Transform(({ obj, key }: { obj: Record<string, unknown>; key: string }) => obj[key])
  @IsOptional()
  @IsString()
  @MaxLength(80)
  brand?: string | null;

  @Transform(({ obj, key }: { obj: Record<string, unknown>; key: string }) => obj[key])
  @IsOptional()
  @IsString()
  @MaxLength(120)
  model?: string | null;

  @Transform(({ obj, key }: { obj: Record<string, unknown>; key: string }) => obj[key])
  @IsOptional()
  @IsInt()
  @Min(1886)
  @Max(2100)
  modelYear?: number | null;

  @Transform(({ obj, key }: { obj: Record<string, unknown>; key: string }) => obj[key])
  @ValidateIf((_object, value) => value !== undefined)
  @IsBoolean()
  isPrimary?: boolean;
}

export class DeleteVehicleQueryDto {
  @ValidateIf((_object, value) => value !== undefined)
  @IsUUID('4')
  replacementVehicleId?: string;
}
