/**
 * Cards do sistema na tela Veículo e instalação: o dispositivo ESP32 da
 * instalação e o histórico de revisões.
 *
 * O dispositivo mostra só os dados públicos (`PublicDevice`: id, firmware,
 * status e último contato), sem MAC nem credenciais (task D07). "Reiniciar
 * terminal" age no hardware e fica desativado até a API existir; "Ver logs"
 * abre um log de exemplo, só de leitura. As revisões seguem o contrato de
 * suporte (motivo, status e datas).
 */

import { useId, useState } from 'react';
import { Cpu, RotateCcw, ScrollText } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Dialog } from '@/components/ui/Dialog';
import { EstadoConsulta } from '@/components/ui/EstadoConsulta';
import { Skeleton } from '@/components/ui/Skeleton';
import { useRepositorio } from '@/data/repositorio';
import type { Dispositivo } from '@/data/tipos';
import { useInstalacao, useLogsDispositivo, useRevisoes, useVeiculos } from '@/hooks/useDados';
import { cn } from '@/lib/cn';
import { formatarData, formatarHorarioCaptura, formatarTempoDecorrido } from '@/lib/format';
import { BADGE_REVISAO, DISPONIVEL_COM_A_API } from './rotulos';

/** Linha "rótulo … valor" dos dados do dispositivo. */
function Dado({ rotulo, children }: { rotulo: string; children: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-line-subtle py-2.5 last:border-0">
      <dt className="text-[13px] text-fg-secondary">{rotulo}</dt>
      <dd className="font-mono text-[13px] text-fg">{children}</dd>
    </div>
  );
}

