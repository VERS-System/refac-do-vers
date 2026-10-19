/**
 * Card "Comparação de testes" da tela Testes.
 *
 * Compara de 2 a 5 testes encerrados pelas métricas do resumo de cada um
 * (energia recuperada, potência média, pico de potência e amostras), com
 * barras proporcionais ao maior valor de cada métrica. Não traz o texto
 * interpretativo da referência: só o que é calculado.
 */

import { useId } from 'react';
import { GitCompareArrows } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { EstadoConsulta } from '@/components/ui/EstadoConsulta';
import { Skeleton } from '@/components/ui/Skeleton';
import type { ItemComparacao, ResumoTeste, TesteCampo } from '@/data/tipos';
import { useComparacaoTestes } from '@/hooks/useDados';
import { formatarEnergia, formatarMedida, formatarNumero, formatarPotencia } from '@/lib/format';

/** Cores dos testes comparados, na ordem da seleção. */
const CORES = [
  'var(--color-chart-1)',
  'var(--color-chart-2)',
  'var(--color-chart-3)',
  'var(--color-success)',
  'var(--color-warning)',
];

/**
 * Métricas comparadas: nome, como ler do resumo e como escrever o valor (na
 * unidade escolhida nas Configurações).
 */
const METRICAS: {
  nome: string;
  valor: (resumo: ResumoTeste) => number | null;
  texto: (valor: number) => string;
}[] = [
  {
    nome: 'Energia recuperada',
    valor: (r) => r.energiaRecuperadaMwh,
    texto: (v) => formatarMedida(formatarEnergia(v, { unidade: 'mWh' })),
  },
  {
    nome: 'Potência média',
    valor: (r) => r.potenciaMediaMw,
    texto: (v) => formatarMedida(formatarPotencia(v)),
  },
  {
    nome: 'Pico de potência',
    valor: (r) => r.picoPotenciaMw,
    texto: (v) => formatarMedida(formatarPotencia(v)),
  },
  { nome: 'Amostras', valor: (r) => r.amostras, texto: (v) => formatarNumero(v) },
];

export interface ComparacaoTestesProps {
  /** Testes comparados (na ordem escolhida), ou `null` antes de comparar. */
  testes: TesteCampo[] | null;
}

/** Uma métrica: uma linha por teste com o valor e a barra relativa ao maior. */
function Metrica({
  metrica,
  itens,
  codigos,
}: {
  metrica: (typeof METRICAS)[number];
  itens: ItemComparacao[];
  codigos: Map<string, string>;
}) {
  const valores = itens.map((item) => (item.resumo ? metrica.valor(item.resumo) : null));
  const maior = Math.max(1, ...valores.map((v) => v ?? 0));
  return (
    <div className="flex flex-col gap-2">
      <p className="font-mono text-xs text-fg-secondary">{metrica.nome}</p>
      {itens.map((item, i) => {
        const valor = valores[i];
        return (
          <div key={item.testeId} className="flex flex-col gap-1">
            <div className="flex items-center justify-between font-mono text-xs">
              <span className="text-fg-muted">{codigos.get(item.testeId)}</span>
              <span className="text-fg">{valor === null ? '–' : metrica.texto(valor)}</span>
            </div>
            <div
              aria-hidden="true"
              className="h-1.5 overflow-hidden rounded-full bg-surface-raised"
            >
              <div
                className="h-full rounded-full"
                style={{
                  width: `${((valor ?? 0) / maior) * 100}%`,
                  backgroundColor: CORES[i % CORES.length],
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Renderiza o card como região nomeada "Comparação de testes". */
export function ComparacaoTestes({ testes }: ComparacaoTestesProps) {
  const idTitulo = useId();
  const comparacao = useComparacaoTestes(testes ? testes.map((t) => t.id) : null);
  const codigos = new Map((testes ?? []).map((t) => [t.id, t.codigo]));

  return (
    <Card as="section" aria-labelledby={idTitulo} className="flex flex-col gap-4">
      <header className="flex items-center gap-2">
        <GitCompareArrows aria-hidden="true" className="size-4 text-accent" />
        <h2 id={idTitulo} className="text-base leading-[22px] font-semibold text-fg">
          Comparação de testes
        </h2>
      </header>
      {testes ? (
        <EstadoConsulta
          consulta={comparacao}
          nome="a comparação"
          carregando={<Skeleton className="h-48 w-full" />}
        >
          {(itens) => (
            <div className="flex flex-col gap-5">
              <ul aria-label="Testes comparados" className="flex flex-wrap gap-3">
                {testes.map((teste, i) => (
                  <li
                    key={teste.id}
                    className="flex items-center gap-2 font-mono text-xs text-fg-secondary"
                  >
                    <span
                      aria-hidden="true"
                      className="size-2 rounded-full"
                      style={{ backgroundColor: CORES[i % CORES.length] }}
                    />
                    {`${teste.codigo} · ${teste.nome}`}
                  </li>
                ))}
              </ul>
              {METRICAS.map((metrica) => (
                <Metrica key={metrica.nome} metrica={metrica} itens={itens} codigos={codigos} />
              ))}
            </div>
          )}
        </EstadoConsulta>
      ) : (
        <p className="text-[13px] text-fg-muted">
          Selecione de 2 a 5 testes encerrados na lista e clique em Comparar.
        </p>
      )}
    </Card>
  );
}
