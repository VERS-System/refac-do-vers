/** Apresenta somente energia oficial da instalação e separa os painéis sem contrato. */
import { useState, type ReactNode } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Table, type TableColumn } from '@/components/ui/Table';
import { Paginacao } from '@/components/ui/Paginacao';
import { EstadoConsulta } from '@/components/ui/EstadoConsulta';
import { SeletorInstalacao } from '@/components/veiculo/SeletorInstalacao';
import { useEnergiaInstalacao, useInstalacao, useVeiculoAtivo } from '@/hooks/useDados';
import { csvEnergia, qualidadeBloco, type EnergiaInstalacao, type LinhaEnergia } from '@/data/energia';
import { isoBrasilia } from '@/lib/brasilia';
import { formatarData, formatarEnergia, formatarPotencia, formatarMedida } from '@/lib/format';
import { baixarArquivo } from '@/lib/download';

/** Formata início/fim com data e hora de Brasília, sem depender do fuso do computador. */
function horario(utc: string): string {
  const local = isoBrasilia(utc);
  return `${formatarData(local.slice(0, 10))} ${local.slice(11, 16)}`;
}

/** Mantém horas ausentes/inválidas como lacunas e deixa qualidade parcial visível nas barras. */
function GraficoBlocos({ resultado }: { resultado: EnergiaInstalacao }) {
  const dados = resultado.linhas.map(l => ({ inicio: l.inicio, qualidade: qualidadeBloco(l),
    energiaWh: l.resumo && l.resumo.quality !== 'INVALID' ? l.resumo.recoveredEnergyWh : null }));
  return <div role="img" aria-label="Energia recuperada por hora completa; lacunas não representam zero" className="h-60 w-full">
    <ResponsiveContainer width="100%" height={240} initialDimension={{ width: 800, height: 240 }}>
      <BarChart data={dados} margin={{ top: 8, right: 12, bottom: 4, left: 14 }}>
        <CartesianGrid stroke="var(--color-chart-grid)" vertical={false} />
        <XAxis dataKey="inicio" tickFormatter={v => horario(String(v)).slice(0, 16)} minTickGap={48} fontSize={10} />
        <YAxis tickFormatter={v => formatarMedida(formatarEnergia(Number(v) * 1000))} width={80} fontSize={10} />
        <Tooltip labelFormatter={v => horario(String(v))} formatter={v => formatarMedida(formatarEnergia(Number(v) * 1000, { casas: 2 }))} />
        <Bar dataKey="energiaWh" name="Energia recuperada" isAnimationActive={false}>
          {dados.map(d => <Cell key={d.inicio} fill={d.qualidade === 'Parcial' ? 'var(--color-fg-muted)' : 'var(--color-chart-1)'} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  </div>;
}

/** Mostra métricas por bloco sem média de médias ou soma de contagens potencialmente sobrepostas. */
const COLUNAS: TableColumn<LinhaEnergia>[] = [
  { key: 'inicio', header: 'Início (Brasília)', render: l => horario(l.inicio) },
  { key: 'fim', header: 'Fim exclusivo', render: l => horario(l.fim) },
  { key: 'qualidade', header: 'Qualidade', render: qualidadeBloco },
  { key: 'energia', header: 'Energia recuperada', numeric: true,
    render: l => formatarMedida(formatarEnergia(l.resumo && l.resumo.quality !== 'INVALID' ? l.resumo.recoveredEnergyWh * 1000 : null, { casas: 2 })) },
  { key: 'media', header: 'Potência média', numeric: true,
    render: l => formatarMedida(formatarPotencia(l.resumo && l.resumo.quality !== 'INVALID' && l.resumo.averagePowerW !== null ? l.resumo.averagePowerW * 1000 : null, 2)) },
  { key: 'pico', header: 'Pico de potência', numeric: true,
    render: l => formatarMedida(formatarPotencia(l.resumo && l.resumo.quality !== 'INVALID' && l.resumo.peakPowerW !== null ? l.resumo.peakPowerW * 1000 : null, 2)) },
  { key: 'amostras', header: 'Amostras do bloco', numeric: true, render: l => l.resumo?.sampleCount ?? '–' },
];

/** Pagina só a apresentação; o CSV contém todas as horas já conferidas da janela. */
function ConteudoEnergia({ resultado: r }: { resultado: EnergiaInstalacao }) {
  const [pagina, setPagina] = useState(1);
  const [erroCsv, setErroCsv] = useState(false);
  const utilizaveis = r.boas + r.parciais;
  const parcial = r.parciais > 0 || r.invalidas > 0 || r.ausentes > 0;
  /** Exporta a mesma resposta validada que está visível, sem iniciar consulta de outra identidade. */
  function exportar() {
    try {
      baixarArquivo(`vers-energia-${r.instalacaoId}-${r.janela.periodo}-${r.janela.fim.slice(0, 10)}.csv`, csvEnergia(r), 'text/csv;charset=utf-8');
      setErroCsv(false);
    } catch { setErroCsv(true); }
  }
  return <div className="flex flex-col gap-4">
    <p className="font-mono text-xs text-fg-secondary">{`${horario(r.janela.inicio)} até ${horario(r.janela.fim)} (fim exclusivo) · America/Sao_Paulo`}</p>
    <div className="grid gap-4 sm:grid-cols-2">
      <div role="group" aria-label="Energia dos blocos utilizáveis" className="rounded-control bg-inset p-4">
        <p className="text-sm text-fg-secondary">Energia nos blocos utilizáveis</p>
        <p className="font-mono text-2xl text-accent">{formatarMedida(formatarEnergia(r.energiaWh === null ? null : r.energiaWh * 1000, { casas: 2 }))}</p>
        <p className="text-xs text-fg-muted">{parcial ? 'Soma parcial dos resumos disponíveis.' : 'Soma dos resumos horários oficiais.'}</p>
      </div>
      <div className="rounded-control bg-inset p-4">
        <p className="text-sm text-fg-secondary">Cobertura de resumos</p>
        <p className="font-mono text-xl">{`${utilizaveis} de ${r.janela.horas} horas utilizáveis`}</p>
        <p className="text-xs text-fg-muted">{`${r.boas} boas · ${r.parciais} parciais · ${r.invalidas} inválidas · ${r.ausentes} ausentes`}</p>
      </div>
    </div>
    <p className="text-xs text-fg-muted">Resumos disponíveis não comprovam medição contínua durante toda a hora. Cinza indica bloco parcial; lacunas não são energia zero. Hora em curso excluída.</p>
    {r.janela.horas === 0 ? <p role="status">Nenhuma hora completa neste período.</p>
      : <>{r.energiaWh === null && <p role="status">Nenhum bloco horário utilizável neste período.</p>}<GraficoBlocos resultado={r} /></>}
    <div><Button variant="secondary" onClick={exportar} disabled={r.linhas.length === 0}>Exportar blocos CSV</Button></div>
    {erroCsv && <p role="alert">Não foi possível gerar o CSV. Tente novamente.</p>}
    <Table caption="Blocos horários oficiais" columns={COLUNAS} rows={r.linhas.slice((pagina - 1) * 24, pagina * 24)} getRowKey={l => l.inicio}
      emptyMessage="Nenhuma hora completa neste período." densa />
    <Paginacao pagina={pagina} tamanho={24} total={r.linhas.length} unidade="horas" onTrocar={setPagina} />
  </div>;
}

/** Resolve a instalação autorizada antes de consultar energia, sem recurso implícito entre múltiplos. */
export function PainelEnergiaReal() {
  const veiculo = useVeiculoAtivo();
  const instalacao = useInstalacao(veiculo.isError ? null : veiculo.data?.id ?? null);
  const energia = useEnergiaInstalacao(veiculo.isError || instalacao.isError ? null : instalacao.data?.id ?? null);
  return <Card as="section" aria-label="Energia real por instalação" className="flex flex-col gap-4">
    <h2 className="text-base font-semibold">Energia por instalação</h2>
    <EstadoConsulta consulta={veiculo} nome="o veículo principal">{v => v === null
      ? <p>Defina um veículo principal para consultar a energia.</p>
      : <>
        <SeletorInstalacao veiculoId={v.id} />
        <EstadoConsulta consulta={instalacao} nome="a instalação">{i => i === null
          ? <p>{instalacao.precisaEscolher ? 'Selecione uma instalação para consultar a energia.' : 'Nenhuma instalação disponível neste veículo.'}</p>
          : <>
            <p className="text-xs text-fg-secondary">{`${i.modelo} · ${i.id} · atualização a cada minuto`}</p>
            <EstadoConsulta consulta={energia} nome="a energia da instalação">{r =>
              <ConteudoEnergia key={`${r.instalacaoId}-${r.janela.periodo}-${r.janela.inicio}-${r.janela.fim}`} resultado={r} />}
            </EstadoConsulta>
          </>}</EstadoConsulta>
      </>}</EstadoConsulta>
  </Card>;
}

/** Só monta os exemplos depois de abertura explícita, mantendo-os fora do caminho de falha real. */
export function DemonstracaoMedicoes({ children }: { children: ReactNode }) {
  const [aberta, setAberta] = useState(false);
  return <details className="mt-4 rounded-card border border-line p-4" onToggle={e => setAberta(e.currentTarget.open)}>
    <summary className="cursor-pointer text-sm text-fg-secondary">Área de demonstração — curvas, bateria e demais métricas sem contrato</summary>
    {aberta && <div className="mt-4"><p className="mb-4 text-xs text-fg-muted">Dados sintéticos independentes, sem vínculo com o veículo ou instalação selecionados.</p>{children}</div>}
  </details>;
}
