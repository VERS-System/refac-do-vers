/**
 * Seções da tela Configurações: perfil, unidades e exibição, alertas,
 * tarifa de energia, sessões e segurança, e sobre o VERS.
 *
 * As seções só desenham e editam o rascunho que a página guarda; quem salva
 * ou descarta é a página ("Salvar alterações" e "Descartar"). A exceção é
 * "Encerrar todas as sessões", uma ação imediata com confirmação.
 */

import { useId, useState, type ChangeEvent, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Bell,
  Info,
  KeyRound,
  ReceiptText,
  SlidersHorizontal,
  UserRound,
} from 'lucide-react';
import { VERSAO_APP } from '@/components/layout/Sidebar';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Toggle } from '@/components/ui/Toggle';
import type { IconComponent } from '@/components/ui/Button';
import type { Usuario } from '@/data/tipos';
import { useAcoesPerfil, useDispositivo } from '@/hooks/useDados';
import { ROTAS } from '@/routes/navegacao';
import type { Alerta, Unidades } from '@/stores/preferencias';

/** Tipos de foto aceitos e o tamanho máximo (2 MB). */
const TIPOS_FOTO = ['image/png', 'image/jpeg'];
const TAMANHO_MAXIMO_FOTO = 2 * 1024 * 1024;

/** Moldura comum das seções: card nomeado pelo título, com ícone e complemento à direita. */
export function Secao({
  id,
  titulo,
  icone: Icone,
  complemento,
  perigo = false,
  children,
}: {
  id: string;
  titulo: string;
  icone: IconComponent;
  complemento?: ReactNode;
  perigo?: boolean;
  children: ReactNode;
}) {
  const idTitulo = useId();
  return (
    <Card
      as="section"
      id={id}
      aria-labelledby={idTitulo}
      className={perigo ? 'scroll-mt-6 border-danger/40 bg-danger-subtle/40' : 'scroll-mt-6'}
    >
      <header className="mb-5 flex items-center justify-between gap-3">
        <h2
          id={idTitulo}
          className="flex items-center gap-2 text-base leading-[22px] font-semibold text-fg"
        >
          <Icone aria-hidden="true" size={18} className={perigo ? 'text-danger' : 'text-accent'} />
          {titulo}
        </h2>
        {complemento}
      </header>
      {children}
    </Card>
  );
}

export interface SecaoPerfilProps {
  usuario: Usuario;
  nome: string;
  foto: string | undefined;
  onNome: (nome: string) => void;
  onFoto: (foto: string) => void;
}

/**
 * Perfil: foto, nome (editáveis), e-mail e função (só leitura, como no
 * contrato `UserProfile`). A foto fica em memória como URL local.
 */
export function SecaoPerfil({ usuario, nome, foto, onNome, onFoto }: SecaoPerfilProps) {
  const idFoto = useId();
  const [erroFoto, setErroFoto] = useState<string | null>(null);

  /** Valida o tipo e o tamanho e cria a URL local da foto. */
  function escolherFoto(evento: ChangeEvent<HTMLInputElement>) {
    const arquivo = evento.target.files?.[0];
    evento.target.value = '';
    if (!arquivo) return;
    if (!TIPOS_FOTO.includes(arquivo.type) || arquivo.size > TAMANHO_MAXIMO_FOTO) {
      setErroFoto('Use PNG ou JPG de até 2 MB.');
      return;
    }
    setErroFoto(null);
    onFoto(URL.createObjectURL(arquivo));
  }

  return (
    <Secao
      id="perfil"
      titulo="Perfil"
      icone={UserRound}
      complemento={<span className="font-mono text-xs text-fg-muted">{`ID: ${usuario.id}`}</span>}
    >
      <div className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-6">
        <div className="flex flex-col items-center gap-2">
          <Avatar name={nome || usuario.nome} src={foto} size={64} />
          <label
            htmlFor={idFoto}
            className="cursor-pointer rounded-full border border-line px-3 py-1 text-xs text-fg hover:bg-hover"
          >
            Trocar foto
          </label>
          <input
            id={idFoto}
            type="file"
            accept="image/png,image/jpeg"
            className="sr-only"
            onChange={escolherFoto}
          />
          <span
            className={
              erroFoto
                ? 'max-w-32 text-center text-[11px] text-danger'
                : 'font-mono text-[11px] text-fg-muted'
            }
          >
            {erroFoto ?? 'PNG/JPG até 2 MB'}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Nome completo" value={nome} onChange={(e) => onNome(e.target.value)} />
          <div className="flex flex-col gap-1.5">
            <Input label="E-mail" value={usuario.email} readOnly />
            {usuario.emailVerificado && (
              <Badge tone="success" className="self-start">
                Verificado
              </Badge>
            )}
          </div>
          <Input label="Função" value={usuario.funcao} readOnly />
        </div>
      </div>
    </Secao>
  );
}

