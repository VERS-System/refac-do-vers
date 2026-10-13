// Valida os campos mutáveis do perfil; null limpa e ausência preserva o valor.
import { IsOptional, IsString, MaxLength, ValidateBy } from 'class-validator';

/** Valida URI absoluta pela plataforma, sem buscar seu conteúdo ou aceitar espaços. */
function isAbsoluteUri(value: unknown): boolean {
  if (typeof value !== 'string' || /\s/.test(value)) return false;
  try { return Boolean(new URL(value).protocol); } catch { return false; }
}

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  displayName?: string | null;

  @IsOptional()
  @IsString()
  @ValidateBy({ name: 'isAbsoluteUri', validator: { validate: isAbsoluteUri } })
  avatarUrl?: string | null;
}
