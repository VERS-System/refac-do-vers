/**
 * Textos e tons da tela Testes: terrenos, status, resultados e as opções
 * dos formulários.
 *
 * Ficam juntos para que o mesmo status apareça sempre com o mesmo nome e a
 * mesma cor na lista, no painel e nos diálogos.
 */

import type { BadgeTone } from '@/components/ui/Badge';
import type { OpcaoSelect } from '@/components/ui/Select';
import type { ResultadoTeste, StatusTeste, Terreno, TesteCampo } from '@/data/tipos';

export const TEXTO_TERRENO: Record<Terreno, string> = {
  rodovia: 'Rodovia',
  cidade: 'Cidade',
  'fora-estrada': 'Fora de estrada',
  misto: 'Misto',
  outro: 'Outro',
};

export const TEXTO_RESULTADO: Record<ResultadoTeste, string> = {
  satisfatorio: 'Satisfatório',
  insatisfatorio: 'Insatisfatório',
  inconclusivo: 'Inconclusivo',
};

/** Abas do histórico: todos e cada status do contrato, com o rótulo da aba. */
export const ABAS: { valor: StatusTeste | 'todos'; rotulo: string }[] = [
  { valor: 'todos', rotulo: 'Todos' },
  { valor: 'em-andamento', rotulo: 'Em andamento' },
  { valor: 'concluido', rotulo: 'Concluídos' },
  { valor: 'falhou', rotulo: 'Falhos' },
  { valor: 'planejado', rotulo: 'Planejados' },
  { valor: 'cancelado', rotulo: 'Cancelados' },
];

export const OPCOES_TERRENO: OpcaoSelect[] = (Object.keys(TEXTO_TERRENO) as Terreno[]).map(
  (valor) => ({
    valor,
    rotulo: TEXTO_TERRENO[valor],
  }),
);

export const OPCOES_RESULTADO: OpcaoSelect[] = [
  { valor: '', rotulo: 'Sem resultado' },
  ...(Object.keys(TEXTO_RESULTADO) as ResultadoTeste[]).map((valor) => ({
    valor,
    rotulo: TEXTO_RESULTADO[valor],
  })),
];

/**
 * Badge da situação do teste: o status, ou o resultado quando concluído
 * ("Satisfatório", "Inconclusivo"…). Falha é status ("Falhou"), não resultado.
 */
export function badgeDoTeste(teste: Pick<TesteCampo, 'estado' | 'resultado'>): {
  texto: string;
  tom: BadgeTone;
} {
  switch (teste.estado) {
    case 'em-andamento':
      return { texto: 'Em andamento', tom: 'info' };
    case 'planejado':
      return { texto: 'Planejado', tom: 'neutral' };
    case 'cancelado':
      return { texto: 'Cancelado', tom: 'neutral' };
    case 'falhou':
      return { texto: 'Falhou', tom: 'danger' };
    case 'concluido':
      if (teste.resultado === 'satisfatorio')
        return { texto: TEXTO_RESULTADO.satisfatorio, tom: 'success' };
      if (teste.resultado === 'insatisfatorio')
        return { texto: TEXTO_RESULTADO.insatisfatorio, tom: 'warning' };
      if (teste.resultado === 'inconclusivo')
        return { texto: TEXTO_RESULTADO.inconclusivo, tom: 'neutral' };
      return { texto: 'Concluído', tom: 'success' };
  }
}

/** Testes que podem ser comparados: os encerrados (têm resumo de energia). */
export function comparavel(teste: TesteCampo): boolean {
  return teste.estado === 'concluido' || teste.estado === 'falhou';
}

/** Duração em segundos entre duas datas ISO. */
export function segundosEntre(inicio: string, fim: string): number {
  return Math.max(0, Math.round((Date.parse(fim) - Date.parse(inicio)) / 1000));
}

/** "00:44:00" a partir de segundos. */
export function formatarCronometro(segundos: number): string {
  const dois = (n: number) => String(n).padStart(2, '0');
  return `${dois(Math.floor(segundos / 3600))}:${dois(Math.floor((segundos % 3600) / 60))}:${dois(segundos % 60)}`;
}