/** Diálogo com o log do dispositivo (consulta só quando aberto). */
function DialogoLogs({
  dispositivo,
  aberto,
  onFechar,
}: {
  dispositivo: Dispositivo;
  aberto: boolean;
  onFechar: () => void;
}) {
  const nome = `${dispositivo.plataforma} · ${dispositivo.id}`;
  const log = useLogsDispositivo(aberto ? dispositivo.id : null);
  const COR_NIVEL = { info: 'text-fg-muted', aviso: 'text-warning', erro: 'text-danger' } as const;
  return (
    <Dialog
      aberto={aberto}
      titulo={`Log do ${nome}`}
      descricao="Eventos de hoje, do mais recente ao mais antigo (exemplo, só leitura)."
      onFechar={onFechar}
    >
      <EstadoConsulta consulta={log} nome="o log" carregando={<Skeleton className="h-48 w-full" />}>
        {(linhas) =>
          linhas.length ? (
            <ul className="flex max-h-80 flex-col gap-1.5 overflow-y-auto rounded-control bg-inset p-3 font-mono text-xs">
              {linhas.map((linha) => (
                <li key={`${linha.instante}-${linha.mensagem}`} className="flex gap-3">
                  <span className="shrink-0 text-fg-muted">
                    {formatarHorarioCaptura(linha.instante)}
                  </span>
                  <span className={cn('w-10 shrink-0 uppercase', COR_NIVEL[linha.nivel])}>
                    {linha.nivel}
                  </span>
                  <span className="text-fg">{linha.mensagem}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[13px] text-fg-muted">Sem eventos registrados.</p>
          )
        }
      </EstadoConsulta>
      <div className="flex justify-end">
        <Button variant="secondary" onClick={onFechar}>
          Fechar
        </Button>
      </div>
    </Dialog>
  );
}

/** Conteúdo do card com o dispositivo da instalação. */
function ConteudoDispositivo({ dispositivo }: { dispositivo: Dispositivo }) {
  const repositorio = useRepositorio();
  const [logsAbertos, setLogsAbertos] = useState(false);
  const idAviso = useId();
  const segundos = dispositivo.ultimoContato ? (repositorio.agora().getTime() - Date.parse(dispositivo.ultimoContato)) / 1000 : null;
  return (
    <>
      <div className="flex items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-accent-subtle">
          <Cpu aria-hidden="true" className="size-5 text-accent" />
        </span>
        <p className="flex-1 font-mono text-[15px] font-semibold text-fg">{dispositivo.nome ?? `${dispositivo.plataforma} · ${dispositivo.id}`}</p>
        <Badge tone={dispositivo.online ? 'success' : 'neutral'} pulsar={dispositivo.online}>
          {dispositivo.status ? ({ PROVISIONING: 'Provisionando', ONLINE: 'Online', OFFLINE: 'Offline', REVOKED: 'Revogado', FAULT: 'Falha' } as const)[dispositivo.status] : dispositivo.online ? 'Online' : 'Offline'}
        </Badge>
      </div>
      <dl>
        <Dado rotulo="Firmware">{dispositivo.firmware}</Dado>
        <Dado rotulo="Último contato">{segundos === null ? 'Não informado' : formatarTempoDecorrido(segundos)}</Dado>
        <Dado rotulo="Protocolo">{dispositivo.protocolo}</Dado>
      </dl>
      <span id={idAviso} className="sr-only">
        {DISPONIVEL_COM_A_API}
      </span>
      <div className="flex flex-col gap-2">
        <Button
          variant="secondary"
          icon={RotateCcw}
          disabled
          aria-describedby={idAviso}
          title={DISPONIVEL_COM_A_API}
        >
          Reiniciar terminal
        </Button>
        <Button variant="secondary" icon={ScrollText} disabled={repositorio.cadastroReal} title={repositorio.cadastroReal ? 'Logs públicos ainda indisponíveis' : undefined} onClick={() => setLogsAbertos(true)}>
          Ver logs
        </Button>
      </div>
      <DialogoLogs
        dispositivo={dispositivo}
        aberto={logsAbertos}
        onFechar={() => setLogsAbertos(false)}
      />
    </>
  );
}

/** Renderiza o card como região "Dispositivo" (o da instalação do veículo principal). */
export function CardDispositivo() {
  const veiculos = useVeiculos();
  const principal = veiculos.data?.find((v) => v.principal);
  const instalacao = useInstalacao(principal?.id ?? null);
  const idTitulo = useId();
  if (!principal) return <Card as="section" aria-labelledby={idTitulo}><h2 id={idTitulo}>Dispositivo</h2><EstadoConsulta consulta={veiculos} nome="os veículos">{() => <p>Nenhum veículo principal definido.</p>}</EstadoConsulta></Card>;
  return (
    <Card as="section" aria-labelledby={idTitulo} className="flex flex-col gap-4">
      <h2
        id={idTitulo}
        className="font-label text-xs font-semibold tracking-[0.08em] text-fg-muted uppercase"
      >
        Dispositivo
      </h2>
      <EstadoConsulta
        consulta={instalacao}
        nome="o dispositivo"
        carregando={<Skeleton className="h-40 w-full" />}
      >
        {(dados) =>
          dados?.dispositivo ? (
            <ConteudoDispositivo dispositivo={dados.dispositivo} />
          ) : (
            <p className="text-[13px] text-fg-muted">{instalacao.precisaEscolher ? 'Selecione uma instalação para consultar o dispositivo.' : 'Nenhum dispositivo nesta instalação.'}</p>
          )
        }
      </EstadoConsulta>
    </Card>
  );
}

/** Renderiza o histórico de revisões como região "Histórico de revisões". */
export function CardRevisoes() {
  const revisoes = useRevisoes();
  const real = useRepositorio().cadastroReal;
  const idTitulo = useId();
  return (
    <Card as="section" aria-labelledby={idTitulo} className="flex flex-col gap-4">
      <header className="flex items-center justify-between gap-3">
        <h2 id={idTitulo} className="text-base leading-[22px] font-semibold text-fg">
          Histórico de revisões
        </h2>
        {revisoes.data && (
          <span className="font-mono text-xs text-fg-muted">{`${revisoes.data.length} registros`}</span>
        )}
      </header>
      {real && <p className="text-xs text-fg-muted">Demonstração: estas revisões não pertencem ao veículo real.</p>}
      <EstadoConsulta
        consulta={revisoes}
        nome="as revisões"
        carregando={<Skeleton className="h-40 w-full" />}
      >
        {(lista) =>
          lista.length ? (
            <ul className="flex flex-col gap-2">
              {lista.map((revisao) => {
                const badge = BADGE_REVISAO[revisao.status];
                return (
                  <li
                    key={revisao.id}
                    className="flex flex-col gap-2 rounded-control border border-line-subtle bg-inset p-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <Badge tone={badge.tom}>{badge.texto}</Badge>
                      <span className="font-mono text-xs text-fg-muted">
                        {formatarData(revisao.criadaEm.slice(0, 10))}
                      </span>
                    </div>
                    <p className="text-[13px] font-medium text-fg">{revisao.motivo}</p>
                    <p className="font-mono text-[11px] text-fg-muted">
                      {`Atualizada em ${formatarData(revisao.atualizadaEm.slice(0, 10))}`}
                    </p>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-[13px] text-fg-muted">Nenhuma revisão registrada.</p>
          )
        }
      </EstadoConsulta>
    </Card>
  );
}
