/**
 * Tela Veículos do app desktop: cadastro dos carros da conta.
 *
 * Sem referência no Stitch; segue o visual das outras telas. Lista à
 * esquerda e, à direita, os detalhes do carro selecionado (começa no
 * principal), o formulário de cadastro ou o de edição. Cada carro é
 * identificado pelo ID gerado pelo sistema; o chassi, opcional por enquanto,
 * vai identificá-lo quando o sistema for real. Plano em
 * `.AIs/docs/plans/desktop-frontend-veiculos.md`.
 */

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Page } from '@/components/layout/Page';
import { Button } from '@/components/ui/Button';
import { DialogoTornarPrincipal } from '@/components/veiculo/Dialogos';
import {
  FormularioEditarVeiculo,
  FormularioNovoVeiculo,
} from '@/components/veiculos/FormularioVeiculo';
import { ListaVeiculos } from '@/components/veiculos/ListaVeiculos';
import { DialogoRemoverVeiculo, PainelDetalhes } from '@/components/veiculos/PainelDetalhes';
import type { Veiculo } from '@/data/tipos';
import { useVeiculos } from '@/hooks/useDados';

/** O que ocupa o lado direito da tela. */
type Modo = 'detalhes' | 'novo' | 'editar';

/** Renderiza a tela Veículos. */
export function VeiculosPage() {
  const veiculos = useVeiculos();
  const [selecionadoId, setSelecionadoId] = useState<string | null>(null);
  const [modo, setModo] = useState<Modo>('detalhes');
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [tornandoPrincipal, setTornandoPrincipal] = useState<Veiculo | null>(null);
  const [removendo, setRemovendo] = useState<Veiculo | null>(null);

  const lista = veiculos.data ?? [];
  // Sem seleção (ou se o selecionado saiu), mostra o principal.
  const selecionado =
    lista.find((v) => v.id === selecionadoId) ?? lista.find((v) => v.principal) ?? lista[0] ?? null;

  /** Mostra os detalhes de um carro e apaga o aviso anterior. */
  function selecionar(veiculo: Veiculo) {
    setSelecionadoId(veiculo.id);
    setModo('detalhes');
    setMensagem(null);
  }

  return (
    <Page
      title="Veículos"
      subtitle="Cadastro dos carros da conta"
      actions={
        <Button
          icon={Plus}
          onClick={() => {
            setModo('novo');
            setMensagem(null);
          }}
        >
          Novo veículo
        </Button>
      }
    >
      <div className="grid grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] items-start gap-6">
        <ListaVeiculos selecionadoId={selecionado?.id ?? null} onSelecionar={selecionar} />
        <div className="flex flex-col gap-4">
          {mensagem && (
            <p
              role="status"
              className="rounded-control border border-success/30 bg-success-subtle px-4 py-2 text-[13px] text-success"
            >
              {mensagem}
            </p>
          )}
          {modo === 'novo' && (
            <FormularioNovoVeiculo
              onCadastrado={(veiculo) => {
                setSelecionadoId(veiculo.id);
                setModo('detalhes');
                setMensagem('Veículo cadastrado.');
              }}
              onCancelar={() => setModo('detalhes')}
            />
          )}
          {modo === 'editar' && selecionado && (
            <FormularioEditarVeiculo
              key={selecionado.id}
              veiculo={selecionado}
              onSalvo={() => {
                setModo('detalhes');
                setMensagem('Alterações salvas.');
              }}
              onCancelar={() => setModo('detalhes')}
            />
          )}
          {modo === 'detalhes' && selecionado && (
            <PainelDetalhes
              veiculo={selecionado}
              onEditar={() => {
                setModo('editar');
                setMensagem(null);
              }}
              onTornarPrincipal={() => setTornandoPrincipal(selecionado)}
              onRemover={() => setRemovendo(selecionado)}
            />
          )}
        </div>
      </div>
      <DialogoTornarPrincipal
        veiculo={tornandoPrincipal}
        onFechar={() => setTornandoPrincipal(null)}
      />
      <DialogoRemoverVeiculo
        veiculo={removendo}
        onFechar={() => setRemovendo(null)}
        onRemovido={() => {
          setRemovendo(null);
          setSelecionadoId(null);
          setMensagem('Veículo removido.');
        }}
      />
    </Page>
  );
}
