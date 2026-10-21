/**
 * Diálogos das ações da tela Testes: planejar, iniciar, finalizar e cancelar.
 *
 * Cada diálogo chama a ação pelo hook `useAcoesTeste` e só fecha depois da
 * resposta; se o repositório recusar (conflito, transição inválida,
 * validação), a mensagem aparece no próprio diálogo e nada muda na tela,
 * como pede a task D08 (a interface não antecipa transições).
 */

import { useState, type FormEvent, type ReactNode } from 'react';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import type { ResultadoTeste, Terreno, TesteCampo } from '@/data/tipos';
import { useRepositorio } from '@/data/repositorio';
import { useAcoesTeste, useVeiculoAtivo, useInstalacao, useConfiguracoes } from '@/hooks/useDados';
import { SeletorInstalacao } from '@/components/veiculo/SeletorInstalacao';
import { OPCOES_RESULTADO, OPCOES_TERRENO } from './rotulos';

/** Mensagem de erro de uma ação recusada, em destaque no diálogo. */
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

/**
 * Lê um número digitado (aceita vírgula decimal). Vazio vira `null`;
 * texto que não é número vira `undefined`, para o formulário apontar o erro.
 */
function lerNumero(texto: string): number | null | undefined {
  const limpo = texto.trim().replace(',', '.');
  if (!limpo) return null;
  const numero = Number(limpo);
  return Number.isFinite(numero) ? numero : undefined;
}

export interface DialogoNovoTesteProps {
  aberto: boolean;
  onFechar: () => void;
}

/** Planejamento de um teste novo (nome, terreno, local, peso e observações). */
export function DialogoNovoTeste({ aberto, onFechar }: DialogoNovoTesteProps) {
  const { criar } = useAcoesTeste();
  const { ensaiosReais } = useRepositorio();
  const veiculo = useVeiculoAtivo();
  const instalacao = useInstalacao(ensaiosReais && aberto ? veiculo.data?.id ?? null : null);
  const configuracoes = useConfiguracoes(ensaiosReais && aberto ? instalacao.data?.id ?? null : null);
  const [escolha, setEscolha] = useState<{ instalacaoId: string; configuracaoId: string } | null>(null);
  const [erroConfiguracao, setErroConfiguracao] = useState(false);
  const configuracaoId = escolha?.instalacaoId === instalacao.data?.id &&
    configuracoes.data?.some(c => c.id === escolha?.configuracaoId) ? escolha?.configuracaoId ?? '' : '';
  const [nome, setNome] = useState('');
  const [terreno, setTerreno] = useState<Terreno>('rodovia');
  const [local, setLocal] = useState('');
  const [peso, setPeso] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [erros, setErros] = useState<{ nome?: string; local?: string; peso?: string }>({});

  /** Fecha e limpa o formulário para a próxima vez. */
  function fechar() {
    setNome('');
    setLocal('');
    setPeso('');
    setObservacoes('');
    setErros({});
    setEscolha(null);
    setErroConfiguracao(false);
    criar.reset();
    onFechar();
  }

  /** Valida no cliente (campos obrigatórios e peso) e envia ao repositório. */
  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    const pesoKg = lerNumero(peso);
    const novosErros = {
      nome: nome.trim() ? undefined : 'Informe o nome do teste.',
      local: local.trim() ? undefined : 'Informe o local.',
      peso:
        pesoKg === undefined || (pesoKg !== null && pesoKg <= 0)
          ? 'Informe um peso válido, em kg.'
          : undefined,
    };
    setErros(novosErros);
    const semConfiguracao = !!ensaiosReais && (!instalacao.data || !configuracaoId || instalacao.isError || configuracoes.isError);
    setErroConfiguracao(semConfiguracao);
    if (novosErros.nome || novosErros.local || novosErros.peso || semConfiguracao) return;
    try {
      await criar.mutateAsync({ nome, terreno, local, pesoVeiculoKg: pesoKg ?? null, observacoes,
        ...(ensaiosReais ? { instalacaoId: instalacao.data!.id, configuracaoId } : {}) });
      fechar();
    } catch {
      // A mensagem fica em `criar.error`, exibida no diálogo.
    }
  }

  return (
    <Dialog
      aberto={aberto}
      titulo="Planejar teste"
      descricao={ensaiosReais ? 'Escolha a instalação do veículo principal e a versão da configuração usada neste teste.' : 'O teste usa o veículo e a configuração atuais da instalação.'}
      onFechar={fechar}
    >
      <form noValidate onSubmit={enviar} className="flex flex-col gap-4">
        {ensaiosReais && <>
          {veiculo.data && <SeletorInstalacao veiculoId={veiculo.data.id} />}
          {instalacao.data && <p className="text-xs text-fg-secondary">{`Instalação: ${instalacao.data.modelo} · ${instalacao.data.id}`}</p>}
          <Select label="Configuração do teste" value={configuracaoId}
            onChange={e => setEscolha({ instalacaoId: instalacao.data!.id, configuracaoId: e.target.value })}
            disabled={!instalacao.data || configuracoes.isPending || configuracoes.isError}
            opcoes={[{ valor: '', rotulo: 'Selecione a configuração utilizada' }, ...(configuracoes.data ?? []).map(c => ({ valor: c.id, rotulo: `${c.nome} · versão ${c.versao} · ${c.piezosAtivos} piezos` }))]}
            helper="A versão mais recente não é considerada ativa automaticamente." />
          {(veiculo.isError || instalacao.isError || configuracoes.isError) && <p role="alert">Não foi possível consultar o cadastro. Feche e reabra o formulário para tentar novamente.</p>}
          {veiculo.data === null && <p role="status">Defina um veículo principal antes de planejar.</p>}
          {instalacao.data === null && !instalacao.precisaEscolher && <p role="status">Nenhuma instalação disponível para este veículo.</p>}
          {instalacao.data && configuracoes.data?.length === 0 && <p role="status">Nenhuma configuração disponível nesta instalação.</p>}
          {erroConfiguracao && <p role="alert">Escolha uma instalação e a configuração usada no teste.</p>}
        </>}
        <Input
          label="Nome do teste"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          error={erros.nome}
        />
        <Select
          label="Terreno"
          opcoes={OPCOES_TERRENO}
          value={terreno}
          onChange={(e) => setTerreno(e.target.value as Terreno)}
        />
        <Input
          label="Local"
          value={local}
          onChange={(e) => setLocal(e.target.value)}
          error={erros.local}
        />
        <Input
          label="Peso do veículo (kg)"
          inputMode="decimal"
          value={peso}
          onChange={(e) => setPeso(e.target.value)}
          error={erros.peso}
          helper="Opcional."
        />
        <Textarea
          label="Observações"
          value={observacoes}
          onChange={(e) => setObservacoes(e.target.value)}
          helper="Opcional."
        />
        <ErroDaAcao erro={criar.error} />
        <Rodape onVoltar={fechar}>
          <Button type="submit" disabled={criar.isPending}>
            Planejar
          </Button>
        </Rodape>
      </form>
    </Dialog>
  );
}

