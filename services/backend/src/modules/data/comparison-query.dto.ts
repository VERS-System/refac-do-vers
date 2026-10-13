// Exige lista curta de UUIDs distintos em parâmetros repetidos, sem CSV ou coerção.
import { ArrayMaxSize, ArrayMinSize, ArrayUnique, IsArray, IsUUID } from 'class-validator';

export class ComparisonQueryDto {
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(5)
  // Compara UUIDs sem diferenciar caixa, protegendo o callback contra tipos inválidos.
  @ArrayUnique((value: unknown): unknown => typeof value === 'string' ? value.toLowerCase() : value)
  @IsUUID('4', { each: true })
  testIds!: string[];
}
