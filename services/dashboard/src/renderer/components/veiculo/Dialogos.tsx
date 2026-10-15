/**
 * Diálogos de cadastro da tela Veículo e instalação: editar o veículo,
 * adicionar veículo e tornar outro veículo o principal.
 *
 * Seguem a task D09: a placa não muda depois do cadastro; placa repetida e
 * dados inválidos voltam como erro do repositório e aparecem no diálogo; a
 * tela só muda depois da resposta.
 */

import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { nomearVeiculo, normalizarPlaca } from '@/data/calculos';
import type { Veiculo } from '@/data/tipos';
import { useAcoesVeiculo } from '@/hooks/useDados';

/** Mensagem de erro de uma ação recusada. */
function ErroDaAcao({ erro }: { erro: Error | null }) {
  if (!erro) return null;
  return (
    <p
      role="alert"
      className="rounded-control border border-danger/40 bg-danger-subtle px-3 py-2 text-[13px] text-danger"
    >
      {erro.message}
    </p>
  );
}

/** Rodapé com "Voltar" e o botão da ação. */
function Rodape({ onVoltar, children }: { onVoltar: () => void; children: ReactNode }) {
  return (
    <div className="flex justify-end gap-2">
      <Button variant="ghost" onClick={onVoltar}>
        Voltar
      </Button>
      {children}
    </div>
  );
}

/** Ano digitado: vazio vira `null`; texto que não é número inteiro vira `undefined` (erro). */
function lerAno(texto: string): number | null | undefined {
  const limpo = texto.trim();
  if (!limpo) return null;
  return /^\d{4}$/.test(limpo) ? Number(limpo) : undefined;
}

/** Campos comuns aos formulários de veículo. */
interface CamposVeiculo {
  fabricante: string;
  modelo: string;
  ano: string;
}

export interface DialogoEditarVeiculoProps {
  veiculo: Veiculo | null;
  onFechar: () => void;
}

/** Edição de fabricante, modelo e ano; a placa aparece desativada. */
export function DialogoEditarVeiculo({ veiculo, onFechar }: DialogoEditarVeiculoProps) {
  const { atualizar } = useAcoesVeiculo();
  const [campos, setCampos] = useState<CamposVeiculo>({ fabricante: '', modelo: '', ano: '' });
  const [erroAno, setErroAno] = useState<string | undefined>();

  // Ao abrir, preenche com os dados atuais do veículo.
  useEffect(() => {
    if (veiculo) {
      setCampos({
        fabricante: veiculo.fabricante ?? '',
        modelo: veiculo.modelo ?? '',
        ano: veiculo.ano ? String(veiculo.ano) : '',
      });
      setErroAno(undefined);
    }
  }, [veiculo]);

  /** Fecha limpando o erro da tentativa anterior. */
  function fechar() {
    atualizar.reset();
    onFechar();
  }

  /** Valida o ano e salva. */
  async function salvar(evento: FormEvent) {
    evento.preventDefault();
    if (!veiculo) return;
    const ano = lerAno(campos.ano);
    if (ano === undefined) {
      setErroAno('Informe o ano com 4 dígitos.');
      return;
    }
    try {
      await atualizar.mutateAsync({
        veiculoId: veiculo.id,
        fabricante: campos.fabricante,
        modelo: campos.modelo,
        ano,
      });
      fechar();
    } catch {
      // A mensagem fica em `atualizar.error`.
    }
  }

  return (
    <Dialog aberto={veiculo !== null} titulo="Editar veículo" onFechar={fechar}>
      <form noValidate onSubmit={salvar} className="flex flex-col gap-4">
        <Input
          label="Placa"
          value={veiculo?.placa ?? ''}
          disabled
          helper="A placa não pode ser alterada depois do cadastro."
        />
        <Input
          label="Fabricante"
          value={campos.fabricante}
          onChange={(e) => setCampos({ ...campos, fabricante: e.target.value })}
        />
        <Input
          label="Modelo"
          value={campos.modelo}
          onChange={(e) => setCampos({ ...campos, modelo: e.target.value })}
        />
        <Input
          label="Ano"
          inputMode="numeric"
          value={campos.ano}
          onChange={(e) => setCampos({ ...campos, ano: e.target.value })}
          error={erroAno}
        />
        <ErroDaAcao erro={atualizar.error} />
        <Rodape onVoltar={fechar}>
          <Button type="submit" disabled={atualizar.isPending}>
            Salvar
          </Button>
        </Rodape>
      </form>
    </Dialog>
  );
}