export interface SecaoUnidadesProps {
  unidades: Unidades;
  reduzirMovimento: boolean;
  onUnidades: (unidades: Unidades) => void;
  onReduzirMovimento: (reduzir: boolean) => void;
}

/** Uma grandeza com o seletor da unidade. */
function Grandeza({
  titulo,
  descricao,
  children,
}: {
  titulo: string;
  descricao: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex flex-col">
        <span className="text-sm font-medium text-fg">{titulo}</span>
        <span className="font-mono text-[11px] text-fg-muted">{descricao}</span>
      </div>
      {children}
    </div>
  );
}

/** Unidades de exibição e "reduzir movimento", que valem no app todo. */
export function SecaoUnidades({
  unidades,
  reduzirMovimento,
  onUnidades,
  onReduzirMovimento,
}: SecaoUnidadesProps) {
  return (
    <Secao
      id="unidades"
      titulo="Unidades e exibição"
      icone={SlidersHorizontal}
      complemento={<span className="text-xs text-fg-muted">Valem em todas as telas</span>}
    >
      <div className="grid grid-cols-2 gap-8">
        <div className="flex flex-col gap-4">
          <Grandeza titulo="Potência" descricao="Cards, gráficos e tabelas">
            <SegmentedControl
              aria-label="Potência"
              options={[
                { value: 'mW', label: 'mW' },
                { value: 'W', label: 'W' },
              ]}
              value={unidades.potencia}
              onChange={(potencia) => onUnidades({ ...unidades, potencia })}
            />
          </Grandeza>
          <Grandeza titulo="Energia" descricao="Recuperada, entregue e acumulada">
            <SegmentedControl
              aria-label="Energia"
              options={[
                { value: 'mWh', label: 'mWh' },
                { value: 'J', label: 'J' },
              ]}
              value={unidades.energia}
              onChange={(energia) => onUnidades({ ...unidades, energia })}
            />
          </Grandeza>
          <Grandeza titulo="Aceleração" descricao="Vibração RMS dos piezos">
            <SegmentedControl
              aria-label="Aceleração"
              options={[
                { value: 'm/s²', label: 'm/s²' },
                { value: 'g', label: 'g' },
              ]}
              value={unidades.aceleracao}
              onChange={(aceleracao) => onUnidades({ ...unidades, aceleracao })}
            />
          </Grandeza>
        </div>
        <div className="flex flex-col gap-4 border-l border-line-subtle pl-8">
          <Toggle
            label="Reduzir movimento"
            description="Desliga animações e transições (também segue a preferência do sistema)."
            checked={reduzirMovimento}
            onChange={onReduzirMovimento}
          />
          <p className="flex items-start gap-2 rounded-control border border-line-subtle bg-inset px-3 py-2.5 text-xs text-fg-muted">
            <Info aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
            Os dados são armazenados em mW, mWh e m/s². A conversão acontece só na exibição; o CSV
            exportado mantém essas unidades.
          </p>
        </div>
      </div>
    </Secao>
  );
}

/** "3 ativos · 1 inativo" com o plural certo. */
function contarAlertas(alertas: Alerta[]): string {
  const ativos = alertas.filter((a) => a.ativo).length;
  const inativos = alertas.length - ativos;
  return `${ativos} ${ativos === 1 ? 'ativo' : 'ativos'} · ${inativos} ${inativos === 1 ? 'inativo' : 'inativos'}`;
}

