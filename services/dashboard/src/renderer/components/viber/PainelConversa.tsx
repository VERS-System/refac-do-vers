/**
 * Painel da conversa com o Viber: mensagens, sugestões e composição.
 *
 * A lista de mensagens é um `role="log"`, que anuncia as respostas novas sem
 * interromper o leitor de tela. Sugestões enviam perguntas que o exemplo sabe
 * responder; pergunta livre recebe o aviso de indisponível e o rascunho fica
 * no campo (task D11). Enquanto o Viber responde, a tela avisa.
 */

import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { SendHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EstadoConsulta } from '@/components/ui/EstadoConsulta';
import { Skeleton } from '@/components/ui/Skeleton';
import type { ContextoViber, SugestaoViber } from '@/data/tipos';
import { useAcoesViber, useMensagensViber } from '@/hooks/useDados';
import { Mensagem } from './Mensagem';

export interface PainelConversaProps {
  conversaId: string | null;
  contexto: ContextoViber | undefined;
}

/** Sugestões oferecidas; o resumo segue o contexto escolhido. */
function sugestoes(contexto: ContextoViber | undefined): { id: SugestaoViber; texto: string }[] {
  return [
    { id: 'eficiencia', texto: 'Por que a eficiência caiu?' },
    { id: 'resumo', texto: `Resumo ${contexto?.rotuloResumo ?? 'da semana'}` },
    { id: 'revisao', texto: 'Quando revisar os piezos?' },
  ];
}

/** Renderiza a conversa, as sugestões e o campo de mensagem. */
export function PainelConversa({ conversaId, contexto }: PainelConversaProps) {
  const mensagens = useMensagensViber(conversaId);
  const { enviar } = useAcoesViber();
  const [rascunho, setRascunho] = useState('');
  const idCampo = useId();
  const fim = useRef<HTMLDivElement>(null);
  const quantidade = mensagens.data?.length ?? 0;

  // Rola para a última mensagem quando chegam respostas novas.
  useEffect(() => {
    fim.current?.scrollIntoView?.({ block: 'end' });
  }, [quantidade]);

  // Trocar de conversa limpa o aviso da tentativa anterior.
  useEffect(() => {
    enviar.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversaId]);

  /** Envia uma sugestão (o rascunho não é tocado). */
  function enviarSugestao(sugestao: SugestaoViber, texto: string) {
    if (!conversaId || !contexto) return;
    enviar.mutate({ conversaId, contextoId: contexto.id, texto, sugestao });
  }

  /** Envia a pergunta livre; só limpa o campo se o Viber aceitar. */
  async function enviarPergunta(evento: FormEvent) {
    evento.preventDefault();
    if (!conversaId || !contexto || !rascunho.trim()) return;
    try {
      await enviar.mutateAsync({ conversaId, contextoId: contexto.id, texto: rascunho.trim() });
      setRascunho('');
    } catch {
      // O aviso fica em `enviar.error`; o rascunho continua no campo.
    }
  }

  return (
    <Card as="section" aria-label="Conversa" padded={false} className="flex min-h-[640px] flex-col">
      <div
        role="log"
        aria-label="Mensagens da conversa"
        aria-live="polite"
        className="flex-1 overflow-y-auto p-6"
      >
        <EstadoConsulta
          consulta={mensagens}
          nome="a conversa"
          carregando={<Skeleton className="h-64 w-full" />}
        >
          {(lista) =>
            lista.length ? (
              <div className="flex flex-col gap-6">
                {lista.map((mensagem) => (
                  <Mensagem key={mensagem.id} mensagem={mensagem} />
                ))}
              </div>
            ) : (
              <p className="py-16 text-center text-[13px] text-fg-muted">
                Escolha uma sugestão para começar.
              </p>
            )
          }
        </EstadoConsulta>
        {enviar.isPending && (
          <p role="status" className="mt-6 font-mono text-xs text-fg-muted">
            Viber está respondendo…
          </p>
        )}
        <div ref={fim} />
      </div>
      <div className="flex flex-wrap items-center gap-2 border-t border-line-subtle px-6 py-3">
        <span className="font-label text-[11px] tracking-[0.06em] text-fg-muted uppercase">
          Sugestões
        </span>
        {sugestoes(contexto).map((sugestao) => (
          <button
            key={sugestao.id}
            type="button"
            disabled={!conversaId || !contexto || enviar.isPending}
            onClick={() => enviarSugestao(sugestao.id, sugestao.texto)}
            className="h-8 rounded-full border border-line px-3 text-[13px] text-fg-secondary transition-colors hover:bg-hover hover:text-fg disabled:opacity-50"
          >
            {sugestao.texto}
          </button>
        ))}
      </div>
      <form
        onSubmit={enviarPergunta}
        className="flex flex-col gap-2 border-t border-line-subtle px-4 py-4 sm:px-6"
      >
        {enviar.error && (
          <p role="alert" className="text-[13px] text-warning">
            {enviar.error.message}
          </p>
        )}
        <div className="flex items-center gap-2 sm:gap-3">
          <label htmlFor={idCampo} className="sr-only">
            Pergunte ao Viber sobre seus dados
          </label>
          <input
            id={idCampo}
            value={rascunho}
            onChange={(evento) => setRascunho(evento.target.value)}
            placeholder="Pergunte ao Viber sobre seus dados…"
            className="h-12 min-w-0 flex-1 rounded-full border border-line bg-inset px-5 text-sm text-fg placeholder:text-fg-muted focus-visible:border-accent-border"
          />
          {/* No celular só o ícone aparece; o nome "Enviar" continua para o leitor de tela. */}
          <Button
            type="submit"
            icon={SendHorizontal}
            disabled={!rascunho.trim() || enviar.isPending}
            className="px-4 sm:px-5"
          >
            <span className="sr-only sm:not-sr-only">Enviar</span>
          </Button>
        </div>
      </form>
    </Card>
  );
}
