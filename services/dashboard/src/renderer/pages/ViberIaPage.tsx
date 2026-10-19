/**
 * Tela Viber do app desktop (referência: design-reference/06-viber-ia).
 *
 * Conversa com o assistente Viber: mensagens com a natureza de cada resposta
 * (medição, explicação, inferência ou recomendação, como no mobile), a fonte
 * dos números, sugestões, contexto autorizado e conversas recentes. Sem o
 * backend de IA, as sugestões são respondidas pelo repositório de exemplo a
 * partir dos dados calculados e perguntas livres ficam indisponíveis. Plano
 * em `.AIs/docs/plans/desktop-frontend-viber.md`.
 */

import { useState } from 'react';
import { MessageSquarePlus } from 'lucide-react';
import { Page } from '@/components/layout/Page';
import { Button } from '@/components/ui/Button';
import { PainelConversa } from '@/components/viber/PainelConversa';
import { ConversasRecentes, PainelContexto } from '@/components/viber/PainelLateral';
import { useAcoesViber, useContextosViber, useConversasViber } from '@/hooks/useDados';

/** Contexto inicial: a semana, como o resumo sugerido na referência. */
const CONTEXTO_INICIAL = 'semana';

/** Renderiza a tela Viber. */
export function ViberIaPage() {
  const conversas = useConversasViber();
  const contextos = useContextosViber();
  const { nova } = useAcoesViber();
  const [escolhida, setEscolhida] = useState<string | null>(null);
  const [contextoId, setContextoId] = useState(CONTEXTO_INICIAL);
  const conversaId = escolhida ?? conversas.data?.[0]?.id ?? null;
  const contexto = contextos.data?.find((c) => c.id === contextoId);

  /** Cria uma conversa vazia e a abre. */
  async function novaConversa() {
    const conversa = await nova.mutateAsync();
    setEscolhida(conversa.id);
  }

  return (
    <Page
      title="Viber"
      subtitle="Assistente que interpreta seus dados. Os cálculos vêm do backend, não da IA."
      actions={
        <Button
          variant="secondary"
          icon={MessageSquarePlus}
          disabled={nova.isPending}
          onClick={() => void novaConversa()}
        >
          Nova conversa
        </Button>
      }
    >
      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
        <PainelConversa conversaId={conversaId} contexto={contexto} />
        <div className="flex flex-col gap-4">
          <PainelContexto
            contextos={contextos.data}
            contextoId={contextoId}
            onTrocarContexto={setContextoId}
          />
          <ConversasRecentes conversaId={conversaId} onAbrir={setEscolhida} />
        </div>
      </div>
    </Page>
  );
}