export interface DialogoTesteProps {
  /** Teste da ação; o diálogo fica fechado sem teste. */
  teste: TesteCampo | null;
  onFechar: () => void;
}

/** Confirmação para iniciar um teste planejado. */
export function DialogoIniciar({ teste, onFechar }: DialogoTesteProps) {
  const { iniciar } = useAcoesTeste();

  /** Fecha limpando o erro da tentativa anterior. */
  function fechar() {
    iniciar.reset();
    onFechar();
  }

  /** Inicia e só fecha se o repositório aceitar. */
  async function confirmar() {
    if (!teste) return;
    try {
      await iniciar.mutateAsync(teste.id);
      fechar();
    } catch {
      // A mensagem (ex.: conflito) fica em `iniciar.error`.
    }
  }

  return (
    <Dialog
      aberto={teste !== null}
      titulo={`Iniciar teste ${teste?.codigo ?? ''}`}
      descricao={
        teste
          ? `${teste.nome} · ${teste.local}. O servidor confirma o início; a chegada de amostras depende do dispositivo ou simulador.`
          : undefined
      }
      onFechar={fechar}
    >
      <ErroDaAcao erro={iniciar.error} />
      <Rodape onVoltar={fechar}>
        <Button onClick={() => void confirmar()} disabled={iniciar.isPending}>
          Iniciar
        </Button>
      </Rodape>
    </Dialog>
  );
}

/** Opções da situação final (`FinishTestRequest.status`). */
const SITUACOES = [
  { value: 'concluido', label: 'Concluído' },
  { value: 'falhou', label: 'Falhou' },
] as const;

/**
 * Finalização do teste em andamento: situação, resultado e os dados que o
 * VERS não mede (velocidade, rotação e inclinação médias), informados aqui.
 */
