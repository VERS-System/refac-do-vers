/**
 * Utilitário para montar o atributo `className` a partir de classes condicionais.
 */

/** Valores aceitos: textos entram na lista; falsos, nulos e vazios são ignorados. */
export type ClasseCondicional = string | false | null | undefined;

/**
 * Junta classes CSS com espaço, descartando as condicionais que não se aplicam.
 *
 * Permite escrever `cn('base', ativo && 'bg-accent')` sem gerar "false" ou
 * espaços sobrando no HTML.
 */
export function cn(...classes: ClasseCondicional[]): string {
  return classes.filter(Boolean).join(' ');
}
