/**
 * Card da tabela de amostras da Telemetria.
 *
 * Filtros (teste e qualidade), a faixa de horário do teste, os piezos
 * ativos na leitura mais recente, a tabela com as colunas da referência e a
 * paginação ("Mostrando 1 a 20 de 265 amostras"). A paginação e os filtros
 * vêm de fora (a página guarda o estado), para que a exportação use os
 * mesmos filtros.
 */

import { useId, type ReactNode } from 'react';
import { Cpu, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { EstadoConsulta, type ConsultaBasica } from '@/components/ui/EstadoConsulta';
import { Paginacao } from '@/components/ui/Paginacao';
import { Skeleton } from '@/components/ui/Skeleton';
import { Table, type TableColumn } from '@/components/ui/Table';
import type { AmostraTelemetria, PaginaDe, QualidadeAmostra, TesteCampo } from '@/data/tipos';
import {
  formatarAceleracao,
  formatarDataCurta,
  formatarEnergia,
  formatarHorarioCaptura,
  formatarNumero,
  formatarPotencia,
} from '@/lib/format';
import { rotuloUnidade } from '@/lib/unidades';
import { BADGE_QUALIDADE } from './rotulos';

export interface TabelaAmostrasProps {
  /** Consulta da lista de testes (carregando enquanto não há teste escolhido). */
  testes: ConsultaBasica<TesteCampo[]>;
  teste: TesteCampo | undefined;
  onTrocarTeste: (testeId: string) => void;
  qualidade: QualidadeAmostra | '';
  onTrocarQualidade: (qualidade: QualidadeAmostra | '') => void;
  pagina: number;
  onTrocarPagina: (pagina: number) => void;
  /** Consulta da página atual de amostras. */
  amostras: ConsultaBasica<PaginaDe<AmostraTelemetria>>;
  /** Amostra mais recente do teste (fim da faixa e piezos ativos). */
  ultimaAmostra: AmostraTelemetria | undefined;
  /** Data de hoje (AAAA-MM-DD), para escrever "Hoje" na faixa. */
  hoje: string;
}

/** Opções do filtro de qualidade ("" é todas). */
const OPCOES_QUALIDADE: { valor: QualidadeAmostra | ''; rotulo: string }[] = [
  { valor: '', rotulo: 'Todas' },
  ...(Object.keys(BADGE_QUALIDADE) as QualidadeAmostra[]).map((valor) => ({
    valor,
    rotulo: BADGE_QUALIDADE[valor].texto,
  })),
];

/** "HH:MM" de uma data ISO. */
const horaMinuto = (iso: string) => formatarHorarioCaptura(iso).slice(0, 5);

/** Pílula informativa dos filtros (faixa do teste, piezos). */
function Pilula({ icone, children }: { icone: ReactNode; children: ReactNode }) {
  return (
    <span className="flex h-9 items-center gap-2 rounded-full border border-line-subtle bg-inset px-3 font-mono text-xs text-fg-secondary">
      {icone}
      {children}
    </span>
  );
}

/**
 * Campo de seleção dos filtros, com o rótulo antes do valor ("Teste: #023").
 * O `<select>` não tem contorno próprio; com foco de teclado, o anel aparece
 * na pílula inteira (`anel-foco-dentro`).
 */
export function Selecao({
  rotulo,
  valor,
  onTrocar,
  children,
}: {
  rotulo: string;
  valor: string;
  onTrocar: (valor: string) => void;
  children: ReactNode;
}) {
  const id = useId();
  return (
    <span className="anel-foco-dentro flex h-9 items-center gap-2 rounded-full border border-line bg-surface-raised pr-2 pl-3 font-mono text-xs text-fg">
      <label htmlFor={id} className="text-fg-muted">
        {rotulo}
      </label>
      <select
        id={id}
        value={valor}
        onChange={(evento) => onTrocar(evento.target.value)}
        className="cursor-pointer bg-transparent pr-1 text-fg outline-none"
      >
        {children}
      </select>
    </span>
  );
}

/** Colunas da tabela, na ordem da referência. */
function colunas(codigoTeste: string): TableColumn<AmostraTelemetria>[] {
  return [
    {
      key: 'capturada',
      header: 'Capturado em',
      render: (a) => (
        <span className="font-mono text-fg">{formatarHorarioCaptura(a.capturadaEm, true)}</span>
      ),
    },
    {
      key: 'teste',
      header: 'Teste',
      render: () => <span className="font-mono text-info">{codigoTeste}</span>,
    },
    {
      key: 'tensao',
      header: 'Tensão (V)',
      numeric: true,
      render: (a) => formatarNumero(a.tensaoV, 2),
    },
    {
      key: 'corrente',
      header: 'Corrente (mA)',
      numeric: true,
      render: (a) => formatarNumero(a.correnteMa),
    },
    {
      key: 'potencia',
      header: `Potência (${rotuloUnidade('potencia')})`,
      numeric: true,
      render: (a) => (
        <span className="font-medium text-accent">{formatarPotencia(a.potenciaMw).valor}</span>
      ),
    },
    {
      key: 'energia',
      header: `Acumulada (${rotuloUnidade('energia')})`,
      numeric: true,
      render: (a) =>
        formatarEnergia(a.energiaAcumuladaMwh, {
          unidade: 'mWh',
          casas: rotuloUnidade('energia') === 'J' ? 1 : 2,
        }).valor,
    },
    {
      key: 'vibracao',
      header: `Vibração (${rotuloUnidade('aceleracao')})`,
      numeric: true,
      render: (a) => formatarAceleracao(a.vibracaoRmsMs2).valor,
    },
    {
      key: 'temperatura',
      header: 'Temp. (°C)',
      numeric: true,
      render: (a) => formatarNumero(a.temperaturaC, 1),
    },
    {
      key: 'piezos',
      header: 'Piezos',
      numeric: true,
      render: (a) => (a.piezosAtivos === null ? '–' : `${a.piezosAtivos}/${a.piezosTotal}`),
    },
    {
      key: 'qualidade',
      header: 'Qualidade',
      align: 'center',
      render: (a) => {
        const qualidade = BADGE_QUALIDADE[a.qualidade];
        return (
          <Badge tone={qualidade.tom} dot={false}>
            {qualidade.texto}
          </Badge>
        );
      },
    },
  ];
}

/** Renderiza o card como região nomeada "Amostras do teste". */
export function TabelaAmostras(props: TabelaAmostrasProps) {
  const { teste, ultimaAmostra } = props;
  const fimDaFaixa = teste?.fim ?? ultimaAmostra?.capturadaEm;
  // Na Telemetria só aparecem testes já iniciados; o criadoEm é só uma rede de segurança.
  const inicioTeste = teste ? (teste.inicio ?? teste.criadoEm) : '';
  const dia =
    teste &&
    (inicioTeste.slice(0, 10) === props.hoje
      ? 'Hoje'
      : formatarDataCurta(inicioTeste.slice(0, 10)));

  return (
    <Card as="section" aria-label="Amostras do teste">
      <EstadoConsulta
        consulta={props.testes}
        nome="os testes"
        carregando={<Skeleton className="h-80 w-full" />}
      >
        {(testes) =>
          teste ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <Selecao rotulo="Teste" valor={teste.id} onTrocar={props.onTrocarTeste}>
                  {testes.map((t) => (
                    <option key={t.id} value={t.id}>{`${t.codigo} · ${t.nome}`}</option>
                  ))}
                </Selecao>
                <Pilula icone={<Clock aria-hidden="true" className="size-3.5" />}>
                  {`${dia}, ${horaMinuto(inicioTeste)}${fimDaFaixa ? ` até ${horaMinuto(fimDaFaixa)}` : ''}`}
                </Pilula>
                <Selecao
                  rotulo="Qualidade"
                  valor={props.qualidade}
                  onTrocar={(valor) => props.onTrocarQualidade(valor as QualidadeAmostra | '')}
                >
                  {OPCOES_QUALIDADE.map((opcao) => (
                    <option key={opcao.valor} value={opcao.valor}>
                      {opcao.rotulo}
                    </option>
                  ))}
                </Selecao>
                {ultimaAmostra?.piezosAtivos != null && (
                  <Pilula icone={<Cpu aria-hidden="true" className="size-3.5" />}>
                    {`Piezos: ${ultimaAmostra.piezosAtivos}/${ultimaAmostra.piezosTotal} ativos`}
                  </Pilula>
                )}
              </div>
              <div className="mt-4">
                <EstadoConsulta
                  consulta={props.amostras}
                  nome="as amostras"
                  carregando={<Skeleton className="h-80 w-full" />}
                >
                  {(pagina) => (
                    <>
                      <Table
                        caption={`Amostras do teste ${teste.codigo}`}
                        columns={colunas(teste.codigo)}
                        rows={pagina.itens}
                        getRowKey={(amostra) => amostra.id}
                        densa
                        emptyMessage={
                          props.qualidade
                            ? 'Nenhuma amostra com essa qualidade.'
                            : 'Nenhuma amostra neste teste.'
                        }
                      />
                      <Paginacao
                        pagina={pagina.pagina}
                        tamanho={pagina.tamanhoPagina}
                        total={pagina.total}
                        unidade="amostras"
                        onTrocar={props.onTrocarPagina}
                      />
                    </>
                  )}
                </EstadoConsulta>
              </div>
            </>
          ) : (
            <p className="text-[13px] text-fg-muted">Nenhum teste registrado.</p>
          )
        }
      </EstadoConsulta>
    </Card>
  );
}
