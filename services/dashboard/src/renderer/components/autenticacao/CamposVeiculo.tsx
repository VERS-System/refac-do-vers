/**
 * Campos e validação do veículo usados no Criar conta (etapa Veículo) e no
 * Primeiro veículo, que grava no primeiro acesso o carro digitado no cadastro.
 *
 * Seguem o `CreateVehicleRequest` do backend: placa obrigatória e válida;
 * fabricante, modelo e ano opcionais (ano com 4 dígitos, se informado). Plano
 * em `.AIs/docs/plans/desktop-frontend-veiculo-no-cadastro.md`.
 */

import { Car } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { normalizarPlaca } from '@/data/calculos';
import type { VeiculoDoCadastro } from '@/data/veiculoDoCadastro';

/** Campos do veículo como digitados (o mesmo formato guardado até o primeiro acesso). */
export type CamposVeiculo = VeiculoDoCadastro;

export type ErrosVeiculo = Partial<Record<keyof CamposVeiculo, string>>;

/** Veículo sem nada digitado. */
export const VEICULO_VAZIO: CamposVeiculo = { placa: '', fabricante: '', modelo: '', ano: '' };

/** Erros do veículo: placa obrigatória e válida; ano com 4 dígitos, se informado. */
export function validarVeiculo(veiculo: CamposVeiculo): ErrosVeiculo {
  const ano = veiculo.ano.trim();
  return {
    placa: normalizarPlaca(veiculo.placa) ? undefined : 'Informe uma placa válida, como ABC1D23.',
    ano: !ano || /^\d{4}$/.test(ano) ? undefined : 'Informe o ano com 4 dígitos.',
  };
}

/** Ano digitado como número (vazio vira `null`); só chamar depois de validar. */
export function anoDoVeiculo(veiculo: CamposVeiculo): number | null {
  const ano = veiculo.ano.trim();
  return ano ? Number(ano) : null;
}

/** Placa em cima, ocupando a linha; fabricante, modelo e ano embaixo. */
export function CamposDoVeiculo({
  veiculo,
  erros,
  onVeiculo,
}: {
  veiculo: CamposVeiculo;
  erros: ErrosVeiculo;
  onVeiculo: (veiculo: CamposVeiculo) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <Input
        label="Placa"
        icon={Car}
        placeholder="ABC1D23"
        value={veiculo.placa}
        onChange={(e) => onVeiculo({ ...veiculo, placa: e.target.value })}
        error={erros.placa}
        className="col-span-2"
      />
      <Input
        label="Fabricante"
        value={veiculo.fabricante}
        onChange={(e) => onVeiculo({ ...veiculo, fabricante: e.target.value })}
      />
      <Input
        label="Modelo"
        value={veiculo.modelo}
        onChange={(e) => onVeiculo({ ...veiculo, modelo: e.target.value })}
      />
      <Input
        label="Ano"
        inputMode="numeric"
        value={veiculo.ano}
        onChange={(e) => onVeiculo({ ...veiculo, ano: e.target.value })}
        error={erros.ano}
      />
    </div>
  );
}
