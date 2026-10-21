// Valida a tentativa da Viber segundo o contrato da etapa 3, sem aceitar
// campos, papéis ou estado enviados pelo cliente além do combinado.
import { Transform, TransformFnParams } from 'class-transformer';
import { IsArray, IsBoolean, IsString, IsUUID, Matches, MaxLength, Validate, ValidateIf, ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';

// Limites fixos do contrato: pergunta única, até 3 pares de histórico e
// total de caracteres do conjunto, espelhando o ai-service.
const MAX_MENSAGEM_CHARS = 2000;
const MAX_HISTORICO_PARES = 3;
const MAX_HISTORICO_CHARS = 6000;
const PAPEIS_HISTORICO = ['user', 'assistant'] as const;

/** Item bruto do histórico antes da validação em pares. */
type HistoricoItem = { role?: unknown; content?: unknown };

/** Um item aceito do histórico, conforme o contrato público. */
export type ViberHistoryItem = { role: 'user' | 'assistant'; content: string };

// shortcut: validação estrita do histórico num único ponto, sem depender de
// conversões implícitas do class-transformer para objetos aninhados.
@ValidatorConstraint({ name: 'viberHistoryShape', async: false })
class ViberHistoryShape implements ValidatorConstraintInterface {
  /** Confere pares completos user/assistant alternados, campos exatos e total de caracteres. */
  validate(value: unknown): boolean {
    if (!Array.isArray(value)) return false;
    if (value.length > MAX_HISTORICO_PARES * 2 || value.length % 2 !== 0) return false;
    let total = 0;
    for (let index = 0; index < value.length; index += 1) {
      const item = value[index] as HistoricoItem | null;
      if (!item || typeof item !== 'object' || Array.isArray(item)) return false;
      if (Object.keys(item).length !== 2) return false;
      if (item.role !== PAPEIS_HISTORICO[index % 2]) return false;
      if (typeof item.content !== 'string' || !item.content.trim()) return false;
      total += item.content.length;
    }
    return total <= MAX_HISTORICO_CHARS;
  }

  /** Mensagem fixa sem ecoar o corpo enviado pelo cliente. */
  defaultMessage(): string {
    return 'Histórico precisa de pares user/assistant alternados, sem campos extras e até 6000 caracteres.';
  }
}

export class ViberResponseDto {
  /** UUID da tentativa gerado pelo cliente; correlação sem identidade pessoal. */
  @IsUUID()
  clientRequestId!: string;

  /** Pergunta única com trim, 1 a 2.000 caracteres; valores não textuais voltam crus para falhar. */
  @Transform(({ value, obj, key }: TransformFnParams) =>
    typeof obj[key] === 'string' ? String(value).trim() : obj[key])
  @IsString()
  @Matches(/\S/)
  @MaxLength(MAX_MENSAGEM_CHARS)
  message!: string;

  /** Histórico opcional preservado cru: conversão implícita viraria itens em arrays. */
  @ValidateIf((_object, value) => value !== undefined)
  @Transform(({ obj, key }: TransformFnParams) => obj[key])
  @IsArray()
  @Validate(ViberHistoryShape)
  history?: ViberHistoryItem[];

  /** Padrão ausente; aceita booleano ou 'true'/'false' e devolve o resto cru para falhar. */
  @ValidateIf((_object, value) => value !== undefined)
  @Transform(({ obj, key }: TransformFnParams) => {
    const bruto = obj[key] as unknown;
    if (bruto === 'true') return true;
    if (bruto === 'false') return false;
    if (bruto === undefined) return undefined;
    return bruto;
  })
  @IsBoolean()
  explain?: boolean;
}
