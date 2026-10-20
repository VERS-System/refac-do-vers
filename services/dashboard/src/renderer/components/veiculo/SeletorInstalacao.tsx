/** Permite escolher explicitamente entre instalações do mesmo veículo. */
import { Select } from '@/components/ui/Select';
import { useInstalacao } from '@/hooks/useDados';
import { useSelecaoInstalacao } from '@/stores/instalacao';

/** Compartilha a escolha com todos os cards sem inferir prioridade pelo status. */
export function SeletorInstalacao({ veiculoId }: { veiculoId: string }) {
  const consulta = useInstalacao(veiculoId);
  const escolher = useSelecaoInstalacao(estado => estado.escolher);
  if (consulta.opcoes.length < 2) return null;
  return <Select label="Instalação exibida" value={consulta.data?.id ?? ''}
    onChange={evento => escolher(veiculoId, evento.target.value)}
    opcoes={[{ valor: '', rotulo: 'Selecione uma instalação' }, ...consulta.opcoes.map(i => ({ valor: i.id, rotulo: `${i.modelo} · ${i.status} · ${i.id}` }))]} />;
}
