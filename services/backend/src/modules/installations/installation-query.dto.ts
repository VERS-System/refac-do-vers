// Valida filtros e IDs das leituras reutilizando a paginação comum.
import { InstallationStatus } from '@prisma/client';
import { IsEnum, IsUUID, ValidateIf } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

export class InstallationQueryDto extends PaginationQueryDto {
  @ValidateIf((_object, value) => value !== undefined)
  @IsUUID('4')
  vehicleId?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsEnum(InstallationStatus)
  status?: InstallationStatus;
}

export class InstallationParamDto {
  @IsUUID('4')
  installationId!: string;
}

export class ConfigurationParamDto extends InstallationParamDto {
  @IsUUID('4')
  configurationId!: string;
}