export function DialogoFinalizar({ teste, onFechar }: DialogoTesteProps) {
  const { finalizar } = useAcoesTeste();
  const [situacao, setSituacao] = useState<'concluido' | 'falhou'>('concluido');
  const [resultado, setResultado] = useState('');
  const [velocidade, setVelocidade] = useState('');
  const [rotacao, setRotacao] = useState('');
  const [inclinacao, setInclinacao] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [erroNumero, setErroNumero] = useState<string | null>(null);

  /** Fecha e limpa o formulário. */
  function fechar() {
    setSituacao('concluido');
    setResultado('');
    setVelocidade('');
    setRotacao('');
    setInclinacao('');
    setObservacoes('');
    setErroNumero(null);
    finalizar.reset();
    onFechar();
  }

  /** Converte os números digitados e envia a finalização. */
  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    if (!teste) return;
    const numeros = [lerNumero(velocidade), lerNumero(rotacao), lerNumero(inclinacao)];
    if (numeros.some((n) => n === undefined)) {
      setErroNumero('Velocidade, rotação e inclinação devem ser números.');
      return;
    }
    setErroNumero(null);
    const [velocidadeMediaKmh, rotacaoMediaRpm, inclinacaoGraus] = numeros as (number | null)[];
    try {
      await finalizar.mutateAsync({
        testeId: teste.id,
        status: situacao,
        resultado: (resultado || null) as ResultadoTeste | null,
        velocidadeMediaKmh,
        rotacaoMediaRpm,
        inclinacaoGraus,
        observacoes,
      });
      fechar();
    } catch {
      // A mensagem fica em `finalizar.error`.
    }
  }

  return (
    <Dialog
      aberto={teste !== null}
      titulo={`Finalizar teste ${teste?.codigo ?? ''}`}
      descricao="Velocidade, rotação e inclinação não são medidas pelo VERS: informe-as se tiver."
      onFechar={fechar}
    >
      <form noValidate onSubmit={enviar} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <span className="font-label text-xs font-medium text-fg-secondary">Situação</span>
          <SegmentedControl
            aria-label="Situação"
            options={SITUACOES}
            value={situacao}
            onChange={setSituacao}
          />
        </div>
        <Select
          label="Resultado"
          opcoes={OPCOES_RESULTADO}
          value={resultado}
          onChange={(e) => setResultado(e.target.value)}
        />
        <div className="grid grid-cols-3 gap-3">
          <Input
            label="Velocidade média (km/h)"
            inputMode="decimal"
            value={velocidade}
            onChange={(e) => setVelocidade(e.target.value)}
          />
          <Input
            label="Rotação média (rpm)"
            inputMode="numeric"
            value={rotacao}
            onChange={(e) => setRotacao(e.target.value)}
          />
          <Input
            label="Inclinação média (°)"
            inputMode="decimal"
            value={inclinacao}
            onChange={(e) => setInclinacao(e.target.value)}
          />
        </div>
        <Textarea
          label="Observações"
          value={observacoes}
          onChange={(e) => setObservacoes(e.target.value)}
          helper="Opcional."
        />
        {erroNumero && (
          <p role="alert" className="text-[13px] text-danger">
            {erroNumero}
          </p>
        )}
        <ErroDaAcao erro={finalizar.error} />
        <Rodape onVoltar={fechar}>
          <Button type="submit" variant="danger" disabled={finalizar.isPending}>
            Finalizar
          </Button>
        </Rodape>
      </form>
    </Dialog>
  );
}

/** Cancelamento de um teste planejado ou em andamento, com motivo opcional. */
export function DialogoCancelar({ teste, onFechar }: DialogoTesteProps) {
  const { cancelar } = useAcoesTeste();
  const [motivo, setMotivo] = useState('');

  /** Fecha e limpa o motivo. */
  function fechar() {
    setMotivo('');
    cancelar.reset();
    onFechar();
  }

  /** Cancela e só fecha se o repositório aceitar. */
  async function confirmar() {
    if (!teste) return;
    try {
      await cancelar.mutateAsync({ testeId: teste.id, motivo });
      fechar();
    } catch {
      // A mensagem fica em `cancelar.error`.
    }
  }

  return (
    <Dialog
      aberto={teste !== null}
      titulo={`Cancelar teste ${teste?.codigo ?? ''}`}
      descricao="As amostras já registradas continuam guardadas."
      onFechar={fechar}
    >
      <Textarea
        label="Motivo"
        value={motivo}
        onChange={(e) => setMotivo(e.target.value)}
        helper="Opcional."
      />
      <ErroDaAcao erro={cancelar.error} />
      <Rodape onVoltar={fechar}>
        <Button variant="danger" onClick={() => void confirmar()} disabled={cancelar.isPending}>
          Confirmar cancelamento
        </Button>
      </Rodape>
    </Dialog>
  );
}