/** Alertas de telemetria e notificações, cada um com o seu interruptor. */
export function SecaoAlertas({
  alertas,
  onAlertas,
}: {
  alertas: Alerta[];
  onAlertas: (alertas: Alerta[]) => void;
}) {
  return (
    <Secao
      id="alertas"
      titulo="Alertas"
      icone={Bell}
      complemento={
        <span className="font-mono text-xs text-fg-muted">{contarAlertas(alertas)}</span>
      }
    >
      <ul className="grid grid-cols-2 gap-3">
        {alertas.map((alerta) => (
          <li
            key={alerta.id}
            className="flex flex-col gap-2 rounded-control border border-line-subtle bg-inset p-4"
          >
            <Badge tone="accent" dot={false} className="self-start font-mono">
              {alerta.limite}
            </Badge>
            <Toggle
              label={alerta.titulo}
              description={alerta.descricao}
              checked={alerta.ativo}
              onChange={(ativo) =>
                onAlertas(alertas.map((a) => (a.id === alerta.id ? { ...a, ativo } : a)))
              }
            />
          </li>
        ))}
      </ul>
    </Secao>
  );
}

/** Tarifa de energia em R$/kWh, que destrava a estimativa de economia. */
export function SecaoTarifa({
  tarifa,
  erro,
  onTarifa,
}: {
  tarifa: string;
  erro: string | undefined;
  onTarifa: (tarifa: string) => void;
}) {
  return (
    <Secao id="tarifa" titulo="Tarifa de energia" icone={ReceiptText}>
      <div className="max-w-sm">
        <Input
          label="Tarifa (R$/kWh)"
          inputMode="decimal"
          placeholder="0,95"
          value={tarifa}
          onChange={(e) => onTarifa(e.target.value)}
          error={erro}
          helper="Usada só para estimar a economia na tela Energia. Deixe vazio para não estimar."
        />
      </div>
    </Secao>
  );
}

/** Sessões e segurança: encerrar todas as sessões, com confirmação, e voltar ao Login. */
export function SecaoSessoes() {
  const navegar = useNavigate();
  const { encerrarSessoes } = useAcoesPerfil();
  const [confirmando, setConfirmando] = useState(false);

  /** Encerra as sessões e leva ao Login, que avisa o motivo. */
  async function encerrar() {
    await encerrarSessoes.mutateAsync();
    setConfirmando(false);
    navegar(ROTAS.login, { state: { aviso: 'sessoes-encerradas' } });
  }

  return (
    <Secao
      id="sessoes"
      titulo="Sessões e segurança"
      icone={KeyRound}
      perigo
      complemento={<Badge tone="danger">Ação irreversível</Badge>}
    >
      <div className="flex items-center justify-between gap-4">
        <p className="flex items-start gap-2 text-[13px] text-fg-secondary">
          <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-danger" />
          Ao encerrar todas as sessões, este computador e todos os outros terminais precisarão de
          novo login.
        </p>
        <Button variant="danger" onClick={() => setConfirmando(true)}>
          Encerrar todas as sessões
        </Button>
      </div>
      <Dialog
        aberto={confirmando}
        titulo="Encerrar todas as sessões?"
        descricao="Você sairá deste computador e de todos os outros terminais."
        onFechar={() => setConfirmando(false)}
      >
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirmando(false)}>
            Voltar
          </Button>
          <Button
            variant="danger"
            disabled={encerrarSessoes.isPending}
            onClick={() => void encerrar()}
          >
            Encerrar sessões
          </Button>
        </div>
      </Dialog>
    </Secao>
  );
}

/** Sobre o VERS: versão do app, firmware do ESP32 e a base de dados de exemplo. */
export function SecaoSobre() {
  const dispositivo = useDispositivo();
  return (
    <Secao id="sobre" titulo="Sobre o VERS" icone={Info}>
      <dl className="grid grid-cols-3 gap-3 font-mono text-xs">
        <div className="flex flex-col gap-1 rounded-control border border-line-subtle bg-inset px-3 py-2.5">
          <dt className="text-fg-muted">Versão do app</dt>
          <dd className="text-fg">{VERSAO_APP}</dd>
        </div>
        <div className="flex flex-col gap-1 rounded-control border border-line-subtle bg-inset px-3 py-2.5">
          <dt className="text-fg-muted">Firmware do ESP32</dt>
          <dd className="text-fg">{dispositivo.data?.firmware ?? '–'}</dd>
        </div>
        <div className="flex flex-col gap-1 rounded-control border border-line-subtle bg-inset px-3 py-2.5">
          <dt className="text-fg-muted">Dados</dt>
          <dd className="text-fg">Exemplo · 28/09 a 05/10/2026</dd>
        </div>
      </dl>
      <p className="mt-4 text-xs text-fg-muted">
        Projeto de TCC · Vibration Energy Recovery System
      </p>
    </Secao>
  );
}
