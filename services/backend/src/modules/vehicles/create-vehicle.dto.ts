// Valida o cadastro e normaliza a placa conforme o contrato público.
import { Transform } from 'class-transformer';
import { IsInt, IsString, Matches, Max, MaxLength, Min, ValidateIf } from 'class-validator';

export class CreateVehicleDto {
  /** Remove separadores e converte a placa textual antes de validar seu formato. */
  @Transform(({ obj, key }: { obj: Record<string, unknown>; key: string }) => typeof obj[key] === 'string' ? obj[key].toUpperCase().replace(/[\s-]/g, '') : obj[key])
  @Matches(/^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/)
  licensePlate!: string;

  // Preserva o tipo recebido para impedir coerção implícita antes da validação.
  @Transform(({ obj, key }: { obj: Record<string, unknown>; key: string }) => obj[key])
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MaxLength(80)
  brand?: string;

  @Transform(({ obj, key }: { obj: Record<string, unknown>; key: string }) => obj[key])
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MaxLength(120)
  model?: string;

  @Transform(({ obj, key }: { obj: Record<string, unknown>; key: string }) => obj[key])
  @ValidateIf((_object, value) => value !== undefined)
  @IsInt()
  @Min(1886)
  @Max(2100)
  modelYear?: number;
}
