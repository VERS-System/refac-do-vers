/**
 * Sidebar do app desktop do VERS (248 px, como no DESIGN.md).
 *
 * De cima para baixo: logo oficial com a versão, navegação principal, card de
 * status do ESP32 e linha do usuário com o botão de sair.
 */

import { useId, useLayoutEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { IconButton } from '@/components/ui/IconButton';
import { NavItem } from '@/components/ui/NavItem';
import { VersLogo } from '@/components/ui/VersLogo';
import type { DispositivoResumo, Usuario } from '@/data/tipos';
import { cn } from '@/lib/cn';
import { NAVEGACAO_PRINCIPAL } from '@/routes/navegacao';

/** Versão do app exibida ao lado do logo. */
export const VERSAO_APP = 'v0.4';

export interface SidebarProps {
  /** Usuário logado; ausente enquanto carrega. */
  usuario?: Usuario;
  /** Dispositivo de coleta; ausente enquanto carrega. */
  dispositivo?: DispositivoResumo;
  onSair: () => void;
  className?: string;
}

/**
 * Card de status do dispositivo de coleta.
 *
 * É uma região nomeada pelo nome do dispositivo. O ponto verde ao lado do
 * nome é decorativo; o status também aparece em texto no badge.
 */
function CardDispositivo({ dispositivo }: { dispositivo: DispositivoResumo }) {
  const idNome = useId();
  return (
    <section
      aria-labelledby={idNome}
      className="flex flex-col gap-2 rounded-control border border-line-subtle bg-inset p-3"
    >
      <div className="flex items-center gap-2">
        <span
          aria-hidden="true"
          className={cn(
            'size-2 shrink-0 rounded-full',
            dispositivo.online ? 'ponto-vivo bg-success' : 'bg-fg-muted',
          )}
        />
        <h2 id={idNome} className="min-w-0 flex-1 truncate font-mono text-xs font-semibold text-fg">
          {dispositivo.nome}
        </h2>
        <Badge
          tone={dispositivo.online ? 'success' : 'neutral'}
          dot={false}
          className="h-5 px-2 text-[11px]"
        >
          {dispositivo.online ? 'Online' : 'Offline'}
        </Badge>
      </div>
      <div className="flex items-end justify-between gap-2 font-mono text-[11px] leading-4 text-fg-muted">
        <span>
          Firmware {dispositivo.firmware} · visto {dispositivo.vistoHa}
        </span>
        <span className="shrink-0 font-semibold text-accent">{dispositivo.protocolo}</span>
      </div>
    </section>
  );
}

/** Espaço reservado do card do dispositivo enquanto os dados não chegam. */
function CardDispositivoCarregando() {
  return (
    <div
      aria-busy="true"
      className="flex h-[74px] items-center rounded-control border border-line-subtle bg-inset p-3 font-mono text-[11px] text-fg-muted"
    >
      Conectando ao dispositivo…
    </div>
  );
}

/** Posição do destaque do item ativo, medida do próprio item. */
interface Destaque {
  alvo: string;
  topo: number;
  altura: number;
}

/**
 * Navegação com o destaque deslizante (Fase 5): um único fundo dourado que
 * desliza até o item da rota atual. A primeira posição entra sem transição,
 * para o destaque não "voar" do topo ao abrir o app.
 */
function NavegacaoPrincipal() {
  const local = useLocation();
  const nav = useRef<HTMLElement>(null);
  const [destaque, setDestaque] = useState<Destaque | null>(null);
  const posicionado = useRef(false);

  useLayoutEffect(() => {
    const ativo = nav.current?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!ativo) {
      setDestaque(null);
      return;
    }
    setDestaque({
      alvo: ativo.getAttribute('href')?.replace(/^#/, '') ?? local.pathname,
      topo: ativo.offsetTop,
      altura: ativo.offsetHeight,
    });
  }, [local.pathname]);

  useLayoutEffect(() => {
    if (destaque) posicionado.current = true;
  }, [destaque]);

  return (
    <nav ref={nav} aria-label="Navegação principal" className="relative mt-8 flex flex-col gap-1">
      {destaque && (
        <span
          data-slot="indicador-nav"
          data-alvo={destaque.alvo}
          aria-hidden="true"
          style={{ transform: `translateY(${destaque.topo}px)`, height: destaque.altura }}
          className={cn(
            'absolute top-0 right-0 left-0 rounded-control border border-accent-border bg-accent-subtle',
            posicionado.current &&
              'transition-[transform,height] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]',
          )}
        />
      )}
      {NAVEGACAO_PRINCIPAL.map((item) => (
        <NavItem key={item.path} to={item.path} label={item.label} icon={item.icon} />
      ))}
    </nav>
  );
}

/**
 * Renderiza a sidebar completa; a navegação usa a lista de `routes/navegacao`.
 *
 * Navegação e botão Sair funcionam desde o primeiro quadro; o card do
 * dispositivo e a linha do usuário mostram espaços reservados até os dados
 * chegarem, sem deslocar o layout.
 */
export function Sidebar({ usuario, dispositivo, onSair, className }: SidebarProps) {
  return (
    <aside
      className={cn(
        'flex h-full w-[248px] shrink-0 flex-col overflow-y-auto border-r border-line-subtle bg-sidebar px-4 pt-6 pb-4',
        className,
      )}
    >
      <VersLogo version={VERSAO_APP} className="px-2" />
      <NavegacaoPrincipal />
      <div className="mt-auto flex flex-col gap-4">
        {dispositivo ? (
          <CardDispositivo dispositivo={dispositivo} />
        ) : (
          <CardDispositivoCarregando />
        )}
        <div className="flex items-center gap-3 border-t border-line-subtle px-1 pt-4">
          {usuario ? (
            <>
              <Avatar name={usuario.nome} src={usuario.foto} />
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm font-medium text-fg">{usuario.nome}</span>
                <span className="truncate text-xs text-fg-muted">{usuario.funcao}</span>
              </div>
            </>
          ) : (
            <div aria-hidden="true" className="flex flex-1 items-center gap-3">
              <span className="size-9 rounded-full bg-surface-raised" />
              <span className="h-3 w-24 rounded-full bg-surface-raised" />
            </div>
          )}
          <IconButton icon={LogOut} label="Sair" onClick={onSair} className="border-transparent" />
        </div>
      </div>
    </aside>
  );
}
