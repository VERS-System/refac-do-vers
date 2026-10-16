/**
 * Formulários da tela Veículos: "Novo veículo" e "Editar veículo".
 *
 * Validam no cliente como o repositório (placa e ano com 4 dígitos) e
 * mostram a recusa do repositório (placa repetida) num aviso. Na edição, a
 * placa não aparece: ela não muda depois do cadastro. O carro é identificado
 * pelo ID gerado pelo sistema.
 */

import { useId, useState, type FormEvent, type ReactNode } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { normalizarPlaca } from '@/data/calculos';
import type { Veiculo } from '@/data/tipos';
import { useAcoesVeiculo } from '@/hooks/useDados';

interface Campos {
  placa: string;
  fabricante: string;
  modelo: string;
  ano: string;
}

type Erros = Partial<Record<keyof Campos, string>>;

/** Ano digitado: vazio vira `null`; texto que não tem 4 dígitos vira `undefined` (erro). */
function lerAno(texto: string): number | null | undefined {
  const limpo = texto.trim();
  if (!limpo) return null;
  return /^\d{4}$/.test(limpo) ? Number(limpo) : undefined;
}

/** Erro do ano, comum ao cadastro e à edição. */
function validarAno(campos: Campos): Erros {
  return {
    ano: lerAno(campos.ano) === undefined ? 'Informe o ano com 4 dígitos.' : undefined,
  };
}

/** Moldura dos formulários: card nomeado pelo título, com aviso de erro e botões. */
function Moldura({
  titulo,
  descricao,
  erro,
  rotuloEnviar,
  enviando,
  onEnviar,
  onCancelar,
  children,
}: {
  titulo: string;
  descricao: string;
  erro: Error | null;
  rotuloEnviar: string;
  enviando: boolean;
  onEnviar: (evento: FormEvent) => void;
  onCancelar: () => void;
  children: ReactNode;
}) {
  const idTitulo = useId();
  return (
    <Card as="section" aria-labelledby={idTitulo}>
      <h2 id={idTitulo} className="text-base leading-[22px] font-semibold text-fg">
        {titulo}
      </h2>
      <p className="mt-1 text-[13px] text-fg-secondary">{descricao}</p>
      <form noValidate onSubmit={onEnviar} className="mt-5 flex flex-col gap-4">
        {children}
        {erro && (
          <p
            role="alert"
            className="rounded-control border border-danger/40 bg-danger-subtle px-3 py-2 text-[13px] text-danger"
          >
            {erro.message}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onCancelar}>
            Cancelar
          </Button>
          <Button type="submit" disabled={enviando}>
            {rotuloEnviar}
          </Button>
        </div>
      </form>
    </Card>
  );
}

/** Fabricante, modelo e ano, iguais no cadastro e na edição. */
function CamposDescricao({
  campos,
  erros,
  onCampos,
}: {
  campos: Campos;
  erros: Erros;
  onCampos: (campos: Campos) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-3">
      <Input
        label="Fabricante"
        value={campos.fabricante}
        onChange={(e) => onCampos({ ...campos, fabricante: e.target.value })}
      />
      <Input
        label="Modelo"
        value={campos.modelo}
        onChange={(e) => onCampos({ ...campos, modelo: e.target.value })}
      />
      <Input
        label="Ano"
        inputMode="numeric"
        value={campos.ano}
        onChange={(e) => onCampos({ ...campos, ano: e.target.value })}
        error={erros.ano}
      />
    </div>
  );
}

export interface FormularioNovoVeiculoProps {
  onCadastrado: (veiculo: Veiculo) => void;
  onCancelar: () => void;
}

/** "Novo veículo": placa obrigatória e única; fabricante, modelo e ano opcionais. */
export function FormularioNovoVeiculo({ onCadastrado, onCancelar }: FormularioNovoVeiculoProps) {
  const { criar } = useAcoesVeiculo();
  const [campos, setCampos] = useState<Campos>({
    placa: '',
    fabricante: '',
    modelo: '',
    ano: '',
  });
  const [erros, setErros] = useState<Erros>({});

  /** Valida no cliente e envia; a recusa do repositório fica em `criar.error`. */
  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    const novos: Erros = {
      placa: normalizarPlaca(campos.placa) ? undefined : 'Informe uma placa válida, como ABC1D23.',
      ...validarAno(campos),
    };
    setErros(novos);
    if (Object.values(novos).some(Boolean)) return;
    try {
      const veiculo = await criar.mutateAsync({
        placa: campos.placa,
        fabricante: campos.fabricante,
        modelo: campos.modelo,
        ano: lerAno(campos.ano),
      });
      onCadastrado(veiculo);
    } catch {
      // A mensagem fica em `criar.error`.
    }
  }

  return (
    <Moldura
      titulo="Novo veículo"
      descricao="O ID é gerado pelo sistema ao salvar. A placa não muda depois do cadastro."
      erro={criar.error}
      rotuloEnviar="Salvar veículo"
      enviando={criar.isPending}
      onEnviar={(e) => void enviar(e)}
      onCancelar={onCancelar}
    >
      <Input
        label="Placa"
        placeholder="ABC1D23"
        value={campos.placa}
        onChange={(e) => setCampos({ ...campos, placa: e.target.value })}
        error={erros.placa}
      />
      <CamposDescricao campos={campos} erros={erros} onCampos={setCampos} />
    </Moldura>
  );
}

export interface FormularioEditarVeiculoProps {
  veiculo: Veiculo;
  onSalvo: () => void;
  onCancelar: () => void;
}

/** "Editar veículo": fabricante, modelo e ano. */
export function FormularioEditarVeiculo({
  veiculo,
  onSalvo,
  onCancelar,
}: FormularioEditarVeiculoProps) {
  const { atualizar } = useAcoesVeiculo();
  const [campos, setCampos] = useState<Campos>({
    placa: veiculo.placa,
    fabricante: veiculo.fabricante ?? '',
    modelo: veiculo.modelo ?? '',
    ano: veiculo.ano ? String(veiculo.ano) : '',
  });
  const [erros, setErros] = useState<Erros>({});

  /** Valida no cliente e salva; a recusa do repositório fica em `atualizar.error`. */
  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    const novos = validarAno(campos);
    setErros(novos);
    if (Object.values(novos).some(Boolean)) return;
    try {
      await atualizar.mutateAsync({
        veiculoId: veiculo.id,
        fabricante: campos.fabricante,
        modelo: campos.modelo,
        ano: lerAno(campos.ano),
      });
      onSalvo();
    } catch {
      // A mensagem fica em `atualizar.error`.
    }
  }

  return (
    <Moldura
      titulo="Editar veículo"
      descricao={`Placa ${veiculo.placa}: a placa não muda depois do cadastro.`}
      erro={atualizar.error}
      rotuloEnviar="Salvar alterações"
      enviando={atualizar.isPending}
      onEnviar={(e) => void enviar(e)}
      onCancelar={onCancelar}
    >
      <CamposDescricao campos={campos} erros={erros} onCampos={setCampos} />
    </Moldura>
  );
}
