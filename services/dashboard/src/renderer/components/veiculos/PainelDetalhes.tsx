/**
 * Detalhes do veículo selecionado na tela Veículos e o diálogo de remoção.
 *
 * Mostra o ID gerado pelo sistema (com "Copiar ID"), placa, dados do
 * carro, relação, data do cadastro e a instalação do VERS, se houver. As
 * ações são editar, tornar principal e remover; a remoção segue o backend
 * (substituto quando o principal sai e sobram dois ou mais) e, no exemplo,
 * fica desativada para o carro com instalação, que o backend apagaria junto.
 */

import { useId, useState, type ReactNode } from 'react';
import { Copy, Pencil, Star, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Dialog } from '@/components/ui/Dialog';
import { Select } from '@/components/ui/Select';
import { BADGE_INSTALACAO, TEXTO_RELACAO } from '@/components/veiculo/rotulos';
import type { Veiculo } from '@/data/tipos';
import { useAcoesVeiculo, useInstalacao, useVeiculos } from '@/hooks/useDados';
import { formatarData } from '@/lib/format';
import { nomeDoVeiculo } from './ListaVeiculos';

/** Uma linha da ficha: rótulo e valor. */
function Campo({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-xs text-fg-muted">{rotulo}</dt>
      <dd className="text-sm text-fg">{children}</dd>
    </div>
  );
}

export interface PainelDetalhesProps {
  veiculo: Veiculo;
  onEditar: () => void;
  onTornarPrincipal: () => void;
  onRemover: () => void;
}

/** Ficha do veículo com as ações. */
export function PainelDetalhes({
  veiculo,
  onEditar,
  onTornarPrincipal,
  onRemover,
}: PainelDetalhesProps) {
  const idTitulo = useId();
  const instalacao = useInstalacao(veiculo.id);
  const [copiado, setCopiado] = useState(false);
  const comInstalacao = Boolean(instalacao.data);

  /** Copia o ID completo para a área de transferência. */
  async function copiarId() {
    await navigator.clipboard.writeText(veiculo.id);
    setCopiado(true);
  }

  return (
    <Card as="section" aria-labelledby={idTitulo}>
      <h2 id={idTitulo} className="sr-only">
        Detalhes do veículo
      </h2>
      <header className="flex items-start justify-between gap-3">
        <p className="text-lg font-semibold text-fg">{nomeDoVeiculo(veiculo)}</p>
        {veiculo.principal && <Badge tone="accent">Principal</Badge>}
      </header>

      <div className="mt-5 rounded-control border border-line-subtle bg-inset px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-fg-muted">ID gerado pelo sistema</span>
          <Button
            variant="ghost"
            icon={Copy}
            onClick={() => void copiarId()}
            className="h-8 px-3 text-xs"
          >
            Copiar ID
          </Button>
        </div>
        <p className="mt-1 font-mono text-[13px] break-all text-fg">{veiculo.id}</p>
        <p aria-live="polite" className="mt-1 text-xs text-success">
          {copiado ? 'ID copiado.' : ''}
        </p>
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4">
        <Campo rotulo="Placa">
          <span className="font-mono">{veiculo.placa}</span>
        </Campo>
        <Campo rotulo="Fabricante">{veiculo.fabricante ?? '–'}</Campo>
        <Campo rotulo="Modelo">{veiculo.modelo ?? '–'}</Campo>
        <Campo rotulo="Ano">{veiculo.ano ?? '–'}</Campo>
        <Campo rotulo="Relação">{TEXTO_RELACAO[veiculo.relacao]}</Campo>
        <Campo rotulo="Cadastrado em">{formatarData(veiculo.criadoEm.slice(0, 10))}</Campo>
        <Campo rotulo="Instalação do VERS">
          {instalacao.data ? (
            <span className="flex items-center gap-2">
              <span className="font-mono">{instalacao.data.modelo}</span>
              <Badge tone={BADGE_INSTALACAO[instalacao.data.status].tom}>
                {BADGE_INSTALACAO[instalacao.data.status].texto}
              </Badge>
            </span>
          ) : instalacao.isPending ? (
            '…'
          ) : (
            'Sem instalação'
          )}
        </Campo>
      </dl>

      <div className="mt-6 flex flex-wrap gap-2 border-t border-line-subtle pt-5">
        <Button variant="secondary" icon={Pencil} onClick={onEditar}>
          Editar
        </Button>
        {!veiculo.principal && (
          <Button variant="secondary" icon={Star} onClick={onTornarPrincipal}>
            Tornar principal
          </Button>
        )}
        <Button variant="danger" icon={Trash2} onClick={onRemover} disabled={comInstalacao}>
          Remover
        </Button>
      </div>
      {comInstalacao && (
        <p className="mt-3 text-xs text-fg-muted">
          Remover um veículo com instalação apaga a instalação junto: disponível com a API.
        </p>
      )}
    </Card>
  );
}

