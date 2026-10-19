/**
 * Tela Veículo e instalação do app desktop (referência:
 * design-reference/05-veiculo-instalacao).
 *
 * Três colunas: veículo principal e outros veículos; instalação (topologia,
 * circuito, associação, armazenamento, ponto e versões); dispositivo e
 * histórico de revisões. Plano e decisões em
 * `.AIs/docs/plans/desktop-frontend-veiculo.md`: o cadastro funciona em
 * memória (editar, adicionar, tornar principal); ações no hardware e
 * "Solicitar revisão" esperam a API.
 */

import { useId, useState } from 'react';
import { Plus, Wrench } from 'lucide-react';
import { Page } from '@/components/layout/Page';
import { Button } from '@/components/ui/Button';
import { CardInstalacao } from '@/components/veiculo/CardInstalacao';
import { CardDispositivo, CardRevisoes } from '@/components/veiculo/CardsSistema';
import { CardOutrosVeiculos, CardVeiculo } from '@/components/veiculo/CardsVeiculo';
import {
  DialogoAdicionarVeiculo,
  DialogoEditarVeiculo,
  DialogoTornarPrincipal,
} from '@/components/veiculo/Dialogos';
import { DISPONIVEL_COM_A_API } from '@/components/veiculo/rotulos';
import type { Veiculo } from '@/data/tipos';

/** Renderiza a tela Veículo e instalação. */
export function VeiculoInstalacaoPage() {
  const [editando, setEditando] = useState<Veiculo | null>(null);
  const [tornandoPrincipal, setTornandoPrincipal] = useState<Veiculo | null>(null);
  const [adicionando, setAdicionando] = useState(false);
  const idAviso = useId();

  return (
    <Page
      title="Veículo e instalação"
      subtitle="Cadastro, configuração dos piezos e dispositivo"
      actions={
        <>
          <span id={idAviso} className="sr-only">
            {DISPONIVEL_COM_A_API}
          </span>
          <Button
            variant="secondary"
            icon={Wrench}
            disabled
            aria-describedby={idAviso}
            title={DISPONIVEL_COM_A_API}
          >
            Solicitar revisão
          </Button>
          <Button icon={Plus} onClick={() => setAdicionando(true)}>
            Adicionar veículo
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2 lg:[&>*:last-child]:col-span-2 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.15fr)_minmax(0,0.9fr)] xl:[&>*:last-child]:col-span-1">
        <div className="flex flex-col gap-4">
          <CardVeiculo onEditar={setEditando} />
          <CardOutrosVeiculos onTornarPrincipal={setTornandoPrincipal} />
        </div>
        <CardInstalacao />
        <div className="flex flex-col gap-4">
          <CardDispositivo />
          <CardRevisoes />
        </div>
      </div>
      <DialogoEditarVeiculo veiculo={editando} onFechar={() => setEditando(null)} />
      <DialogoTornarPrincipal
        veiculo={tornandoPrincipal}
        onFechar={() => setTornandoPrincipal(null)}
      />
      <DialogoAdicionarVeiculo aberto={adicionando} onFechar={() => setAdicionando(false)} />
    </Page>
  );
}
