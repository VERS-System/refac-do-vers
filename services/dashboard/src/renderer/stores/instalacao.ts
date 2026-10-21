/** Mantém somente a escolha explícita de instalação por veículo nesta sessão da conta. */
import { create } from 'zustand';

export const useSelecaoInstalacao = create<{ escolhas: Record<string, string>; escolher: (veiculoId: string, instalacaoId: string) => void }>(set => ({
  escolhas: {},
  /** Substitui a escolha do veículo sem alterar as escolhas de outros recursos. */
  escolher: (veiculoId, instalacaoId) => set(atual => ({ escolhas: { ...atual.escolhas, [veiculoId]: instalacaoId } })),
}));
