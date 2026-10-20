/**
 * Shell das telas internas: sidebar fixa à esquerda e a tela atual à direita.
 *
 * Usado como rota de layout no `App`: a tela de cada rota filha aparece no
 * `Outlet`. Usuário e dispositivo vêm dos hooks de dados (hoje, o
 * repositório de exemplo). Também aplica as unidades de exibição, que valem
 * nas telas internas; o "reduzir movimento" é aplicado na raiz do app. O
 * primeiro Tab mostra "Pular para o conteúdo", que leva o foco à tela.
 */

import { Suspense, useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import { Menu } from 'lucide-react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { BuscaGlobal } from '@/components/busca/BuscaGlobal';
import { Notificacoes } from '@/components/notificacoes/Notificacoes';
import { useDispositivo, useUsuarioAtual } from '@/hooks/useDados';
import { ROTAS } from '@/routes/navegacao';
import { usePreferencias } from '@/stores/preferencias';
import { Dialog } from '@/components/ui/Dialog';
import { IconButton } from '@/components/ui/IconButton';
import { AcoesGlobaisProvider, InicioBarraProvider } from './AcoesGlobais';
import { CarregandoTela } from './CarregandoTela';
import { Sidebar } from './Sidebar';
import { useRepositorio } from '@/data/repositorio';

/** Ações da barra superior em todas as telas internas (Fase 5). */
const ACOES_GLOBAIS = (
  <>
    <BuscaGlobal />
    <Notificacoes />
  </>
);

/**
 * Renderiza a sidebar e a área principal da tela.
 *
 * Sair só volta para o Login: ainda não existe sessão real para encerrar.
 * A tela é remontada quando as unidades mudam (a chave do `main` muda), para
 * que todos os valores sejam formatados de novo na unidade escolhida.
 *
 * App responsivo: a sidebar fica fixa a partir de 1024 px; abaixo disso, o
 * botão "Abrir menu" da barra superior abre a mesma sidebar num painel
 * lateral, que fecha sozinho ao trocar de tela.
 */
export function AppShell({ aoSair, demonstracao = false }: { aoSair?: () => Promise<void>; demonstracao?: boolean }) {
  const { ensaiosReais } = useRepositorio();
  const navegar = useNavigate();
  const local = useLocation();
  const { data: usuario } = useUsuarioAtual();
  const consultaDispositivo = useDispositivo();
  const dispositivo = consultaDispositivo.data;
  const unidades = usePreferencias((estado) => estado.unidades);
  const [menuAberto, setMenuAberto] = useState(false);
  const [erroSaida, setErroSaida] = useState<string | null>(null);
  const [saindo, setSaindo] = useState(false);

  // Escolher uma tela no menu lateral fecha o menu.
  useEffect(() => {
    setMenuAberto(false);
  }, [local.pathname]);

  const botaoMenu = useMemo(
    () => (
      <IconButton
        icon={Menu}
        label="Abrir menu"
        className="lg:hidden"
        onClick={() => setMenuAberto(true)}
      />
    ),
    [],
  );
  /** Aguarda revogação real; falha mantém a conta e informa que a saída não foi confirmada. */
  async function sair() {
    if (!aoSair) { navegar(ROTAS.login); return; }
    if (saindo) return;
    setSaindo(true); setErroSaida(null);
    try {
      await aoSair();
      navegar(ROTAS.login);
    } catch {
      setErroSaida('Não foi possível confirmar a saída. Tente de novo.');
    } finally { setSaindo(false); }
  }

  const conteudo = useRef<HTMLElement>(null);

  /**
   * "Pular para o conteúdo": leva o foco para a tela sem passar pela sidebar.
   * Não segue o `href`, porque no HashRouter mudar o hash trocaria a rota.
   */
  function pularParaConteudo(evento: MouseEvent<HTMLAnchorElement>) {
    evento.preventDefault();
    conteudo.current?.focus();
  }

  return (
    // h-dvh: no celular, 100vh conta a barra de endereço escondida e cortava o fim da tela.
    <div className="flex h-dvh overflow-hidden bg-canvas">
      <a
        href="#conteudo"
        onClick={pularParaConteudo}
        className="sr-only z-50 rounded-full bg-accent px-4 py-2 text-sm font-medium text-fg-on-accent focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Pular para o conteúdo
      </a>
      <Sidebar
        usuario={usuario}
        dispositivo={dispositivo ?? undefined}
        onSair={() => void sair()}
        className="hidden lg:flex"
      />
      <Dialog
        aberto={menuAberto}
        titulo="Menu"
        variante="lateral"
        onFechar={() => setMenuAberto(false)}
      >
        <Sidebar usuario={usuario} dispositivo={dispositivo ?? undefined} onSair={() => void sair()} />
      </Dialog>
      <main
        id="conteudo"
        ref={conteudo}
        tabIndex={-1}
        key={`${unidades.potencia}-${unidades.energia}-${unidades.aceleracao}`}
        className="flex min-w-0 flex-1 flex-col outline-none"
      >
        {demonstracao && <p role="status" className="border-b border-line px-4 py-2 text-xs text-fg-secondary">{ensaiosReais
          ? 'Autenticação e cadastro reais · testes, resumos por teste e telemetria reais. Painéis gerais de energia, bateria, revisões e Viber em demonstração, sem vínculo com o veículo real.'
          : 'Autenticação e cadastro reais · medições, testes, revisões e Viber em demonstração, sem vínculo com o veículo real.'}</p>}
        {demonstracao && !consultaDispositivo.isError && dispositivo === null && <p className="px-4 py-2 text-xs text-fg-muted">Nenhum dispositivo selecionado.</p>}
        {demonstracao && consultaDispositivo.isError && <p role="alert" className="px-4 py-2 text-xs text-danger">Não foi possível consultar o dispositivo.</p>}
        {saindo && <p role="status" className="px-4 py-2 text-sm">Encerrando sessão…</p>}
        {erroSaida && <p role="alert" className="px-4 py-2 text-sm text-danger">{erroSaida}</p>}
        <InicioBarraProvider value={botaoMenu}>
          <AcoesGlobaisProvider value={ACOES_GLOBAIS}>
            {/* A tela chega sob demanda; enquanto isso, só o conteúdo mostra o esqueleto. */}
            <Suspense fallback={<CarregandoTela />}>
              {/* Remontado a cada rota, para a tela nova entrar com a transição curta. */}
              <div key={local.pathname} className="entrada-tela flex min-h-0 flex-1 flex-col">
                <Outlet />
              </div>
            </Suspense>
          </AcoesGlobaisProvider>
        </InicioBarraProvider>
      </main>
    </div>
  );
}