export interface DialogoAdicionarVeiculoProps {
  aberto: boolean;
  onFechar: () => void;
}

/** Cadastro de veículo: placa obrigatória e válida; fabricante, modelo e ano opcionais. */
export function DialogoAdicionarVeiculo({ aberto, onFechar }: DialogoAdicionarVeiculoProps) {
  const { criar } = useAcoesVeiculo();
  const [placa, setPlaca] = useState('');
  const [campos, setCampos] = useState<CamposVeiculo>({ fabricante: '', modelo: '', ano: '' });
  const [erros, setErros] = useState<{ placa?: string; ano?: string }>({});

  /** Fecha e limpa o formulário. */
  function fechar() {
    setPlaca('');
    setCampos({ fabricante: '', modelo: '', ano: '' });
    setErros({});
    criar.reset();
    onFechar();
  }

  /** Valida placa e ano no cliente e envia. */
  async function adicionar(evento: FormEvent) {
    evento.preventDefault();
    const ano = lerAno(campos.ano);
    const novosErros = {
      placa: normalizarPlaca(placa) ? undefined : 'Use o formato ABC1D23 ou ABC1234.',
      ano: ano === undefined ? 'Informe o ano com 4 dígitos.' : undefined,
    };
    setErros(novosErros);
    if (novosErros.placa || novosErros.ano) return;
    try {
      await criar.mutateAsync({
        placa,
        fabricante: campos.fabricante,
        modelo: campos.modelo,
        ano: ano ?? null,
      });
      fechar();
    } catch {
      // A mensagem (ex.: placa repetida) fica em `criar.error`.
    }
  }

  return (
    <Dialog
      aberto={aberto}
      titulo="Adicionar veículo"
      descricao="Só a placa é obrigatória."
      onFechar={fechar}
    >
      <form noValidate onSubmit={adicionar} className="flex flex-col gap-4">
        <Input
          label="Placa"
          value={placa}
          onChange={(e) => setPlaca(e.target.value)}
          error={erros.placa}
        />
        <Input
          label="Fabricante"
          value={campos.fabricante}
          onChange={(e) => setCampos({ ...campos, fabricante: e.target.value })}
        />
        <Input
          label="Modelo"
          value={campos.modelo}
          onChange={(e) => setCampos({ ...campos, modelo: e.target.value })}
        />
        <Input
          label="Ano"
          inputMode="numeric"
          value={campos.ano}
          onChange={(e) => setCampos({ ...campos, ano: e.target.value })}
          error={erros.ano}
        />
        <ErroDaAcao erro={criar.error} />
        <Rodape onVoltar={fechar}>
          <Button type="submit" disabled={criar.isPending}>
            Adicionar
          </Button>
        </Rodape>
      </form>
    </Dialog>
  );
}

export interface DialogoTornarPrincipalProps {
  veiculo: Veiculo | null;
  onFechar: () => void;
}

/** Confirmação para tornar um veículo o principal. */
export function DialogoTornarPrincipal({ veiculo, onFechar }: DialogoTornarPrincipalProps) {
  const { atualizar } = useAcoesVeiculo();
  const nome = veiculo ? nomearVeiculo(veiculo) || veiculo.placa : '';

  /** Fecha limpando o erro da tentativa anterior. */
  function fechar() {
    atualizar.reset();
    onFechar();
  }

  /** Marca como principal e só fecha se o repositório aceitar. */
  async function confirmar() {
    if (!veiculo) return;
    try {
      await atualizar.mutateAsync({ veiculoId: veiculo.id, principal: true });
      fechar();
    } catch {
      // A mensagem fica em `atualizar.error`.
    }
  }

  return (
    <Dialog
      aberto={veiculo !== null}
      titulo={`Tornar ${nome} o veículo principal?`}
      descricao="O veículo principal aparece nas telas e recebe os próximos testes."
      onFechar={fechar}
    >
      <ErroDaAcao erro={atualizar.error} />
      <Rodape onVoltar={fechar}>
        <Button onClick={() => void confirmar()} disabled={atualizar.isPending}>
          Tornar principal
        </Button>
      </Rodape>
    </Dialog>
  );
}
