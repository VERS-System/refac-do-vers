/**
 * Cards de veículos da tela Veículo e instalação: o veículo principal ("em
 * teste") e os outros veículos cadastrados.
 *
 * Mostram só os campos do contrato `Vehicle` (placa, fabricante, modelo,
 * ano, relação e principal). A placa não muda depois do cadastro; trocar o
 * principal pede confirmação.
 */

import { useId } from 'react';
import { ArrowRightLeft, BadgeCheck, Car, Info, Pencil } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EstadoConsulta } from '@/components/ui/EstadoConsulta';
import { Skeleton } from '@/components/ui/Skeleton';
import { nomearVeiculo } from '@/data/calculos';
import type { Veiculo } from '@/data/tipos';
import { useInstalacao, useVeiculos } from '@/hooks/useDados';
import { TEXTO_RELACAO } from './rotulos';

/** Linha "rótulo … valor" da ficha do veículo. */
function Campo({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-line-subtle py-2.5 last:border-0">
      <dt className="text-[13px] text-fg-secondary">{rotulo}</dt>
      <dd className="font-mono text-[13px] text-fg">{valor}</dd>
    </div>
  );
}

export interface CardVeiculoProps {
  onEditar: (veiculo: Veiculo) => void;
}

/** Ficha do veículo principal, com a instalação vinculada e "Editar dados". */
function FichaPrincipal({ veiculo, onEditar }: { veiculo: Veiculo } & CardVeiculoProps) {
  const instalacao = useInstalacao(veiculo.id);
  return (
    <>
      <div className="mt-2 flex items-start justify-between gap-3">
        <p className="text-xl leading-7 font-semibold text-fg">
          {nomearVeiculo(veiculo) || veiculo.placa}
        </p>
        <Badge tone="accent" dot={false}>
          Principal
        </Badge>
      </div>
      <dl className="mt-4">
        <Campo rotulo="Placa" valor={veiculo.placa} />
        <Campo rotulo="Fabricante" valor={veiculo.fabricante ?? '–'} />
        <Campo rotulo="Modelo" valor={veiculo.modelo ?? '–'} />
        <Campo rotulo="Ano" valor={veiculo.ano === null ? '–' : String(veiculo.ano)} />
        <Campo rotulo="Relação" valor={TEXTO_RELACAO[veiculo.relacao]} />
      </dl>
      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-xs text-fg-muted">
          <BadgeCheck aria-hidden="true" className="size-4 text-success" />
          {instalacao.isError ? 'Não foi possível consultar a instalação' : instalacao.precisaEscolher ? 'Selecione uma instalação' : instalacao.data
            ? `Instalação ${instalacao.data.modelo} vinculada`
            : instalacao.isPending
              ? '…'
              : 'Sem instalação'}
        </p>
        <Button variant="ghost" icon={Pencil} onClick={() => onEditar(veiculo)}>
          Editar dados
        </Button>
      </div>
    </>
  );
}

/** Renderiza o card do veículo principal como região "Veículo em teste". */
export function CardVeiculo({ onEditar }: CardVeiculoProps) {
  const veiculos = useVeiculos();
  const idTitulo = useId();
  return (
    <Card as="section" aria-labelledby={idTitulo}>
      <h2
        id={idTitulo}
        className="font-label text-xs font-semibold tracking-[0.08em] text-fg-muted uppercase"
      >
        Veículo em teste
      </h2>
      <EstadoConsulta
        consulta={veiculos}
        nome="os veículos"
        carregando={<Skeleton className="mt-3 h-64 w-full" />}
      >
        {(lista) => {
          const principal = lista.find((v) => v.principal);
          return principal ? (
            <FichaPrincipal veiculo={principal} onEditar={onEditar} />
          ) : (
            <p className="mt-3 text-[13px] text-fg-muted">{lista.length ? 'Nenhum veículo principal definido.' : 'Nenhum veículo cadastrado.'}</p>
          );
        }}
      </EstadoConsulta>
    </Card>
  );
}

/** Um veículo não principal: nome, placa, relação, instalação e "Tornar principal". */
function OutroVeiculo({
  veiculo,
  onTornarPrincipal,
}: {
  veiculo: Veiculo;
  onTornarPrincipal: (v: Veiculo) => void;
}) {
  const instalacao = useInstalacao(veiculo.id);
  const nome = nomearVeiculo(veiculo) || veiculo.placa;
  return (
    <li className="flex flex-col gap-3 rounded-control border border-line-subtle bg-inset p-3">
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-surface-raised">
          <Car aria-hidden="true" className="size-4 text-fg-muted" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <p className="truncate text-sm font-medium text-fg">{nome}</p>
          <p className="font-mono text-xs text-fg-muted">{`Placa ${veiculo.placa} · ${TEXTO_RELACAO[veiculo.relacao]}`}</p>
          <p className="text-xs text-fg-muted">
            {instalacao.isError ? 'Não foi possível consultar a instalação' : instalacao.precisaEscolher ? 'Selecione uma instalação' : instalacao.isPending ? 'Consultando instalação…' : instalacao.data ? `Instalação ${instalacao.data.modelo}` : 'Sem instalação'}
          </p>
        </div>
      </div>
      <Button
        variant="secondary"
        icon={ArrowRightLeft}
        aria-label={`Tornar ${nome} principal`}
        onClick={() => onTornarPrincipal(veiculo)}
      >
        Tornar principal
      </Button>
    </li>
  );
}

export interface CardOutrosVeiculosProps {
  onTornarPrincipal: (veiculo: Veiculo) => void;
}

/** Renderiza a lista dos outros veículos como região "Outros veículos". */
export function CardOutrosVeiculos({ onTornarPrincipal }: CardOutrosVeiculosProps) {
  const veiculos = useVeiculos();
  const idTitulo = useId();
  const outros = veiculos.data?.filter((v) => !v.principal) ?? [];
  return (
    <Card as="section" aria-labelledby={idTitulo} className="flex flex-col gap-4">
      <header className="flex items-center justify-between gap-3">
        <h2
          id={idTitulo}
          className="font-label text-xs font-semibold tracking-[0.08em] text-fg-muted uppercase"
        >
          Outros veículos
        </h2>
        {veiculos.data && (
          <span className="font-mono text-xs text-fg-muted">{`${outros.length} cadastrado(s)`}</span>
        )}
      </header>
      <EstadoConsulta
        consulta={veiculos}
        nome="os veículos"
        carregando={<Skeleton className="h-16 w-full" />}
      >
        {() =>
          outros.length ? (
            <ul className="flex flex-col gap-2">
              {outros.map((veiculo) => (
                <OutroVeiculo
                  key={veiculo.id}
                  veiculo={veiculo}
                  onTornarPrincipal={onTornarPrincipal}
                />
              ))}
            </ul>
          ) : (
            <p className="text-[13px] text-fg-muted">Nenhum outro veículo cadastrado.</p>
          )
        }
      </EstadoConsulta>
      <p className="flex items-start gap-2 rounded-control border border-line-subtle px-3 py-2.5 text-xs text-fg-muted">
        <Info aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />O veículo principal aparece
        nas telas e recebe os próximos testes.
      </p>
    </Card>
  );
}