export interface DialogoRemoverVeiculoProps {
  veiculo: Veiculo | null;
  onFechar: () => void;
  onRemovido: () => void;
}

/**
 * Confirmação da remoção. Se o carro é o principal e sobram dois ou mais,
 * pede o novo principal; se sobra um, avisa que ele assume.
 */
export function DialogoRemoverVeiculo({
  veiculo,
  onFechar,
  onRemovido,
}: DialogoRemoverVeiculoProps) {
  const { remover } = useAcoesVeiculo();
  const veiculos = useVeiculos();
  const [substitutoId, setSubstitutoId] = useState('');
  const [erroEscolha, setErroEscolha] = useState<string | undefined>();
  const outros = (veiculos.data ?? []).filter((v) => v.id !== veiculo?.id);
  const precisaEscolher = Boolean(veiculo?.principal) && outros.length > 1;

  /** Fecha limpando a escolha e o erro anterior. */
  function fechar() {
    remover.reset();
    setSubstitutoId('');
    setErroEscolha(undefined);
    onFechar();
  }

  /** Confere a escolha do substituto e remove. */
  async function confirmar() {
    if (!veiculo) return;
    if (precisaEscolher && !substitutoId) {
      setErroEscolha('Escolha o novo veículo principal.');
      return;
    }
    try {
      await remover.mutateAsync({
        veiculoId: veiculo.id,
        ...(precisaEscolher ? { substitutoId } : {}),
      });
      setSubstitutoId('');
      setErroEscolha(undefined);
      onRemovido();
    } catch {
      // A mensagem fica em `remover.error`.
    }
  }

  return (
    <Dialog
      aberto={veiculo !== null}
      titulo={veiculo ? `Remover ${nomeDoVeiculo(veiculo)}?` : ''}
      descricao="O veículo sai da sua conta. Os testes já feitos com ele continuam no histórico."
      onFechar={fechar}
    >
      <div className="flex flex-col gap-4">
        {precisaEscolher && (
          <Select
            label="Novo veículo principal"
            value={substitutoId}
            onChange={(e) => {
              setSubstitutoId(e.target.value);
              setErroEscolha(undefined);
            }}
            opcoes={[
              { valor: '', rotulo: 'Escolha um veículo' },
              ...outros.map((v) => ({ valor: v.id, rotulo: `${nomeDoVeiculo(v)} · ${v.placa}` })),
            ]}
            error={erroEscolha}
          />
        )}
        {veiculo?.principal && outros.length === 1 && (
          <p className="text-[13px] text-fg-secondary">
            {`${nomeDoVeiculo(outros[0])} passa a ser o veículo principal.`}
          </p>
        )}
        {remover.error && (
          <p
            role="alert"
            className="rounded-control border border-danger/40 bg-danger-subtle px-3 py-2 text-[13px] text-danger"
          >
            {remover.error.message}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={fechar}>
            Voltar
          </Button>
          <Button variant="danger" disabled={remover.isPending} onClick={() => void confirmar()}>
            Remover veículo
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
