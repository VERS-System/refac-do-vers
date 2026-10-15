/**
 * Uma mensagem da conversa com o Viber.
 *
 * Mensagens do Viber ficam à esquerda, com a marca; as do usuário, à
 * direita. Como no mobile, inferências e recomendações levam um selo de
 * cautela e toda resposta com números mostra a fonte ("Fonte: …"), para
 * diferenciar o que foi medido do que foi deduzido (task D11). Uma
 * comparação de testes pode vir anexa, com atalho para a tela Testes.
 */

import { useId } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, FlaskConical } from 'lucide-react';
import { ViberMark } from '@/components/ui/ViberMark';
import type { AnexoComparacao, MensagemViber, TipoResposta } from '@/data/tipos';
import { cn } from '@/lib/cn';
import {
  formatarEnergia,
  formatarHorarioCaptura,
  formatarMedida,
  formatarPotencia,
} from '@/lib/format';
import { ROTAS } from '@/routes/navegacao';

/** Selos de cautela, com os mesmos textos do mobile. */
export const SELOS: Partial<Record<TipoResposta, string>> = {
  inferencia: 'Inferência do Viber — pode conter erros',
  recomendacao: 'Recomendação do Viber — confira antes de agir',
};

/** Comparação de testes anexada à resposta. */
function Comparacao({ anexo }: { anexo: AnexoComparacao }) {
  const idTitulo = useId();
  const maior = Math.max(1, ...anexo.itens.map((item) => item.energiaMwh));
  return (
    <section
      aria-labelledby={idTitulo}
      className="mt-3 flex flex-col gap-3 rounded-control border border-line bg-inset p-4"
    >
      <h3 id={idTitulo} className="text-[13px] font-semibold text-fg">
        Comparação de testes
      </h3>
      {anexo.itens.map((item, i) => (
        <div key={item.codigo} className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-3 text-[13px]">
            <span className="text-fg-secondary">{`${item.codigo} · ${item.nome}`}</span>
            <span className="font-mono text-xs text-fg">
              {`${formatarMedida(formatarEnergia(item.energiaMwh, { unidade: 'mWh' }))} · ${formatarMedida(formatarPotencia(item.potenciaMediaMw))}`}
            </span>
          </div>
          <div aria-hidden="true" className="h-1.5 overflow-hidden rounded-full bg-surface-raised">
            <div
              className={cn('h-full rounded-full', i === 0 ? 'bg-chart-3' : 'bg-accent')}
              style={{ width: `${(item.energiaMwh / maior) * 100}%` }}
            />
          </div>
        </div>
      ))}
      <Link
        to={ROTAS.testes}
        className="flex items-center gap-1 text-[13px] font-medium text-accent hover:underline"
      >
        Abrir comparação em Testes
        <ArrowRight aria-hidden="true" className="size-3.5" />
      </Link>
    </section>
  );
}

/** Renderiza a mensagem como um artigo nomeado pelo autor e horário. */
export function Mensagem({ mensagem }: { mensagem: MensagemViber }) {
  const horario = formatarHorarioCaptura(mensagem.enviadaEm).slice(0, 5);
  const doViber = mensagem.autor === 'viber';
  const selo = mensagem.tipo ? SELOS[mensagem.tipo] : undefined;

  if (!doViber) {
    return (
      <article aria-label={`Você, ${horario}`} className="flex flex-col items-end gap-1">
        <span className="font-mono text-[11px] text-fg-muted">{`Você · ${horario}`}</span>
        <p className="max-w-[80%] rounded-card rounded-tr-md bg-surface-raised px-4 py-3 text-sm text-fg">
          {mensagem.texto}
        </p>
      </article>
    );
  }

  return (
    <article aria-label={`Viber, ${horario}`} className="flex gap-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-full border border-accent-border bg-accent-subtle">
        <ViberMark size={16} decorative />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="flex items-center gap-2 text-[13px]">
          <span className="font-semibold text-accent">Viber</span>
          <span className="font-mono text-[11px] text-fg-muted">{horario}</span>
        </span>
        <div className="rounded-card rounded-tl-md border border-line-subtle bg-surface-raised/60 px-4 py-3">
          <p className="text-sm leading-6 text-fg">{mensagem.texto}</p>
          {mensagem.anexo && <Comparacao anexo={mensagem.anexo} />}
        </div>
        {selo && <p className="text-xs font-medium text-warning">{selo}</p>}
        {mensagem.referencia && (
          <p className="flex items-center gap-1.5 font-mono text-[11px] text-fg-muted">
            <FlaskConical aria-hidden="true" className="size-3" />
            {`Fonte: ${mensagem.referencia}.`}
          </p>
        )}
      </div>
    </article>
  );
}
